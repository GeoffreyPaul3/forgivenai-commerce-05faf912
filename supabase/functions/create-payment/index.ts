import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const PAYCHANGU_SECRET_KEY = Deno.env.get("PAYCHANGU_SECRET_KEY");
    if (!PAYCHANGU_SECRET_KEY) throw new Error("PAYCHANGU_SECRET_KEY not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID") ?? "";
    const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN") ?? "";
    const TWILIO_WHATSAPP_NUMBER = Deno.env.get("TWILIO_WHATSAPP_NUMBER") ?? "";

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const requestUrl = new URL(req.url);

    if (req.method === "GET") {
      const txRef = requestUrl.searchParams.get("tx_ref") ?? "";
      const redirectUrl = requestUrl.searchParams.get("redirect_url") ?? "";

      if (!txRef) {
        return htmlResponse("Payment reference missing", "We could not verify this payment because the transaction reference was not provided.", "error");
      }

      const result = await verifyAndSyncPayment({
        txRef,
        redirectUrl,
        paychanguSecretKey: PAYCHANGU_SECRET_KEY,
        supabase,
        twilio: {
          accountSid: TWILIO_ACCOUNT_SID,
          authToken: TWILIO_AUTH_TOKEN,
          from: TWILIO_WHATSAPP_NUMBER,
        },
      });

      if (result.redirectTarget) {
        return Response.redirect(result.redirectTarget, 302);
      }

      return htmlResponse(
        result.status === "paid" ? "Payment successful" : "Payment pending",
        result.status === "paid"
          ? "Your payment has been confirmed and your order is now being processed."
          : `Your payment status is currently ${result.status}. Please return to WhatsApp if you need help.`,
        result.status === "paid" ? "success" : "pending",
      );
    }

    const rawBody = await req.text();
    const body = rawBody ? JSON.parse(rawBody) : {};
    const {
      action,
      order_id,
      amount,
      currency,
      email,
      first_name,
      last_name,
      tx_ref,
      title,
      description,
      return_url,
    } = body;

    if (action === "create_payment") {
      const generatedTxRef = tx_ref || `FG-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
      const callbackTarget = `${SUPABASE_URL}/functions/v1/create-payment${return_url ? `?redirect_url=${encodeURIComponent(return_url)}` : ""}`;

      const response = await fetch("https://api.paychangu.com/payment", {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${PAYCHANGU_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: String(amount),
          currency: currency || "MWK",
          email: email || "",
          first_name: first_name || "",
          last_name: last_name || "",
          callback_url: callbackTarget,
          return_url: callbackTarget,
          tx_ref: generatedTxRef,
          customization: {
            title: title || "Forgiven Shopping Centre Order",
            description: description || "Payment for your order",
          },
          meta: {
            order_id: order_id || "",
          },
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        console.error("PayChangu error:", data);
        throw new Error(data.message || `PayChangu error [${response.status}]`);
      }

      if (order_id) {
        await supabase
          .from("orders")
          .update({
            payment_reference: data.data?.data?.tx_ref || data.data?.tx_ref || generatedTxRef,
            status: "pending",
          })
          .eq("id", order_id);
      }

      return new Response(JSON.stringify({
        success: true,
        checkout_url: data.data?.checkout_url || data.checkout_url,
        tx_ref: data.data?.data?.tx_ref || data.data?.tx_ref || generatedTxRef,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "verify_payment") {
      if (!tx_ref) throw new Error("tx_ref is required for verification");

      const result = await verifyAndSyncPayment({
        txRef: tx_ref,
        orderId: order_id,
        paychanguSecretKey: PAYCHANGU_SECRET_KEY,
        supabase,
        twilio: {
          accountSid: TWILIO_ACCOUNT_SID,
          authToken: TWILIO_AUTH_TOKEN,
          from: TWILIO_WHATSAPP_NUMBER,
        },
      });

      return new Response(JSON.stringify({
        success: true,
        status: result.status,
        data: result.data,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Invalid action. Use 'create_payment' or 'verify_payment'.");
  } catch (error) {
    console.error("Payment error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function verifyAndSyncPayment({
  txRef,
  orderId,
  redirectUrl,
  paychanguSecretKey,
  supabase,
  twilio,
}: {
  txRef: string;
  orderId?: string;
  redirectUrl?: string;
  paychanguSecretKey: string;
  supabase: any;
  twilio: { accountSid: string; authToken: string; from: string };
}) {
  const response = await fetch(`https://api.paychangu.com/verify-payment/${txRef}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${paychanguSecretKey}`,
    },
  });

  const data = await response.json();
  if (!response.ok) {
    console.error("PayChangu verify error:", data);
    throw new Error(data.message || `Verification error [${response.status}]`);
  }

  const externalStatus = String(data.data?.status || data.status || "unknown").toLowerCase();
  const paymentStatus = externalStatus === "success" ? "paid" : externalStatus;

  // Find order by tx_ref if orderId not provided
  const orderQuery = orderId
    ? supabase.from("orders").select("*").eq("id", orderId).maybeSingle()
    : supabase.from("orders").select("*").eq("payment_reference", txRef).maybeSingle();
  const { data: existingOrder } = await orderQuery;

  if (existingOrder) {
    const wasPaid = existingOrder.status === "paid";

    await supabase
      .from("orders")
      .update({
        status: paymentStatus === "paid" ? "paid" : existingOrder.status,
      })
      .eq("id", existingOrder.id);

    if (paymentStatus === "paid" && !wasPaid && existingOrder.customer_phone && twilio.accountSid && twilio.authToken && twilio.from) {
      const customerName = existingOrder.customer_name ? ` ${existingOrder.customer_name}` : "";
      const confirmationMessage = `Hi${customerName} 😊\n\nYour payment for your Forgiven Shopping Centre order has been confirmed.\n\n✅ Amount received: MK ${Number(existingOrder.total).toLocaleString()}\n📦 Status: paid\n\nThank you for shopping with us! We'll keep you updated on delivery.`;
      await sendTwilioMessage(twilio.accountSid, twilio.authToken, twilio.from, existingOrder.customer_phone, confirmationMessage);
    }
  }

  const redirectTarget = redirectUrl
    ? withQueryParams(redirectUrl, {
        status: paymentStatus,
        tx_ref: txRef,
        order_id: existingOrder?.id || orderId || "",
      })
    : "";

  return { status: paymentStatus, data, redirectTarget };
}

