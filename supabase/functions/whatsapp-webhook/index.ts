import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID") || "";
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN") || "";

function getSupabase() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

const QWEN_API_URL = "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions";
const QWEN_MODEL = "qwen-plus";

async function callAI(apiKey: string, systemPrompt: string, history: any[], userMessage: string): Promise<string> {
  const res = await fetch(QWEN_API_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: QWEN_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        ...history,
        { role: "user", content: userMessage },
      ],
      temperature: 0.7,
      max_tokens: 1024,
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    console.error(`Qwen AI error ${res.status}:`, errText);
    throw new Error(`AI error: ${res.status}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "Sorry, I couldn't process that.";
}

async function validateTwilioRequest(req: Request, bodyText: string): Promise<boolean> {
  const bypass = Deno.env.get("BYPASS_TWILIO_AUTH") === "true";
  if (bypass) {
    console.warn("⚠️ BYPASSING TWILIO AUTHENTICATION (BYPASS_TWILIO_AUTH=true)");
    return true;
  }

  const signature = req.headers.get("x-twilio-signature");
  if (!signature) {
    console.error("Missing X-Twilio-Signature header");
    return false;
  }

  const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  if (!twilioAuthToken) {
    console.error("TWILIO_AUTH_TOKEN not configured in environment");
    return false;
  }

  // Supabase Edge Functions often report internal URLs or HTTP instead of HTTPS.
  // We need to reconstruct the public URL exactly as Twilio sees it.
  const forwardedProto = req.headers.get("x-forwarded-proto") || "https";
  const forwardedHost = req.headers.get("x-forwarded-host") || new URL(req.url).host;
  
  const urlObj = new URL(req.url);
  const publicUrl = `${forwardedProto}://${forwardedHost}/functions/v1/whatsapp-webhook${urlObj.search}`;

  const params = new URLSearchParams(bodyText);
  // Twilio sorts params by alphabetical order of keys
  const data = Array.from(params.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .reduce((acc, [key, val]) => acc + key + val, publicUrl);

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(twilioAuthToken),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );
  
  const hmac = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  const digest = btoa(String.fromCharCode(...new Uint8Array(hmac)));

  const matched = digest === signature;
  if (!matched) {
    console.error("❌ Twilio Signature Mismatch!");
    console.log("Details for troubleshooting:");
    console.log("- Public URL used for signing:", publicUrl);
    console.log("- Parameters signed:", Array.from(params.keys()).join(", "));
    console.log("- Received Signature:", signature);
    console.log("- Calculated Signature:", digest);
    console.warn("TIP: Ensure your TWILIO_AUTH_TOKEN in Supabase matches the account sending the message.");
  }

  return matched;
}

async function sendWhatsApp(to: string, body: string, mediaUrl?: string, fromOverride?: string) {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    throw new Error("Twilio credentials not configured (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)");
  }

  const defaultWhatsappNumber = Deno.env.get("TWILIO_WHATSAPP_NUMBER") || "";
  const whatsappNumber = fromOverride || defaultWhatsappNumber;

  const params: Record<string, string> = {
    To: to.startsWith("whatsapp:") ? to : `whatsapp:${to}`,
    From: whatsappNumber.startsWith("whatsapp:") ? whatsappNumber : `whatsapp:${whatsappNumber}`,
    Body: body,
  };

  if (mediaUrl) {
    params.MediaUrl = mediaUrl;
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: "Basic " + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(params),
  });

  const data = await response.json();
  if (!response.ok) {
    console.error("Twilio send error:", data);
    throw new Error(`Twilio error: ${data.message || JSON.stringify(data)}`);
  }
  return data;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = getSupabase();
    const contentType = req.headers.get("content-type") || "";
    let bodyText = "";

    // ── Twilio Webhook (incoming WhatsApp message) ──
    if (contentType.includes("application/x-www-form-urlencoded")) {
      bodyText = await req.text();
      
      // Verify signature
      const isValid = await validateTwilioRequest(req, bodyText);
      if (!isValid) {
        console.error("Invalid Twilio signature");
        return new Response("Forbidden", { status: 403 });
      }

      const formData = new URLSearchParams(bodyText);
      const from = formData.get("From") || "";
      const to = formData.get("To") || "";
      const body = formData.get("Body") || "";
      const customerPhone = from.replace("whatsapp:", "");

      // ── Customer Identification ──
      let { data: customer } = await supabase
        .from("customers")
        .select("*")
        .eq("phone", customerPhone)
        .single();
      
      // Referral detection: Scan body for FGV-XXXXXX pattern
      const refMatch = body.match(/FGV-[A-Z0-9]{6}/i);
      const referralCode = refMatch ? refMatch[0].toUpperCase() : null;
      let agentId = null;

      if (referralCode) {
        const { data: agent } = await supabase.from("agents").select("id").eq("referral_code", referralCode).single();
        if (agent) agentId = agent.id;
      }

      // ── Conversation Handling ──
      // Find or create conversation
      let { data: convo } = await supabase
        .from("conversations")
        .select("*")
        .eq("customer_phone", customerPhone)
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (!convo) {
        const { data: newConvo } = await supabase
          .from("conversations")
          .insert({ customer_phone: customerPhone, channel: "whatsapp", status: "open", last_message_at: new Date().toISOString() })
          .select()
          .single();
        convo = newConvo;
      } else {
        await supabase.from("conversations").update({ last_message_at: new Date().toISOString() }).eq("id", convo.id);
      }

      if (!convo) return new Response("<Response></Response>", { headers: { ...corsHeaders, "Content-Type": "text/xml" } });

      // Store customer message
      await supabase.from("messages").insert({ conversation_id: convo.id, role: "customer", content: body });

      // Get products for AI context
      const { data: products } = await supabase.from("products").select("name, category, price, currency, description, images").eq("status", "active").limit(100);
      const productList = products?.map(p => `- ${p.name} (${p.category}) — ${p.currency} ${p.price}`).join("\n") || "No products available";

      // Get conversation history
      const { data: historyData } = await supabase.from("messages").select("role, content").eq("conversation_id", convo.id).order("created_at", { ascending: true }).limit(15);
      const history = (historyData ?? []).map(m => ({
        role: m.role === "customer" ? "user" : "assistant",
        content: m.content,
      }));

      // ── AI Context Building ──
      const customerStatus = customer?.customer_status || "new";
      const customerName = customer?.name || "Guest";
      
      // Fetch latest order for context
      const { data: latestOrder } = await supabase
        .from("orders")
        .select("status, items, total, created_at")
        .eq("customer_phone", customerPhone)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const latestOrderSummary = latestOrder 
        ? `Latest Order Status: ${latestOrder.status} | Total: MWK ${latestOrder.total} | Date: ${new Date(latestOrder.created_at).toLocaleDateString()}`
        : "No previous orders found.";

      const orderHistorySummary = customer 
        ? `Customer: ${customerName} | Status: ${customerStatus} | Total Orders: ${customer.total_orders} | Total Spent: MWK ${customer.total_spent}\n${latestOrderSummary}`
        : "New Customer - First Interaction";

      const QWEN_API_KEY = Deno.env.get("QWEN_API_KEY");
      if (!QWEN_API_KEY) {
        console.error("QWEN_API_KEY not configured");
        return new Response("<Response></Response>", { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
      }

      const systemPrompt = `You are the AI sales assistant for Forgiven Shopping Centre, Malawi's premium fashion & lifestyle brand.
Your goal is to provide a world-class shopping experience, guiding customers toward the perfect purchase.

STYLE RULES:
- Be friendly, helpful, professional, and elegant.
- Use emojis naturally to feel warm but premium.
- Keep responses concise and natural for WhatsApp.
- Always mention prices in MWK.

CUSTOMER CONTEXT:
${orderHistorySummary}
${customerStatus === 'returning' || customerStatus === 'high_value' 
  ? `Welcome them back as a valued customer. Acknowledge their loyalty.` 
  : `This is a new customer. Be inviting and showcase the best of Forgiven.`}

ACCURACY & MEMORY:
- Pay extreme attention to the customer's delivery details.
- Once details are shared, DO NOT ask for them again.
- Ensure the delivery address is precise (e.g., Area, City).

ORDER CAPTURE PROCESS:
1. Understand the customer's needs and recommend products from the catalog.
2. If they want to order, you MUST collect the following details BEFORE confirming:
   - Full Name
   - Email Address
   - Delivery Address (e.g., Kanjedza, Blantyre or Area 47, Lilongwe)
   - Preferred Contact Number
3. Summarize the details EXACTLY as provided to ensure accuracy:
   *Product:* X
   *Quantity:* X
   *Total:* MWK X
   *Name:* X
   *Email:* X
   *Address:* X
   *Phone:* X
   Ask: "Reply **YES** to confirm your order details and generate your secure payment link."

4. CRITICAL: ONLY AFTER the customer replies with "YES" or explicit confirmation of the summary, respond with EXACTLY this JSON block:
###ORDER_JSON###
{"product_name":"exact product name","quantity":1,"price":25000,"customer_name":"Name","customer_email":"email@example.com","address":"Delivery Address","phone":"Contact Number"}
###END_ORDER_JSON###

Followed by: "Perfect! I'm generating your PayChangu secure payment link right now... 🚀"

MEDIA CAPABILITIES:
- You are integrated with a selective image delivery system.
- To send a product photo, you MUST wrap the EXACT product name in double curly braces: {{Product Name}}.
- ONLY trigger an image when:
  a) The customer specifically asks for a photo or image.
  b) The customer selects a single product and expresses interest.
- NEVER use these tags when listing multiple options or during general browsing.
- Inform the customer: "I'm sending you the image of {{Product Name}} now..."

AVAILABLE PRODUCTS:
${productList}`;

      let aiResponse: string;
      try {
        aiResponse = await callAI(QWEN_API_KEY, systemPrompt, history, body);
      } catch (aiErr) {
        console.error("AI call failed, sending fallback:", aiErr);
        await sendWhatsApp(from, "Thank you for your message! 😊 Our team will get back to you shortly.");
        await supabase.from("messages").insert({ conversation_id: convo.id, role: "ai", content: "Thank you for your message! Our team will get back to you shortly." });
        return new Response("<Response></Response>", { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
      }

      // Check for order JSON intent
      const orderJsonMatch = aiResponse.match(/###ORDER_JSON###\s*([\s\S]*?)\s*###END_ORDER_JSON###/);
      if (orderJsonMatch) {
        try {
          const cleanText = aiResponse.replace(/###ORDER_JSON###[\s\S]*?###END_ORDER_JSON###/, "").trim();
          await sendWhatsApp(from, cleanText);
          await supabase.from("messages").insert({ conversation_id: convo.id, role: "ai", content: cleanText });

          const orderData = JSON.parse(orderJsonMatch[1].trim());
          const product = products?.find(p => p.name.toLowerCase() === orderData.product_name.toLowerCase());
          
          // ── Update Name in Conversation & Customer ──
          if (orderData.customer_name) {
            await supabase.from("conversations").update({ customer_name: orderData.customer_name }).eq("id", convo.id);
            await supabase.from("customers").update({ name: orderData.customer_name }).eq("phone", customerPhone);
          }

          // 1. Create the order in DB
          const { data: newOrder } = await supabase.from("orders").insert({
            customer_phone: customerPhone,
            customer_name: orderData.customer_name,
            customer_email: orderData.customer_email,
            items: [{ product_id: product?.id || orderData.product_name, name: orderData.product_name, quantity: orderData.quantity, price: orderData.price }] as any,
            total: orderData.price * orderData.quantity,
            channel: "whatsapp",
            agent_id: agentId, // Pass detected agent if available
            notes: `Delivery Address: ${orderData.address} | Contact: ${orderData.phone}`,
            status: "pending",
          }).select().single();

          if (newOrder) {
            // 2. Invoke create-payment function
            const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
            const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
            
            const payRes = await fetch(`${SUPABASE_URL}/functions/v1/create-payment`, {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                action: "create_payment",
                order_id: newOrder.id,
                amount: newOrder.total,
                currency: "MWK",
                email: orderData.customer_email,
                first_name: orderData.customer_name,
                title: `Forgiven: ${orderData.product_name}`,
              }),
            });

            const payData = await payRes.json();
            if (payData.success && payData.checkout_url) {
              await sendWhatsApp(from, `💳 Here is your secure payment link:\n${payData.checkout_url}\n\nYou can pay via Airtel Money, Mpamba, or Card. We'll start processing your order as soon as payment is confirmed! ✨`);
            } else {
              await sendWhatsApp(from, "⚠️ I encountered an issue generating the payment link. Our support team will contact you shortly to assist with your payment!");
            }
          }
        } catch (e) {
          console.error("Order processing error:", e);
          await sendWhatsApp(from, aiResponse.replace(/###ORDER_JSON###[\s\S]*?###END_ORDER_JSON###/, "").trim());
        }
      } else {
        // Normal response
        await sendWhatsApp(from, aiResponse, undefined, to);
        await supabase.from("messages").insert({ conversation_id: convo.id, role: "ai", content: aiResponse });
      }

      return new Response("<Response></Response>", { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
    }

    // ── API calls from dashboard ──
    const jsonBody = await req.json();
    const { action } = jsonBody;

    if (action === "send-message") {
      const { conversationId, phone, message, mediaUrl } = jsonBody;
      if (!phone || !message) throw { status: 400, message: "Phone and message required" };

      await sendWhatsApp(phone, message, mediaUrl);

      if (conversationId) {
        await supabase.from("messages").insert({ conversation_id: conversationId, role: "admin", content: message });
        await supabase.from("conversations").update({ last_message_at: new Date().toISOString() }).eq("id", conversationId);
      }

      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    throw { status: 400, message: `Unknown action: ${action}` };
  } catch (e: unknown) {
    console.error("WhatsApp webhook error:", e);
    const err = e as { status?: number; message?: string };
    return new Response(
      JSON.stringify({ error: err?.message || "Unknown error" }),
      { status: err?.status || 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
