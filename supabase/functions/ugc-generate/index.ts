import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { action, gender, ethnicity, setting, script, avatarUrl, productName, productImages, provider } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    if (action === "generate-avatar") {
      const settingDescriptions: Record<string, string> = {
        studio: "in a clean, well-lit photography studio with soft lighting",
        bedroom: "in a cozy, aesthetic bedroom setting",
        outdoor: "in a beautiful outdoor setting with natural light",
        office: "in a modern, stylish office space",
        fashion_store: "in a trendy fashion boutique with clothing displays",
      };

      const prompt = `Generate a photorealistic portrait of a ${ethnicity} ${gender} fashion influencer/content creator ${settingDescriptions[setting] || "in a studio"}. The person should look approachable, stylish, and authentic. They should be wearing trendy casual clothing. The image should look like a high-quality UGC video thumbnail. On a clean background suitable for video content.`;

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3.1-flash-image-preview",
          messages: [{ role: "user", content: prompt }],
          modalities: ["image", "text"],
        }),
      });

      if (!response.ok) {
        const t = await response.text();
        console.error("Avatar generation error:", response.status, t);
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limited. Please try again shortly." }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (response.status === 402) {
          return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        throw new Error("Avatar generation failed");
      }

      const data = await response.json();
      const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

      return new Response(
        JSON.stringify({ success: true, imageUrl }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "generate-video") {
      const useFal = provider !== "lovable-ai";

      // Try fal.ai first (if requested and key exists)
      if (useFal) {
        const FAL_API_KEY = Deno.env.get("FAL_API_KEY");
        if (FAL_API_KEY) {
          const videoPrompt = `UGC-style product review video. A content creator presents and reviews "${productName}". Script: ${script?.slice(0, 500)}. Style: authentic, casual, well-lit, vertical format suitable for social media.`;

          const falResponse = await fetch("https://queue.fal.run/fal-ai/veo2", {
            method: "POST",
            headers: {
              Authorization: `Key ${FAL_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              prompt: videoPrompt,
              aspect_ratio: "9:16",
              duration: "8s",
            }),
          });

          if (falResponse.ok) {
            const falData = await falResponse.json();
            const videoUrl = falData.video?.url || falData.request_id;
            return new Response(
              JSON.stringify({ success: true, videoUrl, requestId: falData.request_id, provider: "fal" }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

          const errText = await falResponse.text();
          console.error("fal.ai error:", falResponse.status, errText);

          if (falResponse.status === 401) {
            return new Response(
              JSON.stringify({ error: "fal.ai API key is invalid. Please update FAL_API_KEY." }),
              { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

          // For billing/balance issues, fall through to Lovable AI fallback
          console.log("fal.ai unavailable, falling back to Lovable AI storyboard generation");
        }
      }

      // Lovable AI fallback: Generate a cinematic storyboard frame
      const storyboardPrompt = `Create a cinematic, high-quality UGC-style product marketing image for "${productName}". 
The image should look like a professional video thumbnail or key frame from a product review video.
Show a stylish content creator holding or presenting the product in a well-lit setting.
The composition should feel like a paused moment from a premium social media video ad.
Include text overlay effect that says "${productName}" in elegant typography.
Style: vertical 9:16 ratio, cinematic lighting, shallow depth of field, Instagram-worthy.
On a clean background.`;

      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3.1-flash-image-preview",
          messages: [{ role: "user", content: storyboardPrompt }],
          modalities: ["image", "text"],
        }),
      });

      if (!aiResponse.ok) {
        const t = await aiResponse.text();
        console.error("Lovable AI storyboard error:", aiResponse.status, t);
        if (aiResponse.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limited. Please try again shortly." }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (aiResponse.status === 402) {
          return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds in Settings → Workspace → Usage." }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        throw new Error("AI storyboard generation failed");
      }

      const aiData = await aiResponse.json();
      const storyboardUrl = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

      if (!storyboardUrl) {
        throw new Error("AI did not return a storyboard image");
      }

      return new Response(
        JSON.stringify({
          success: true,
          storyboardUrl,
          provider: "lovable-ai",
          message: "Generated an AI storyboard frame. For full video generation, top up your fal.ai balance.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (e) {
    console.error("UGC error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