function withQueryParams(target: string, params: Record<string, string>) {
  const url = new URL(target);
  Object.entries(params).forEach(([key, value]) => {
    if (value) url.searchParams.set(key, value);
  });
  return url.toString();
}

function htmlResponse(title: string, message: string, tone: "success" | "pending" | "error") {
  const accent = tone === "success" ? "152 60% 42%" : tone === "pending" ? "38 92% 50%" : "0 72% 51%";
  return new Response(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <style>
      body { margin: 0; font-family: -apple-system, system-ui, sans-serif; background: #f8fafc; color: #1e293b; }
      .wrap { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
      .card { width: 100%; max-width: 480px; background: white; border-radius: 24px; padding: 40px; box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1); border-top: 8px solid hsl(${accent}); text-align: center; }
      h1 { margin: 0 0 16px; font-size: 24px; font-weight: 700; color: #0f172a; }
      p { margin: 0; line-height: 1.6; color: #64748b; font-size: 16px; }
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="card">
        <h1>${title}</h1>
        <p>${message}</p>
      </div>
    </div>
  </body>
</html>`, {
    headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
  });
}

async function sendTwilioMessage(accountSid: string, authToken: string, from: string, to: string, body: string) {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: "Basic " + btoa(`${accountSid}:${authToken}`),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: `whatsapp:${to}`, From: `whatsapp:${from}`, Body: body }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error("Twilio send error:", response.status, errorData);
    throw new Error(`Twilio error [${response.status}]: ${errorData}`);
  }

  return response.json();
}
