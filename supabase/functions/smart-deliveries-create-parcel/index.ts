import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );
    
    // Also init service role client for privileged operations (audit logs, etc.)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { deliveryOrderId } = await req.json();
    if (!deliveryOrderId) throw new Error("Missing deliveryOrderId");

    // Get delivery order details
    const { data: deliveryOrder, error: deliveryError } = await supabaseAdmin
      .from('delivery_orders')
      .select('*, orders(items)')
      .eq('id', deliveryOrderId)
      .single();

    if (deliveryError || !deliveryOrder) throw new Error("Delivery order not found");
    if (deliveryOrder.smart_delivery_uuid) throw new Error("Parcel already created");

    // Build Payload
    const items = typeof deliveryOrder.orders.items === 'string' ? JSON.parse(deliveryOrder.orders.items) : deliveryOrder.orders.items;
    
    // Convert items to Smart Deliveries packages
    const packages = items.map((item: any) => {
      let images = item.images || [];
      const defaultImg = "https://via.placeholder.com/300";
      if (images.length === 0) images = [defaultImg, defaultImg, defaultImg];
      else if (images.length === 1) images = [images[0], images[0], images[0]];
      else if (images.length === 2) images = [images[0], images[1], images[1]];
      else if (images.length > 3) images = images.slice(0, 3);
      
      return {
        name: item.name,
        qty: item.quantity || 1,
        valuedAt: Number(item.price) || 0,
        pictures: images
      };
    });

    const payload = {
      receiverName: deliveryOrder.receiver_name,
      receiverPhone: deliveryOrder.receiver_phone,
      receiverLocation: deliveryOrder.receiver_city,
      receiverLocationDescription: deliveryOrder.receiver_address || "None",
      deliveryType: deliveryOrder.delivery_type,
      packages
    };

    // Log request
    await supabaseAdmin.from('delivery_audit_logs').insert({
      event_type: 'API_REQUEST',
      reference_id: deliveryOrderId,
      payload
    });

    const SMART_DELIVERIES_BASE_URL = Deno.env.get('SMART_DELIVERIES_BASE_URL') || "https://test.smartdeliveriesmw.com/mzadigito/api/integration/v1/connector";
    const SMART_DELIVERIES_API_KEY = Deno.env.get('SMART_DELIVERIES_API_KEY');

    if (!SMART_DELIVERIES_API_KEY) {
      throw new Error("Missing SMART_DELIVERIES_API_KEY");
    }

    // Call Smart Deliveries API
    const response = await fetch(`${SMART_DELIVERIES_BASE_URL}/parcel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': SMART_DELIVERIES_API_KEY
      },
      body: JSON.stringify(payload)
    });

    const rawResponseText = await response.text();
    let responseData;
    try {
      responseData = JSON.parse(rawResponseText);
    } catch {
      responseData = { raw: rawResponseText };
    }

    // Log response
    await supabaseAdmin.from('delivery_audit_logs').insert({
      event_type: 'API_RESPONSE',
      reference_id: deliveryOrderId,
      payload: responseData
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} - ${JSON.stringify(responseData)}`);
    }

    // Expecting response to contain parcel UUID and waybill
    const waybill = responseData.waybill || responseData.data?.waybill || responseData.waybillNumber || "WB-UNKNOWN";
    const uuid = responseData.uuid || responseData.data?.uuid || responseData.id || "UUID-UNKNOWN";

    await supabaseAdmin.from('delivery_orders').update({
      smart_delivery_uuid: uuid,
      waybill_number: waybill,
      parcel_status: 'parcel_created',
      courier_request: payload,
      courier_response: responseData
    }).eq('id', deliveryOrderId);

    // Update main order
    await supabaseAdmin.from('orders').update({
      status: 'parcel_created'
    }).eq('id', deliveryOrder.order_id);

    return new Response(JSON.stringify({ success: true, uuid, waybill }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
