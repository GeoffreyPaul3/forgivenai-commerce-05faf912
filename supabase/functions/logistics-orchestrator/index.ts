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

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    // Authorization
    const authHeader = req.headers.get('Authorization')!
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''))

    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    const { action, payload, providerPreference } = await req.json()

    // Thin Client router logic for logistics-orchestrator
    let result;

    if (action === 'calculate-quote') {
      // 1. Fetch active providers & rules from DB
      // Mocking fetch from DB for now:
      const activeProviders = ['SMART_DELIVERIES', 'IMPALA_COURIER'];

      let bestProvider = 'SMART_DELIVERIES';
      let bestQuote: any = null;
      let highestScore = 0;

      // Smart Deliveries is calculated locally because they don't provide a pricing API
      let smartDeliveriesFee = 2500;
      if (payload?.deliveryType === 'door_to_door') {
        smartDeliveriesFee += 1500;
      }
      const smartQuote = { amount: smartDeliveriesFee, currency: 'MWK', estimatedDays: 1, available: true };
      const smartScore = 90; // Configured baseline score

      // Impala can be queried dynamically
      let impalaQuote = null;
      let impalaScore = 0;
      try {
        const { data: impalaRes, error } = await supabaseClient.functions.invoke('impala-provider', {
          body: { action: 'calculate-pricing', payload }
        });
        if (!error && impalaRes?.amount) {
           impalaQuote = impalaRes;
           impalaScore = 95; // Configured baseline score
        }
      } catch(e) {
         console.warn("Failed to get Impala quote:", e);
      }

      // Decision Engine Logic
      if (providerPreference === 'AUTO') {
        if (impalaQuote && impalaScore > smartScore) {
          bestProvider = 'IMPALA_COURIER';
          highestScore = impalaScore;
          bestQuote = impalaQuote;
        } else {
          bestProvider = 'SMART_DELIVERIES';
          highestScore = smartScore;
          bestQuote = smartQuote;
        }
      } else {
        // Direct routing
        bestProvider = providerPreference;
        if (providerPreference === 'IMPALA_COURIER' && impalaQuote) {
           bestQuote = impalaQuote;
        } else {
           bestQuote = smartQuote; // Fallback or direct to Smart
        }
        highestScore = 100;
      }

      result = {
        selectedProviderCode: bestProvider,
        providerName: bestProvider.replace('_', ' '),
        quote: bestQuote,
        score: highestScore,
      };
    } 
    else if (action === 'create-shipment') {
      // 1. Acquire Distributed Lock using Postgres advisory locks via RPC (placeholder)
      // await supabaseClient.rpc('acquire_lock', { lock_key: payload.orderId });

      // 2. Determine provider
      const provider = payload.provider || 'SMART_DELIVERIES';
      
      // 3. Delegate to specific provider function
      // In real code: supabaseClient.functions.invoke(`${provider.toLowerCase()}-provider`, ...)
      
      result = {
        trackingNumber: `${provider.substring(0, 3)}-${Math.floor(Math.random() * 100000)}`,
        status: 'Shipment Created',
        providerId: provider
      };

      // 4. Record to `delivery_orders` and release lock
      // ...
    }
    else {
      throw new Error(`Unsupported orchestration action: ${action}`);
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
    )
  }
})
