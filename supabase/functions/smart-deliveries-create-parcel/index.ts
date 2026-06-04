import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Fetch a remote image URL and return a base64 data URL string.
 * Smart Deliveries requires exactly 3 base64 or data URL strings.
 */
async function toBase64DataUrl(url: string): Promise<string> {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
    const contentType = res.headers.get('content-type') || 'image/jpeg';
    const buffer = await res.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);
    return `data:${contentType};base64,${base64}`;
  } catch (e) {
    console.error(`Image conversion failed for ${url}:`, e);
    // Return a 1x1 white pixel as a safe fallback
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI6QAAAABJRU5ErkJggg==';
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Use service role for all DB operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { deliveryOrderId } = await req.json();
    if (!deliveryOrderId) throw new Error("Missing deliveryOrderId");

    // Get delivery order + order items + product images
    const { data: deliveryOrder, error: deliveryError } = await supabaseAdmin
      .from('delivery_orders')
      .select('*, orders(items, id)')
      .eq('id', deliveryOrderId)
      .single();

    if (deliveryError || !deliveryOrder) throw new Error(`Delivery order not found: ${deliveryError?.message}`);
    if (deliveryOrder.smart_delivery_uuid) throw new Error("Parcel already created");

    const items = typeof deliveryOrder.orders.items === 'string'
      ? JSON.parse(deliveryOrder.orders.items)
      : deliveryOrder.orders.items;

    // Fetch product images from the products table so we have real images
    const productIds = items.map((i: any) => i.product_id).filter(Boolean);
    let productImagesMap: Record<string, string[]> = {};

    if (productIds.length > 0) {
      const { data: products } = await supabaseAdmin
        .from('products')
        .select('id, images')
        .in('id', productIds);

      products?.forEach((p: any) => {
        productImagesMap[p.id] = p.images || [];
      });
    }

    // Build packages — convert all images to base64 data URLs as required by Smart Deliveries
    const packages = await Promise.all(items.map(async (item: any) => {
      let imageUrls: string[] = productImagesMap[item.product_id] || item.images || [];

      // Pad/trim to exactly 3 images
      while (imageUrls.length < 3) imageUrls.push(imageUrls[0] || '');
      imageUrls = imageUrls.slice(0, 3);

      // Convert all to base64 data URLs (required by Smart Deliveries API)
      const pictures = await Promise.all(imageUrls.map((url: string) => toBase64DataUrl(url)));

      return {
        name: item.name,
        qty: item.quantity || 1,
        valuedAt: Number(item.price) || 0,
        pictures
      };
    }));

    // Format phone: must be +265 followed by exactly 9 digits
    let formattedPhone = deliveryOrder.receiver_phone.replace(/\D/g, '');
    if (formattedPhone.startsWith('265')) formattedPhone = '+' + formattedPhone;
    else if (formattedPhone.startsWith('0')) formattedPhone = '+265' + formattedPhone.substring(1);
    else formattedPhone = '+265' + formattedPhone;

    // Format location: must be one of: Blantyre, Lilongwe, Limbe, Mzuzu, Zomba
    const validLocations = ['Blantyre', 'Lilongwe', 'Limbe', 'Mzuzu', 'Zomba'];
    let formattedLocation = deliveryOrder.receiver_city || 'Lilongwe';
    formattedLocation = formattedLocation.charAt(0).toUpperCase() + formattedLocation.slice(1).toLowerCase();
    if (!validLocations.includes(formattedLocation)) {
      console.warn(`Location "${formattedLocation}" not in Smart Deliveries list, defaulting to Lilongwe`);
      formattedLocation = 'Lilongwe';
    }

    // deliveryType must be camelCase: doorToDoor or officeCollection
    const deliveryType = deliveryOrder.delivery_type === 'door_to_door' || deliveryOrder.delivery_type === 'doorToDoor'
      ? 'doorToDoor'
      : 'officeCollection';

    const payload = {
      receiverName: deliveryOrder.receiver_name,
      receiverPhone: formattedPhone,
      receiverLocation: formattedLocation,
      receiverLocationDescription: deliveryType === 'doorToDoor' ? (deliveryOrder.receiver_address || 'Please call on arrival') : undefined,
      deliveryType,
      paymentMethod: 'airtelMoney',
      packages
    };

    // Remove undefined fields (receiverLocationDescription only for doorToDoor)
    if (payload.receiverLocationDescription === undefined) {
      delete payload.receiverLocationDescription;
    }

    console.log("📦 Smart Deliveries Payload:", JSON.stringify({
      ...payload,
      packages: payload.packages.map(p => ({ ...p, pictures: [`[base64 - ${p.pictures[0]?.length || 0} chars]`, '...'] }))
    }));

    // Log request (without base64 blobs to keep logs clean)
    await supabaseAdmin.from('delivery_audit_logs').insert({
      event_type: 'API_REQUEST',
      reference_id: deliveryOrderId,
      payload: { ...payload, packages: payload.packages.map(p => ({ ...p, pictures: ['[base64]', '[base64]', '[base64]'] })) }
    });

    const SMART_DELIVERIES_BASE_URL = Deno.env.get('SMART_DELIVERIES_BASE_URL') || 'https://test.smartdeliveriesmw.com/mzadigito/api/integration/v1/connector';
    const SMART_DELIVERIES_API_KEY = Deno.env.get('SMART_DELIVERIES_API_KEY');

    if (!SMART_DELIVERIES_API_KEY) {
      throw new Error("Missing SMART_DELIVERIES_API_KEY in Supabase secrets");
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
    let responseData: any;
    try {
      responseData = JSON.parse(rawResponseText);
    } catch {
      responseData = { raw: rawResponseText };
    }

    console.log(`📬 Smart Deliveries Response [${response.status}]:`, JSON.stringify(responseData));

    // Log response
    await supabaseAdmin.from('delivery_audit_logs').insert({
      event_type: 'API_RESPONSE',
      reference_id: deliveryOrderId,
      payload: responseData
    });

    if (!response.ok) {
      const errMsg = responseData?.message || responseData?.error || responseData?.raw || JSON.stringify(responseData);
      throw new Error(`Smart Deliveries API Error [${response.status}]: ${errMsg}`);
    }

    // Log the FULL raw response so we can see every field in Supabase function logs
    console.log("📬 FULL Smart Deliveries Response:", rawResponseText);
    console.log("📬 Parsed keys:", Object.keys(responseData));
    if (responseData.data) console.log("📬 data keys:", Object.keys(responseData.data));

    // Per Smart Deliveries PDF spec:
    // POST /parcel 201 response: {"success":true,"data":{...},"message":"Created successfully"}
    // UUID field: responseData.data.id
    // Waybill field: responseData.data.waybillNumberShort
    const parcelData = responseData.data || {};
    const waybill = parcelData.waybillNumberShort || parcelData.waybill || parcelData.waybillNumber || null;
    const uuid = parcelData.id || parcelData.uuid || null;

    console.log(`📬 Extracted → waybill: ${waybill}, uuid: ${uuid}`);

    await supabaseAdmin.from('delivery_orders').update({
      smart_delivery_uuid: uuid,
      waybill_number: waybill,
      parcel_status: 'parcel_created',
      courier_request: { ...payload, packages: payload.packages.map(p => ({ ...p, pictures: ['[base64]', '[base64]', '[base64]'] })) },
      courier_response: responseData
    }).eq('id', deliveryOrderId);

    // Update main order status
    await supabaseAdmin.from('orders').update({
      status: 'parcel_created'
    }).eq('id', deliveryOrder.orders.id || deliveryOrder.order_id);

    return new Response(JSON.stringify({ success: true, uuid, waybill }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error("smart-deliveries-create-parcel ERROR:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
