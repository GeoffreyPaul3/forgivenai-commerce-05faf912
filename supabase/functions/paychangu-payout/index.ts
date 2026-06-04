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
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { deliveryOrderId } = await req.json();
    if (!deliveryOrderId) throw new Error("Missing deliveryOrderId");

    // Fetch delivery order
    const { data: deliveryOrder, error: deliveryError } = await supabaseAdmin
      .from('delivery_orders')
      .select('*, courier_providers(code)')
      .eq('id', deliveryOrderId)
      .single();

    if (deliveryError || !deliveryOrder) throw new Error("Delivery order not found");
    if (deliveryOrder.courier_providers?.code !== 'SMART_DELIVERIES') {
        throw new Error("Payouts only configured for SMART_DELIVERIES");
    }

    // Check if already paid
    const { data: existingPayment } = await supabaseAdmin
      .from('delivery_service_payments')
      .select('*')
      .eq('delivery_order_id', deliveryOrderId)
      .eq('status', 'paid')
      .maybeSingle();

    if (existingPayment) {
        return new Response(JSON.stringify({ success: true, message: "Already paid", payment: existingPayment }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
    }

    const PAYCHANGU_SECRET_KEY = Deno.env.get('PAYCHANGU_SECRET_KEY');
    if (!PAYCHANGU_SECRET_KEY) throw new Error("Missing PAYCHANGU_SECRET_KEY");

    const payoutMethod = Deno.env.get('SMART_DELIVERIES_PAYOUT_METHOD') || 'mobile'; // 'mobile' or 'bank'
    const payoutAccount = Deno.env.get('SMART_DELIVERIES_PAYOUT_ACCOUNT') || '0990000000'; // Phone number or Bank account
    const payoutNetworkId = Deno.env.get('SMART_DELIVERIES_PAYOUT_OPERATOR_ID') || 'AIRTEL'; // Operator ID or Bank UUID
    const amount = deliveryOrder.delivery_fee || 2500;
    
    // Generate a unique charge ID
    const chargeId = `payout-${deliveryOrderId}-${Date.now()}`;

    let endpoint = "";
    let body = {};

    if (payoutMethod === 'mobile') {
        endpoint = "https://api.paychangu.com/mobile-money/payouts/initialize";
        body = {
            mobile: payoutAccount,
            mobile_money_operator_ref_id: payoutNetworkId,
            amount: amount,
            charge_id: chargeId
        };
    } else {
        endpoint = "https://api.paychangu.com/direct-charge/payouts/initialize";
        body = {
            payout_method: "bank_transfer",
            bank_uuid: payoutNetworkId,
            bank_account_number: payoutAccount,
            bank_account_name: "Smart Deliveries",
            amount: amount,
            charge_id: chargeId
        };
    }

    const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${PAYCHANGU_SECRET_KEY}`
        },
        body: JSON.stringify(body)
    });

    const data = await res.json();
    
    // Some endpoints return 200 but status="error"
    if (!res.ok || (data.status && data.status !== 'success')) {
        console.error("PayChangu Payout Error Response:", data);
        
        // If it's a test environment or credentials fail, we can fallback to simulated success if the user hasn't put the right keys in yet?
        // Let's just throw the error so they know it failed if they put real keys.
        throw new Error(`PayChangu API Error: ${data.message || JSON.stringify(data)}`);
    }

    // Log the payment
    const { data: newPayment, error: paymentError } = await supabaseAdmin.from('delivery_service_payments').insert({
        delivery_order_id: deliveryOrderId,
        amount: amount,
        currency: 'MWK',
        status: 'paid',
        transaction_reference: chargeId,
        provider_response: data
    }).select().single();

    if (paymentError) {
        console.error("Failed to log payment:", paymentError);
    }

    return new Response(JSON.stringify({ success: true, chargeId, data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error("Payout Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
