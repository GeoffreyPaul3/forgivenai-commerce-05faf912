import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  // Verify cron secret to prevent unauthorized access
  const authHeader = req.headers.get('Authorization');
  if (authHeader !== `Bearer ${Deno.env.get('CRON_SECRET')}`) {
    // Note: You can also use pg_net and verify via API gateway
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Fetch all pending tracking orders
    // We only poll orders that are not Delivered, Cancelled, Returned, or Failed
    const { data: activeOrders, error } = await supabaseClient
      .from('delivery_orders')
      .select('id, tracking_number, parcel_status, courier_providers(code)')
      .not('parcel_status', 'in', '("Delivered", "Cancelled", "Returned", "Failed")')
      .not('tracking_number', 'is', null)
      .limit(100);

    if (error) throw error;

    let updatedCount = 0;

    // 2. Poll providers
    for (const order of activeOrders || []) {
      const providerCode = order.courier_providers?.code;
      if (!providerCode || !order.tracking_number) continue;

      try {
        // Track shipment via logistics-orchestrator (Thin Client pattern from backend to backend)
        const { data: trackRes, error: trackErr } = await supabaseClient.functions.invoke('logistics-orchestrator', {
          body: { action: 'track-shipment', trackingNumber: order.tracking_number, providerPreference: providerCode }
        });

        if (trackErr) throw trackErr;

        if (trackRes?.status && trackRes.status !== order.parcel_status) {
          // 3. Status changed, update delivery_orders and insert event
          await supabaseClient
            .from('delivery_orders')
            .update({ parcel_status: trackRes.status })
            .eq('id', order.id);

          await supabaseClient
            .from('delivery_tracking_events')
            .insert({
              delivery_order_id: order.id,
              status: trackRes.status,
              description: `Automated sync: Status changed to ${trackRes.status}`,
            });

          // 4. Update the main orders table if needed
          if (trackRes.status === 'Delivered') {
            await supabaseClient.from('orders').update({ status: 'delivered' }).eq('id', order.order_id);
          } else if (trackRes.status === 'In Transit') {
            await supabaseClient.from('orders').update({ status: 'shipped' }).eq('id', order.order_id);
          }

          updatedCount++;
        }
      } catch (err) {
        console.error(`Failed to sync tracking for ${order.tracking_number}:`, err);
        // Do not break the loop; continue with other orders
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: `Synced tracking statuses. Updated ${updatedCount} orders.` }),
      { headers: { 'Content-Type': 'application/json' } },
    )
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { 'Content-Type': 'application/json' }, status: 400 },
    )
  }
})
