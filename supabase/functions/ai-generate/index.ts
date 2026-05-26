import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const QWEN_API_URL = "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions";
const QWEN_MODEL = "qwen-plus";

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { type, productName, productCategory, productPrice, currency, context } = await req.json();
    const QWEN_API_KEY = Deno.env.get("QWEN_API_KEY");
    if (!QWEN_API_KEY) throw new Error("QWEN_API_KEY is not configured");

    let systemPrompt = "";
    let userPrompt = "";

    switch (type) {
      case "product-description":
        systemPrompt = "You are a luxury fashion copywriter & social media manager for Forgiven Shopping Centre, a premium fashion & lifestyle brand in Malawi. Write a compelling product description containing two distinct sections: first, a professional and elegant E-commerce Product Description highlighting quality, style, and value (2-3 sentences); second, a highly engaging and trendy Social Media Post version featuring emojis and hashtags.";
        userPrompt = `Write a compelling description for "${productName}" in category "${productCategory}", priced at ${currency} ${productPrice}. Format the output exactly like this:

E-commerce Description:
[Your elegant product description here]

Social Media Post:
[Your engaging social media post here with emojis and hashtags]`;
        break;
      case "social-post":
        systemPrompt = "You are a social media manager for Forgiven Shopping Centre. Create engaging, trendy social media posts with emojis and hashtags. Keep posts concise and attention-grabbing.";
        userPrompt = `Create a social media post for: "${productName}" (${productCategory}) at ${currency} ${productPrice}. ${context || ""}`;
        break;
      case "campaign":
        systemPrompt = "You are a marketing strategist for Forgiven Shopping Centre. Create campaign ideas with catchy headlines, target audience, and key messages.";
        userPrompt = `Create a marketing campaign concept for: ${context || productName}`;
        break;
      case "business-insight":
        systemPrompt = "You are an AI business analyst for Forgiven Shopping Centre, a fashion brand in Malawi. Provide actionable insights, recommendations, and strategies based on the data provided. Be specific and data-driven.";
        userPrompt = context || "Provide general business insights and recommendations.";
        break;
      case "chat":
        systemPrompt = "You are the AI business assistant for Forgiven Shopping Centre, a fashion & lifestyle brand in Malawi. You help with business strategy, product recommendations, marketing ideas, inventory management, and customer engagement. Be concise, professional, and actionable.";
        userPrompt = context || "Hello";
        break;
      case "profit-insights":
        systemPrompt = "You are a senior AI business strategist for Forgiven Shopping Centre in Malawi. Analyze the provided profit metrics (Revenue, Base Profit, Surplus) in MWK currency and provide exactly 2 distinct, highly strategic business insights. Format all currency figures using 'MWK' (e.g., MWK 183,281.08) and never use '$' or 'USD'. Each insight must be a JSON object in this format: { \"title\": \"...\", \"content\": \"...\", \"type\": \"positive\" | \"warning\" }. Return ONLY a JSON array containing these 2 objects.";
        userPrompt = `Metrics Analysis Request: ${context}`;
        break;
      default:
        throw new Error(`Unknown content type: ${type}`);
    }

    const response = await fetch(QWEN_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${QWEN_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: QWEN_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Qwen API error:", response.status, errorText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds to your Qwen account.", fallback: true }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI generation failed");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    return new Response(
      JSON.stringify({ success: true, content }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
