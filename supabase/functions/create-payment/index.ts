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
    const MESSAGING_SERVICE_SID = Deno.env.get("MESSAGING_SERVICE_SID") ?? "";

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const requestUrl = new URL(req.url);

    if (req.method === "GET") {
      const txRef = requestUrl.searchParams.get("tx_ref") ?? "";
      const redirectUrl = requestUrl.searchParams.get("redirect_url") ?? "https://agents-forgiven-ai-commerce.vercel.app/create-payment";

      if (!txRef) {
        return htmlResponse("Payment reference missing", "We could not verify this payment because the transaction reference was not provided.", "error");
      }

      try {
        const result = await verifyAndSyncPayment({
          txRef,
          redirectUrl,
          paychanguSecretKey: PAYCHANGU_SECRET_KEY,
          supabase,
          twilio: {
            accountSid: TWILIO_ACCOUNT_SID,
            authToken: TWILIO_AUTH_TOKEN,
            messagingServiceSid: MESSAGING_SERVICE_SID,
          },
        });

        return Response.redirect(result.redirectTarget, 302);
      } catch (error) {
        console.error("Verification error:", error);
        const msg = error instanceof Error ? error.message : "Internal Server Error";
        
        // If it's a database trigger error, we still want to show a friendly page
        // or potentially redirect to the success page anyway if the payment was actually confirmed
        return htmlResponse(
          "Payment Sync Issue", 
          `Your payment was processed, but we encountered an error updating our records: ${msg}. Please contact support with your reference: ${txRef}`, 
          "warning"
        );
      }
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

      // callback_url  → server-side webhook (this edge function verifies + syncs the order)
      // return_url    → where the USER'S BROWSER lands after payment (Vercel frontend)
      const FRONTEND_URL = "https://agents-forgiven-ai-commerce.vercel.app";
      const callbackUrl = `${SUPABASE_URL}/functions/v1/create-payment`;
      const browserReturnUrl = `${FRONTEND_URL}/create-payment?tx_ref=${generatedTxRef}`;

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
          callback_url: callbackUrl,
          return_url: browserReturnUrl,
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
          })
          .eq("id", order_id)
          .throwOnError();
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
          messagingServiceSid: MESSAGING_SERVICE_SID,
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
  twilio: { accountSid: string; authToken: string; messagingServiceSid: string };
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
      .eq("id", existingOrder.id)
      .throwOnError();
      
      console.log(`✅ Order ${existingOrder.id} status synced to: ${paymentStatus === "paid" ? "paid" : existingOrder.status}`);

    if (paymentStatus === "paid" && !wasPaid && existingOrder.customer_phone && twilio.accountSid && twilio.authToken && twilio.messagingServiceSid) {
      const customerName = existingOrder.customer_name ? ` ${existingOrder.customer_name.split(" ")[0]}` : "";
      const confirmationMessage = `Hi ${customerName}! 🎉\n\nYour payment for *${(existingOrder.items?.[0]?.name || "your order")}* has been confirmed!\n\n✅ Amount paid: MWK ${Number(existingOrder.total).toLocaleString()}\n📦 Status: Paid\n\nThank you for shopping with Forgiven Shopping Centre! We'll keep you updated on your delivery. 🚀`;
      try {
        await sendTwilioMessage(twilio.accountSid, twilio.authToken, twilio.messagingServiceSid, existingOrder.customer_phone, confirmationMessage);
        console.log(`✅ WhatsApp confirmation sent to ${existingOrder.customer_phone}`);
      } catch (twilioErr: any) {
        console.error(`❌ WhatsApp confirmation failed: ${twilioErr.message}`);
      }
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
  const isSuccess = tone === "success";
  const accentHsl = isSuccess ? "152, 60%, 42%" : tone === "pending" ? "38, 92%, 50%" : "0, 72%, 51%";
  const redirectUrl = "https://agents-forgiven-ai-commerce.vercel.app";
  
  return new Response(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title} | Forgiven Shopping Centre</title>
    <style>
      :root {
        --accent: ${accentHsl};
        --bg: #f8fafc;
        --card-bg: #ffffff;
        --text-main: #0f172a;
        --text-muted: #64748b;
      }
      * { box-sizing: border-box; }
      body { 
        margin: 0; 
        font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
        background: radial-gradient(circle at top right, hsla(var(--accent), 0.05), transparent), var(--bg);
        color: var(--text-main);
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        padding: 24px;
      }
      .card { 
        width: 100%; 
        max-width: 440px; 
        background: var(--card-bg); 
        border-radius: 32px; 
        padding: 48px 32px; 
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.08); 
        text-align: center;
        position: relative;
        overflow: hidden;
        animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1);
      }
      @keyframes slideUp {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .card::before {
        content: '';
        position: absolute;
        top: 0; left: 0; right: 0;
        height: 6px;
        background: hsl(var(--accent));
      }
      .icon-box {
        width: 80px;
        height: 80px;
        background: hsla(var(--accent), 0.1);
        border-radius: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 32px;
        color: hsl(var(--accent));
      }
      h1 { margin: 0 0 16px; font-size: 28px; font-weight: 800; letter-spacing: -0.02em; }
      p { margin: 0 0 32px; line-height: 1.6; color: var(--text-muted); font-size: 17px; }
      .btn {
        display: inline-block;
        background: hsl(var(--accent));
        color: white;
        text-decoration: none;
        padding: 16px 32px;
        border-radius: 16px;
        font-weight: 600;
        transition: all 0.2s ease;
        box-shadow: 0 10px 15px -3px hsla(var(--accent), 0.3);
      }
      .btn:hover { transform: translateY(-2px); box-shadow: 0 20px 25px -5px hsla(var(--accent), 0.4); }
      .redirect-msg {
        margin-top: 24px;
        font-size: 14px;
        color: var(--text-muted);
      }
      .dots::after {
        content: '...';
        animation: dots 1.5s infinite;
      }
      @keyframes dots {
        0% { content: '.'; }
        33% { content: '..'; }
        66% { content: '...'; }
      }
    </style>
    ${isSuccess ? `<script>
      setTimeout(() => {
        window.location.href = "${redirectUrl}";
      }, 5000);
    </script>` : ""}
  </head>
  <body>
    <div class="card">
      <div class="icon-box">
        ${isSuccess ? 
          `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>` :
          `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`
        }
      </div>
      <h1>${title}</h1>
      <p>${message}</p>
      <a href="${redirectUrl}" class="btn">Return to Store</a>
      ${isSuccess ? `<div class="redirect-msg">Redirecting to store in <span id="timer">5</span>s<span class="dots"></span></div>
      <script>
        let timeLeft = 5;
        const timerEl = document.getElementById('timer');
        setInterval(() => {
          if (timeLeft > 0) {
            timeLeft--;
            timerEl.textContent = timeLeft;
          }
        }, 1000);
      </script>` : ""}
    </div>
  </body>
</html>`, {
    headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
  });
}

async function sendTwilioMessage(accountSid: string, authToken: string, messagingServiceSid: string, to: string, body: string) {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: "Basic " + btoa(`${accountSid}:${authToken}`),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      To: to.startsWith("whatsapp:") ? to : `whatsapp:${to}`,
      MessagingServiceSid: messagingServiceSid,
      Body: body,
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error("Twilio send error:", response.status, errorData);
    throw new Error(`Twilio error [${response.status}]: ${errorData}`);
  }

  return response.json();
}
