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

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID")!;
  const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN")!;
  const TWILIO_WHATSAPP_NUMBER = Deno.env.get("TWILIO_WHATSAPP_NUMBER")!;

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const payload = await req.json();
    console.log("Webhook payload received:", JSON.stringify(payload));

    const { record, type } = payload;

    // Only process new messages from the AI
    if (type !== "INSERT") {
      return new Response("Skipping non-INSERT event", { status: 200 });
    }

    if (record.role !== "ai") {
      return new Response("Skipping non-AI message", { status: 200 });
    }

    const { content: message, conversation_id } = record;

    if (!message || !conversation_id) {
      return new Response("Missing message or conversation ID", { status: 200 });
    }

    // --- 1. Fetch conversation to get phone number ---
    const { data: convo, error: convoError } = await supabase
      .from("conversations")
      .select("customer_phone")
      .eq("id", conversation_id)
      .single();

    if (convoError || !convo?.customer_phone) {
      console.error("Error fetching conversation:", convoError);
      return new Response("Could not find conversation", { status: 200 });
    }

    const phone_number = convo.customer_phone;

    // --- 2. Fetch available products with images ---
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("id, name, price, description, images")
      .eq("status", "active");

    if (productsError) throw productsError;
    if (!products || products.length === 0) {
      return new Response("No products found", { status: 200 });
    }

    // --- 3. Detect requested images using {{Product Name}} tags ---
    const imageTagRegex = /\{\{([^}]+)\}\}/g;
    const requestedNames: string[] = [];
    let match;
    while ((match = imageTagRegex.exec(message)) !== null) {
      requestedNames.push(match[1].trim().toLowerCase());
    }

    if (requestedNames.length === 0) {
      console.log("No {{Product Name}} tags detected in message.");
      return new Response("No image tags detected", { status: 200 });
    }

    const detectedProducts: any[] = [];
    for (const name of requestedNames) {
      const product = products.find(p => p.name.toLowerCase() === name);
      if (product) {
        if (!detectedProducts.some(p => p.id === product.id)) {
          detectedProducts.push(product);
        }
      } else {
        console.warn(`AI requested image for "${name}" but it was not found in active products.`);
      }
      if (detectedProducts.length >= 3) break;
    }

    if (detectedProducts.length === 0) {
      console.log("No valid products found for requested tags.");
      return new Response("No valid products found", { status: 200 });
    }

    console.log(`Detected ${detectedProducts.length} products: ${detectedProducts.map(p => p.name).join(", ")}`);

    // --- 4. Send WhatsApp Media Messages via Twilio ---
    for (const product of detectedProducts) {
      const imageUrl = product.images?.[0];
      
      if (!imageUrl || !imageUrl.startsWith('http')) {
        console.warn(`Skipping image for ${product.name}: Invalid or missing URL ("${imageUrl || 'empty'}")`);
        continue;
      }

      console.log(`Sending image for ${product.name} to ${phone_number}. URL: ${imageUrl}`);
      
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
      const params = new URLSearchParams();
      params.append("To", `whatsapp:${phone_number}`);
      params.append("From", `whatsapp:${TWILIO_WHATSAPP_NUMBER}`);
      params.append("Body", `✨ *${product.name}*`);
      params.append("MediaUrl", imageUrl);

      try {
        const response = await fetch(twilioUrl, {
          method: "POST",
          headers: {
            "Authorization": "Basic " + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`),
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: params,
        });

        const resultText = await response.text();
        if (!response.ok) {
          console.error(`Twilio Error for ${product.name}: ${resultText}`);
        } else {
          console.log(`Successfully sent image for ${product.name}.`);
        }
      } catch (twilioErr: any) {
        console.error(`Fetch error calling Twilio for ${product.name}:`, twilioErr.message);
      }

      // Small delay between multiple images
      if (detectedProducts.length > 1) {
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }

    return new Response(JSON.stringify({ success: true, count: detectedProducts.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    console.error("Critical error in product-image-response:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
