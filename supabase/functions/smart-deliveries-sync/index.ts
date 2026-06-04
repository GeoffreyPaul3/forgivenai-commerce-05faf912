import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Scheduled function to sync parcel statuses
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const SMART_DELIVERIES_BASE_URL = Deno.env.get('SMART_DELIVERIES_BASE_URL') || "https://test.smartdeliveriesmw.com/mzadigito/api/integration/v1/connector";
    const SMART_DELIVERIES_API_KEY = Deno.env.get('SMART_DELIVERIES_API_KEY');

    if (!SMART_DELIVERIES_API_KEY) {
      throw new Error("Missing SMART_DELIVERIES_API_KEY");
    }

    // Get all delivery_orders that have a waybill but aren't delivered or returned yet
    const { data: activeDeliveries, error: fetchError } = await supabaseAdmin
      .from('delivery_orders')
      .select('id, waybill_number, parcel_status, order_id')
      .not('waybill_number', 'is', null)
      .neq('parcel_status', 'delivered')
      .neq('parcel_status', 'returned');

    if (fetchError) {
      console.error("fetchError:", fetchError);
      throw fetchError;
    }
    if (!activeDeliveries || activeDeliveries.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "No active deliveries to sync" }), { headers: corsHeaders });
    }

    const updates = [];

    for (const delivery of activeDeliveries) {
      try {
        const response = await fetch(`${SMART_DELIVERIES_BASE_URL}/parcel/${delivery.waybill_number}`, {
          headers: {
            'api-key': SMART_DELIVERIES_API_KEY
          }
        });
        
        if (!response.ok) continue;

        const data = await response.json();
        const currentStatus = data.status || data.data?.status || null;
        
        if (currentStatus && currentStatus !== delivery.parcel_status) {
          // Log tracking event
          await supabaseAdmin.from('delivery_tracking_events').insert({
            delivery_order_id: delivery.id,
            status_code: currentStatus,
            status_name: currentStatus,
            raw_payload: data
          });

          // Update delivery order status
          await supabaseAdmin.from('delivery_orders').update({
            parcel_status: currentStatus,
            updated_at: new Date().toISOString()
          }).eq('id', delivery.id);

          // Optionally update main order status based on mapping
          let mainOrderStatus = null;
          if (currentStatus === 'DELIVERED') mainOrderStatus = 'delivered';
          else if (currentStatus === 'IN_TRANSIT') mainOrderStatus = 'in_transit';
          else if (currentStatus === 'RETURNED') mainOrderStatus = 'returned';

          if (mainOrderStatus) {
            await supabaseAdmin.from('orders').update({
              status: mainOrderStatus
            }).eq('id', delivery.order_id);
          }

          updates.push(delivery.waybill_number);
        }
      } catch (err) {
        console.error(`Error syncing waybill ${delivery.waybill_number}:`, err);
      }
    }

    return new Response(JSON.stringify({ success: true, synced: updates.length, waybills: updates }), {
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
