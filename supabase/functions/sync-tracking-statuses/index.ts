import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Accept the cron secret (scheduled job) OR any authenticated Supabase user session (manual dashboard trigger)
  const authHeader = req.headers.get('Authorization')
  const token = authHeader?.replace('Bearer ', '') ?? ''
  const cronSecret = Deno.env.get('CRON_SECRET')

  if (cronSecret && token !== cronSecret) {
    // Validate as a Supabase user session
    const checkClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )
    const { data: { user } } = await checkClient.auth.getUser(token)
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Fetch all active delivery orders that have a tracking number
    // Fixed: use array syntax for .not().in() — escaped quotes in string break PostgREST
    const { data: activeOrders, error } = await supabaseClient
      .from('delivery_orders')
      .select('id, order_id, tracking_number, parcel_status, courier_providers(code)')
      .not('tracking_number', 'is', null)
      .not('parcel_status', 'in', '(Delivered,Cancelled,Returned,Failed)')
      .limit(100)

    if (error) throw error

    let updatedCount = 0

    // 2. Poll each provider for tracking updates
    for (const order of activeOrders || []) {
      const providerCode = (order.courier_providers as any)?.code
      if (!providerCode || !order.tracking_number) continue

      try {
        // Delegate to impala-provider or smart-deliveries-provider via orchestrator
        const { data: trackRes, error: trackErr } = await supabaseClient.functions.invoke('impala-provider', {
          body: { action: 'track-shipment', payload: { trackingNumber: order.tracking_number } }
        })

        if (trackErr) throw trackErr

        const newStatus = trackRes?.status
        if (newStatus && newStatus !== order.parcel_status) {
          await supabaseClient
            .from('delivery_orders')
            .update({ parcel_status: newStatus })
            .eq('id', order.id)

          await supabaseClient
            .from('delivery_tracking_events')
            .insert({
              delivery_order_id: order.id,
              status: newStatus,
              description: `Automated sync: Status changed to ${newStatus}`,
            })

          if (newStatus === 'Delivered') {
            await supabaseClient.from('orders').update({ status: 'delivered' }).eq('id', order.order_id)
          } else if (newStatus === 'In Transit') {
            await supabaseClient.from('orders').update({ status: 'shipped' }).eq('id', order.order_id)
          }

          updatedCount++
        }
      } catch (err: any) {
        console.error(`Failed to sync tracking for ${order.tracking_number}:`, err?.message || err)
        // Continue with remaining orders — don't break the loop
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: `Synced tracking statuses. Updated ${updatedCount} orders.` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('sync-tracking-statuses fatal error:', error?.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
