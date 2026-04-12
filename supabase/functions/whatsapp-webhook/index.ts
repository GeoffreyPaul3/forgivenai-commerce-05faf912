import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/twilio';

function getSupabase() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

const QWEN_API_URL = "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions";
const QWEN_MODEL = "qwen-plus";

async function callAI(apiKey: string, systemPrompt: string, userMessage: string): Promise<string> {
  const res = await fetch(QWEN_API_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: QWEN_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      temperature: 0.7,
      max_tokens: 512,
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

async function sendWhatsApp(to: string, body: string) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY");
  if (!LOVABLE_API_KEY || !TWILIO_API_KEY) throw new Error("Twilio not configured");

  const whatsappNumber = Deno.env.get("TWILIO_WHATSAPP_NUMBER") || "";

  const response = await fetch(`${GATEWAY_URL}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": TWILIO_API_KEY,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      To: to.startsWith("whatsapp:") ? to : `whatsapp:${to}`,
      From: whatsappNumber.startsWith("whatsapp:") ? whatsappNumber : `whatsapp:${whatsappNumber}`,
      Body: body,
    }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(`Twilio error: ${JSON.stringify(data)}`);
  return data;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = getSupabase();
    const contentType = req.headers.get("content-type") || "";

    // ── Twilio Webhook (incoming WhatsApp message) ──
    if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await req.formData();
      const from = formData.get("From")?.toString() || "";
      const body = formData.get("Body")?.toString() || "";
      const customerPhone = from.replace("whatsapp:", "");

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
      const { data: products } = await supabase.from("products").select("name, category, price, currency, description").eq("status", "active").limit(30);
      const productList = products?.map(p => `- ${p.name} (${p.category}) — ${p.currency} ${p.price}`).join("\n") || "No products available";

      // Get conversation history
      const { data: history } = await supabase.from("messages").select("role, content").eq("conversation_id", convo.id).order("created_at", { ascending: true }).limit(10);
      const historyText = history?.map(m => `${m.role}: ${m.content}`).join("\n") || "";

      const QWEN_API_KEY = Deno.env.get("QWEN_API_KEY");
      if (!QWEN_API_KEY) {
        console.error("QWEN_API_KEY not configured");
        return new Response("<Response></Response>", { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
      }

      const systemPrompt = `You are the AI sales assistant for Forgiven Shopping Centre, a premium fashion brand.

AVAILABLE PRODUCTS:
${productList}

CONVERSATION HISTORY:
${historyText}

RULES:
- Be friendly, helpful, and professional
- Recommend products based on customer needs
- If customer wants to order, extract: product name, quantity, delivery details
- When order intent is detected, respond with ORDER_INTENT: followed by JSON: {"product":"name","quantity":1,"notes":"any details"}
- Use emojis sparingly for a warm feel
- Keep responses concise (under 200 words)
- Always mention prices in MWK
- If asked about payment, mention M-Pesa/bank transfer options
- End with a question or call to action`;

      let aiResponse: string;
      try {
        aiResponse = await callAI(QWEN_API_KEY, systemPrompt, body);
      } catch (aiErr) {
        console.error("AI call failed, sending fallback:", aiErr);
        await sendWhatsApp(from, "Thank you for your message! 😊 Our team will get back to you shortly.");
        await supabase.from("messages").insert({ conversation_id: convo.id, role: "ai", content: "Thank you for your message! Our team will get back to you shortly." });
        return new Response("<Response></Response>", { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
      }

      // Check for order intent
      if (aiResponse.includes("ORDER_INTENT:")) {
        const parts = aiResponse.split("ORDER_INTENT:");
        const reply = parts[0].trim();
        try {
          const orderJson = JSON.parse(parts[1].trim());
          const product = products?.find(p => p.name.toLowerCase().includes(orderJson.product?.toLowerCase()));
          if (product) {
            await supabase.from("orders").insert({
              customer_phone: customerPhone,
              customer_name: convo.customer_name || customerPhone,
              items: [{ product_id: product.name, quantity: orderJson.quantity || 1, price: product.price }] as any,
              total: (product.price || 0) * (orderJson.quantity || 1),
              currency: product.currency || "MWK",
              channel: "whatsapp",
              notes: orderJson.notes || "",
              status: "pending",
            });
          }
          // Send the human-readable part only
          await sendWhatsApp(from, reply || `Your order for ${orderJson.product} has been placed! We'll confirm shortly. 🎉`);
        } catch {
          await sendWhatsApp(from, aiResponse.replace(/ORDER_INTENT:.*/, "").trim());
        }
      } else {
        await sendWhatsApp(from, aiResponse);
      }

      // Store AI response
      await supabase.from("messages").insert({ conversation_id: convo.id, role: "ai", content: aiResponse.replace(/ORDER_INTENT:.*/, "").trim() });

      return new Response("<Response></Response>", { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
    }

    // ── API calls from dashboard ──
    const jsonBody = await req.json();
    const { action } = jsonBody;

    if (action === "send-message") {
      const { conversationId, phone, message } = jsonBody;
      if (!phone || !message) throw { status: 400, message: "Phone and message required" };

      await sendWhatsApp(phone, message);

      if (conversationId) {
        await supabase.from("messages").insert({ conversation_id: conversationId, role: "agent", content: message });
        await supabase.from("conversations").update({ last_message_at: new Date().toISOString() }).eq("id", conversationId);
      }

      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "send-order-update") {
      const { phone, orderId, status } = jsonBody;
      if (!phone || !orderId) throw { status: 400, message: "Phone and orderId required" };

      const statusMessages: Record<string, string> = {
        confirmed: "✅ Your order has been confirmed! We're preparing it now.",
        paid: "💳 Payment received! Thank you.",
        processing: "📦 Your order is being processed.",
        shipped: "🚚 Your order has been shipped! Track it with us.",
        delivered: "🎉 Your order has been delivered! Enjoy your purchase.",
      };

      const msg = `Forgiven Shopping Centre\n\nOrder #${orderId.slice(0, 8)}\n${statusMessages[status] || `Status updated: ${status}`}\n\nQuestions? Reply here!`;
      await sendWhatsApp(phone, msg);

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
