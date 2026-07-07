import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { PaymentOrchestrator } from "./orchestrator.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID") ?? "";
    const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN") ?? "";
    const MESSAGING_SERVICE_SID = Deno.env.get("MESSAGING_SERVICE_SID") ?? "";

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const orchestrator = new PaymentOrchestrator();
    const requestUrl = new URL(req.url);

    // Fetch default provider from settings
    let defaultProvider = 'paychangu';
    try {
      const { data: setting } = await supabase.from('settings').select('value').eq('key', 'default_payment_provider').maybeSingle();
      if (setting && setting.value) defaultProvider = setting.value;
    } catch(e) {
      console.error("Could not fetch default provider, falling back to paychangu");
    }

    if (req.method === "GET") {
      const txRef = requestUrl.searchParams.get("tx_ref") ?? "";

      if (!txRef) {
        return htmlResponse("Payment reference missing", "We could not verify this payment because the transaction reference was not provided.", "error", "");
      }

      try {
        const result = await verifyAndSyncPayment({
          txRef,
          orchestrator,
          supabase,
          twilio: {
            accountSid: TWILIO_ACCOUNT_SID,
            authToken: TWILIO_AUTH_TOKEN,
            messagingServiceSid: MESSAGING_SERVICE_SID,
          },
        });

        const status = result.status ?? "unknown";
        if (status === "paid" || status === "success") {
          // Immediately redirect to WhatsApp — confirmation message already sent by webhook.
          // This avoids showing raw HTML on the Supabase URL and the garbled emoji encoding issue.
          return new Response(null, {
            status: 302,
            headers: {
              ...corsHeaders,
              "Location": `https://wa.me/265997128899?text=${encodeURIComponent("Hi! My payment just went through ✅ — order reference: " + txRef)}`,
            }
          });
        } else if (status === "pending") {
          return htmlResponse("Payment Pending", "Your payment is still being processed. You'll receive a WhatsApp message once it clears — usually within a few minutes.", "pending", txRef);
        } else {
          return htmlResponse("Verification Failed", `We couldn't verify your payment. Please WhatsApp us and quote your reference: ${txRef}`, "error", txRef);
        }
      } catch (error) {
        console.error("Verification error:", error);
        const msg = error instanceof Error ? error.message : "Internal Server Error";
        return htmlResponse(
          "Payment Sync Issue",
          `Your payment was processed, but we encountered an issue updating our records. Please WhatsApp us with your reference: ${txRef}`,
          "warning",
          txRef
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
      provider = defaultProvider,
    } = body;

    if (action === "create_payment") {
      const generatedTxRef = tx_ref ? tx_ref.replace(/[^a-zA-Z0-9]/g, "") : `FG${Date.now()}${Math.floor(Math.random() * 100000)}`;

      // Browser return URL loops back to this edge function's GET handler.
      // It verifies the payment server-side and serves a branded HTML receipt page
      // with a 5-second auto-redirect to WhatsApp — no React SPA dependency at all.
      const callbackUrl = `${SUPABASE_URL}/functions/v1/create-payment`;
      const browserReturnUrl = `${SUPABASE_URL}/functions/v1/create-payment?tx_ref=${generatedTxRef}`;

      const activeProvider = orchestrator.getProvider(provider);

      const response = await activeProvider.initializePayment({
        amount: String(amount),
        currency: currency || "MWK",
        email: email || "",
        first_name: first_name || "",
        last_name: last_name || "",
        callback_url: callbackUrl,
        return_url: browserReturnUrl,
        tx_ref: generatedTxRef,
        title: title || "Forgiven Shopping Centre Order",
        description: description || "Payment for your order",
        order_id: order_id || "",
      });

      if (!response.success) {
         throw new Error(response.error || 'Failed to initialize payment');
      }

      if (order_id) {
        const orderUpdates: Record<string, unknown> = {
          payment_reference: response.tx_ref || generatedTxRef,
          payment_provider: provider.toLowerCase(),
        };

        // Fix 3: Store OneKhusa PTID (paymentTransactionId) as external_reference
        // so verifyPayment can use the correct identifier later
        const ptid = (response.extra as any)?.paymentTransactionId;
        if (ptid) {
          orderUpdates.external_reference = ptid;
          console.log(`✅ Stored OneKhusa PTID as external_reference: ${ptid}`);
        }

        await supabase
          .from("orders")
          .update(orderUpdates)
          .eq("id", order_id)
          .throwOnError();
      }

      return new Response(JSON.stringify({
        success: true,
        checkout_url: response.checkout_url,
        tx_ref: response.tx_ref || generatedTxRef,
        provider: provider.toLowerCase(),
        ...(response.extra ? { extra: response.extra } : {}),
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "verify_payment") {
      if (!tx_ref) throw new Error("tx_ref is required for verification");

      const result = await verifyAndSyncPayment({
        txRef: tx_ref,
        orderId: order_id,
        orchestrator,
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
    
    if (action === "webhook") {
       // Identify provider from body or query params
       const webhookProvider = orchestrator.getProvider(provider || 'onekhusa');
       const webhookResult = await webhookProvider.handleWebhook(req);
       
       if (webhookResult.success && webhookResult.tx_ref) {
          // Sync it
          await verifyAndSyncPayment({
            txRef: webhookResult.tx_ref,
            orchestrator,
            supabase,
            twilio: {
              accountSid: TWILIO_ACCOUNT_SID,
              authToken: TWILIO_AUTH_TOKEN,
              messagingServiceSid: MESSAGING_SERVICE_SID,
            },
            preVerifiedStatus: webhookResult.status,
            externalReference: webhookResult.external_reference
          });
       }
       
       return new Response(JSON.stringify({ received: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Fix 5: Auto-detect OneKhusa server-side callbacks.
    // OneKhusa POSTs a notification without an 'action' field — detect by presence of
    // sourceReferenceNumber or paymentTransactionId at the root or inside data.
    const isOneKhusaCallback =
      !action &&
      (body?.data?.sourceReferenceNumber ||
        body?.data?.paymentTransactionId ||
        body?.sourceReferenceNumber ||
        body?.paymentTransactionId);

    if (isOneKhusaCallback) {
      console.log("Detected OneKhusa server callback (no 'action' field):", JSON.stringify(body));
      // Re-use the req object — but we already consumed it; rebuild a fake Request with the raw body
      const fakeReq = new Request(req.url, {
        method: "POST",
        headers: req.headers,
        body: JSON.stringify(body),
      });
      const webhookProvider = orchestrator.getProvider("onekhusa");
      const webhookResult = await webhookProvider.handleWebhook(fakeReq);

      if (webhookResult.success && webhookResult.tx_ref) {
        await verifyAndSyncPayment({
          txRef: webhookResult.tx_ref,
          orchestrator,
          supabase,
          twilio: {
            accountSid: TWILIO_ACCOUNT_SID,
            authToken: TWILIO_AUTH_TOKEN,
            messagingServiceSid: MESSAGING_SERVICE_SID,
          },
          preVerifiedStatus: webhookResult.status,
          externalReference: webhookResult.external_reference,
        });
      }

      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Invalid action. Use 'create_payment', 'verify_payment' or 'webhook'.");
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
  orchestrator,
  supabase,
  twilio,
  preVerifiedStatus,
  externalReference
}: {
  txRef: string;
  orderId?: string;
  redirectUrl?: string;
  orchestrator: PaymentOrchestrator;
  supabase: any;
  twilio: { accountSid: string; authToken: string; messagingServiceSid: string };
  preVerifiedStatus?: 'paid' | 'pending' | 'failed' | 'cancelled' | 'unknown';
  externalReference?: string;
}) {
  // Find order by tx_ref if orderId not provided
  const orderQuery = orderId
    ? supabase.from("orders").select("*").eq("id", orderId).maybeSingle()
    : supabase.from("orders").select("*").eq("payment_reference", txRef).maybeSingle();
  const { data: existingOrder } = await orderQuery;
  
  if (!existingOrder) {
     throw new Error(`Order not found for tx_ref: ${txRef}`);
  }

  const providerName = existingOrder.payment_provider || 'paychangu';
  const provider = orchestrator.getProvider(providerName);

  let paymentStatus = preVerifiedStatus;
  let providerData = null;
  let finalExternalRef = externalReference;

  if (!paymentStatus) {
    // Fix 4: Pass PTID (stored as external_reference) to verifyPayment
    // so OneKhusa can look up by PTID instead of the internal tx_ref
    const ptid = existingOrder.external_reference || undefined;
    const response = await provider.verifyPayment({ tx_ref: txRef, ptid });
    paymentStatus = response.status;
    providerData = response.data;
    if (response.external_reference) finalExternalRef = response.external_reference;
  }

  if (existingOrder) {
    const wasPaid = existingOrder.status === "paid";
    
    if (wasPaid) {
      paymentStatus = "paid";
    }

    const updates: any = {
      status: paymentStatus === "paid" ? "paid" : existingOrder.status,
    };
    if (finalExternalRef) updates.external_reference = finalExternalRef;

    await supabase
      .from("orders")
      .update(updates)
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
        status: paymentStatus || 'unknown',
        tx_ref: txRef,
        order_id: existingOrder?.id || orderId || "",
      })
    : "";

  return { status: paymentStatus, data: providerData, redirectTarget };
}

function withQueryParams(target: string, params: Record<string, string>) {
  const url = new URL(target);
  Object.entries(params).forEach(([key, value]) => {
    if (value) url.searchParams.set(key, value);
  });
  return url.toString();
}

const WA_NUMBER = "265997128899"; // Forgiven Shopping Centre WhatsApp sales agent
const WA_LINK = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent("Hi! I just completed my payment and I'd like an update on my order 😊")}`;
const STORE_URL = "https://www.forgivenshoppingcentre.com";

function htmlResponse(
  title: string,
  message: string,
  tone: "success" | "pending" | "error" | "warning",
  txRef: string,
  _providerData?: unknown
) {
  const isSuccess = tone === "success";
  const isPending = tone === "pending";
  const accentHsl = isSuccess
    ? "152, 60%, 42%"
    : isPending
    ? "38, 92%, 50%"
    : "0, 72%, 51%";

  const iconSvg = isSuccess
    ? `<svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`
    : isPending
    ? `<svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`
    : `<svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;

  const waIconSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>`;

  return new Response(
    `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title} | Forgiven Shopping Centre</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
    <style>
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      :root {
        --accent: ${accentHsl};
        --accent-light: hsla(${accentHsl}, 0.12);
        --accent-solid: hsl(${accentHsl});
        --bg: #f0f4f8;
        --card: #ffffff;
        --text: #0f172a;
        --muted: #64748b;
        --border: #e2e8f0;
        --wa-green: #25d366;
        --wa-dark: #128c7e;
      }
      body {
        font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        background:
          radial-gradient(ellipse at top right, hsla(${accentHsl}, 0.10), transparent 55%),
          radial-gradient(ellipse at bottom left, hsla(${accentHsl}, 0.06), transparent 55%),
          var(--bg);
        color: var(--text);
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 24px;
      }
      .card {
        width: 100%;
        max-width: 460px;
        background: var(--card);
        border-radius: 28px;
        padding: 48px 36px 40px;
        box-shadow:
          0 32px 64px -16px rgba(0,0,0,0.10),
          0 0 0 1px rgba(0,0,0,0.04);
        text-align: center;
        position: relative;
        overflow: hidden;
        animation: rise 0.55s cubic-bezier(0.16, 1, 0.3, 1) both;
      }
      @keyframes rise {
        from { opacity: 0; transform: translateY(28px) scale(0.97); }
        to   { opacity: 1; transform: translateY(0)   scale(1); }
      }
      .stripe {
        position: absolute;
        top: 0; left: 0; right: 0;
        height: 5px;
        background: linear-gradient(90deg, var(--accent-solid), hsla(${accentHsl}, 0.4));
      }
      .brand {
        font-size: 12px;
        font-weight: 600;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: var(--muted);
        margin-bottom: 28px;
      }
      .icon-ring {
        width: 88px;
        height: 88px;
        background: var(--accent-light);
        border-radius: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 24px;
        color: var(--accent-solid);
        animation: pop 0.4s 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) both;
      }
      @keyframes pop {
        from { transform: scale(0.5); opacity: 0; }
        to   { transform: scale(1);   opacity: 1; }
      }
      h1 {
        font-size: 26px;
        font-weight: 800;
        letter-spacing: -0.025em;
        line-height: 1.2;
        margin-bottom: 12px;
        color: var(--text);
      }
      .subtitle {
        font-size: 15px;
        line-height: 1.65;
        color: var(--muted);
        margin-bottom: 28px;
      }
      .divider {
        height: 1px;
        background: var(--border);
        margin: 0 -36px 28px;
      }
      ${txRef ? `.ref-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: #f8fafc;
        border-radius: 12px;
        padding: 12px 16px;
        margin-bottom: 24px;
        font-size: 13px;
      }
      .ref-label { color: var(--muted); font-weight: 500; }
      .ref-value { font-family: monospace; font-size: 12px; color: var(--text); word-break: break-all; text-align: right; max-width: 65%; }` : ""}
      .btn-wa {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        width: 100%;
        background: var(--wa-green);
        color: #fff;
        text-decoration: none;
        padding: 16px 24px;
        border-radius: 16px;
        font-size: 16px;
        font-weight: 700;
        letter-spacing: -0.01em;
        box-shadow: 0 10px 24px -4px rgba(37, 211, 102, 0.40);
        transition: transform 0.2s ease, box-shadow 0.2s ease;
        margin-bottom: 12px;
      }
      .btn-wa:hover {
        transform: translateY(-2px);
        box-shadow: 0 18px 30px -6px rgba(37, 211, 102, 0.50);
      }
      .btn-store {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        background: transparent;
        color: var(--muted);
        text-decoration: none;
        padding: 13px 24px;
        border-radius: 16px;
        font-size: 14px;
        font-weight: 600;
        border: 1.5px solid var(--border);
        transition: all 0.2s ease;
      }
      .btn-store:hover {
        border-color: var(--accent-solid);
        color: var(--accent-solid);
        background: var(--accent-light);
      }
      .countdown-bar-wrap {
        margin-top: 20px;
        background: var(--border);
        border-radius: 100px;
        height: 4px;
        overflow: hidden;
      }
      .countdown-bar {
        height: 100%;
        background: var(--wa-green);
        border-radius: 100px;
        width: 100%;
        transition: width 1s linear;
      }
      .countdown-text {
        margin-top: 10px;
        font-size: 13px;
        color: var(--muted);
        text-align: center;
      }
    </style>
    ${isSuccess ? `<script>
      var SECONDS = 5;
      var remaining = SECONDS;
      function tick() {
        remaining--;
        var bar = document.getElementById('cbar');
        var txt = document.getElementById('ctxt');
        if (bar) bar.style.width = (remaining / SECONDS * 100) + '%';
        if (txt) txt.textContent = 'Opening WhatsApp in ' + remaining + 's…';
        if (remaining <= 0) {
          window.location.href = '${WA_LINK}';
        }
      }
      window.addEventListener('DOMContentLoaded', function() {
        setInterval(tick, 1000);
      });
    </script>` : ""}
  </head>
  <body>
    <div class="card">
      <div class="stripe"></div>
      <div class="brand">Forgiven Shopping Centre</div>
      <div class="icon-ring">${iconSvg}</div>
      <h1>${title}</h1>
      <p class="subtitle">${message}</p>
      <div class="divider"></div>
      ${txRef ? `<div class="ref-row"><span class="ref-label">Reference</span><span class="ref-value">${txRef}</span></div>` : ""}
      <a href="${WA_LINK}" class="btn-wa">
        ${waIconSvg}
        ${isSuccess ? "Chat With Us on WhatsApp" : "Contact Us on WhatsApp"}
      </a>
      <a href="${STORE_URL}" class="btn-store">Visit Our Website</a>
      ${isSuccess ? `
      <div class="countdown-bar-wrap"><div class="countdown-bar" id="cbar"></div></div>
      <div class="countdown-text" id="ctxt">Opening WhatsApp in 5s…</div>` : ""}
    </div>
  </body>
</html>`,
    { headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } }
  );
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
