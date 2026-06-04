import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Known PayChangu mobile money operator ref_ids for Malawi
// Source: https://developer.paychangu.com/docs/mobile-money
const KNOWN_OPERATORS: Record<string, string> = {
  'airtel': '20be6c20-adeb-4b5b-a7ba-0769820df4fb',
  'airtel money': '20be6c20-adeb-4b5b-a7ba-0769820df4fb',
  'mpamba': '27494cb5-ba9e-437f-a114-4e7a7686bcca',
  'tnm': '27494cb5-ba9e-437f-a114-4e7a7686bcca',
  'tnm mpamba': '27494cb5-ba9e-437f-a114-4e7a7686bcca',
};

async function getOperatorRefId(preferredName: string): Promise<string> {
  const nameLower = preferredName.toLowerCase();

  // First try known hardcoded IDs (fastest and most reliable)
  if (KNOWN_OPERATORS[nameLower]) {
    console.log(`Using known operator ID for "${nameLower}": ${KNOWN_OPERATORS[nameLower]}`);
    return KNOWN_OPERATORS[nameLower];
  }

  // Fallback: fetch from PayChangu live operators list
  try {
    const res = await fetch("https://api.paychangu.com/mobile-money", {
      headers: { 'Accept': 'application/json' }
    });
    if (res.ok) {
      const data = await res.json();
      const operators: any[] = data.data || [];
      console.log("Live PayChangu operators:", JSON.stringify(operators));
      const match = operators.find((op: any) =>
        (op.name || '').toLowerCase().includes(nameLower) ||
        (op.short_code || '').toLowerCase().includes(nameLower)
      );
      if (match) return match.ref_id;
    }
  } catch (e) {
    console.warn("Could not fetch live operators, using fallback:", e);
  }

  throw new Error(
    `Unknown mobile money operator: "${preferredName}". ` +
    `Set SMART_DELIVERIES_PAYOUT_OPERATOR_NAME to "airtel" or "mpamba".`
  );
}

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
    if (!PAYCHANGU_SECRET_KEY) throw new Error("Missing PAYCHANGU_SECRET_KEY in Supabase secrets");

    const payoutMethod = Deno.env.get('SMART_DELIVERIES_PAYOUT_METHOD') || 'mobile';
    const payoutAccount = Deno.env.get('SMART_DELIVERIES_PAYOUT_ACCOUNT');
    const preferredOperatorName = (Deno.env.get('SMART_DELIVERIES_PAYOUT_OPERATOR_NAME') || 'airtel').toLowerCase();
    const amount = deliveryOrder.delivery_fee || 2500;
    const chargeId = `payout-${deliveryOrderId}-${Date.now()}`;

    // Guard: require payout account to be set
    if (!payoutAccount) {
      throw new Error(
        "SMART_DELIVERIES_PAYOUT_ACCOUNT is not set. " +
        "Add Smart Deliveries' mobile money number to your Supabase project secrets."
      );
    }

    let endpoint = "";
    let body: Record<string, any> = {};

    if (payoutMethod === 'mobile') {
      const operatorRefId = await getOperatorRefId(preferredOperatorName);

      endpoint = "https://api.paychangu.com/mobile-money/payouts/initialize";
      body = {
        mobile: payoutAccount,
        mobile_money_operator_ref_id: operatorRefId,
        amount: String(amount),
        charge_id: chargeId
      };
    } else {
      const bankUuid = Deno.env.get('SMART_DELIVERIES_PAYOUT_BANK_UUID');
      if (!bankUuid) throw new Error("SMART_DELIVERIES_PAYOUT_BANK_UUID is not set in Supabase secrets.");

      endpoint = "https://api.paychangu.com/direct-charge/payouts/initialize";
      body = {
        payout_method: "bank_transfer",
        bank_uuid: bankUuid,
        bank_account_number: payoutAccount,
        bank_account_name: "Smart Deliveries",
        amount: String(amount),
        charge_id: chargeId
      };
    }

    console.log(`Initiating ${payoutMethod} payout → ${payoutAccount}, amount: MWK ${amount}, chargeId: ${chargeId}`);

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
    console.log(`PayChangu payout response [${res.status}]:`, JSON.stringify(data));

    // PayChangu returns 200 with status "success" on success
    if (!res.ok || (data.status && data.status !== 'success')) {
      throw new Error(`PayChangu API Error: ${data.message || JSON.stringify(data)}`);
    }

    // Record the successful payment in DB
    const { error: paymentError } = await supabaseAdmin.from('delivery_service_payments').insert({
      delivery_order_id: deliveryOrderId,
      amount: amount,
      currency: 'MWK',
      status: 'paid',
      transaction_reference: data.data?.charge_id || chargeId,
      provider_response: data
    });

    if (paymentError) {
      console.error("Failed to log payment record:", paymentError);
    }

    return new Response(JSON.stringify({ success: true, chargeId, data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error("Payout Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
