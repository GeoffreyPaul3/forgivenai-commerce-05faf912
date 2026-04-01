import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function aiHeaders(apiKey: string) {
  return { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" };
}

async function callAI(apiKey: string, prompt: string, model = "google/gemini-3.1-flash-image-preview", wantImage = true) {
  const body: Record<string, unknown> = {
    model,
    messages: [{ role: "user", content: prompt }],
  };
  if (wantImage) body.modalities = ["image", "text"];

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: aiHeaders(apiKey),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const t = await res.text();
    console.error("AI error:", res.status, t);
    if (res.status === 429) throw { status: 429, message: "Rate limited. Please try again shortly." };
    if (res.status === 402) throw { status: 402, message: "AI credits exhausted. Please add funds." };
    throw { status: 500, message: "AI generation failed" };
  }

  return await res.json();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { action } = body;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw { status: 500, message: "LOVABLE_API_KEY is not configured" };

    // ─── GENERATE AVATAR ───
    if (action === "generate-avatar") {
      const { gender, ethnicity, setting, productName, productImage } = body;

      const settingDescriptions: Record<string, string> = {
        studio: "in a clean, well-lit photography studio with soft lighting",
        bedroom: "in a cozy, aesthetic bedroom setting",
        outdoor: "in a beautiful outdoor setting with natural light",
        office: "in a modern, stylish office space",
        fashion_store: "in a trendy fashion boutique with clothing displays",
      };

      let prompt = `Generate a photorealistic portrait of a ${ethnicity} ${gender} fashion influencer/content creator ${settingDescriptions[setting] || "in a studio"}. The person should look approachable, stylish, and authentic. They should be wearing trendy casual clothing. The image should look like a high-quality UGC video thumbnail. On a clean background suitable for video content.`;

      // If product context provided, include it for consistency
      if (productName) {
        prompt += ` They are presenting a product called "${productName}".`;
      }

      const data = await callAI(LOVABLE_API_KEY, prompt);
      const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

      return new Response(
        JSON.stringify({ success: true, imageUrl }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── GENERATE MULTI-FRAME STORYBOARD ───
    if (action === "generate-storyboard") {
      const { productName, productImage, avatarDescription, script, frameCount = 4 } = body;

      // Generate frames sequentially with locked consistency
      const frames: Array<{ frame: number; imageUrl: string; scene: string }> = [];

      // Parse script into scenes
      const scenes = [
        { scene: "Hook - Content creator holds up the product excitedly, looking directly at camera", camera: "close-up", expression: "excited" },
        { scene: "Showcase - Creator shows the product details, turning it to show different angles", camera: "medium shot", expression: "confident" },
        { scene: "Benefits - Creator demonstrates the product, showing how it looks/works", camera: "wide shot", expression: "happy" },
        { scene: "CTA - Creator holds product close, gives a persuasive call to action", camera: "close-up", expression: "friendly" },
      ];

      // Add extra frames if requested
      if (frameCount >= 5) scenes.push({ scene: "Lifestyle - Product in use in a real-life setting", camera: "wide shot", expression: "natural" });
      if (frameCount >= 6) scenes.push({ scene: "Final - Creator with product, brand overlay space", camera: "medium close-up", expression: "smiling" });

      const actualFrames = scenes.slice(0, frameCount);

      for (let i = 0; i < actualFrames.length; i++) {
        const s = actualFrames[i];
        const framePrompt = `CRITICAL CONSISTENCY RULES:
- Use the EXACT SAME person throughout: ${avatarDescription}
- The product is "${productName}" - show the EXACT same product in every frame
${productImage ? `- Reference product appearance from this context` : ""}

Create frame ${i + 1} of a ${actualFrames.length}-frame UGC product video storyboard.

Scene: ${s.scene}
Camera: ${s.camera}
Expression: ${s.expression}

Style: Cinematic, vertical 9:16, Instagram-quality, natural lighting, shallow depth of field.
The creator should be ${avatarDescription}.
On a clean background.`;

        try {
          const data = await callAI(LOVABLE_API_KEY, framePrompt);
          const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
          if (imageUrl) {
            frames.push({ frame: i + 1, imageUrl, scene: s.scene });
          }
        } catch (err) {
          console.error(`Frame ${i + 1} failed:`, err);
          // Continue with remaining frames
        }

        // Small delay between frames to avoid rate limiting
        if (i < actualFrames.length - 1) {
          await new Promise(r => setTimeout(r, 1500));
        }
      }

      if (frames.length === 0) {
        throw { status: 500, message: "Failed to generate any storyboard frames" };
      }

      return new Response(
        JSON.stringify({
          success: true,
          frames,
          provider: "lovable-ai",
          message: `Generated ${frames.length} storyboard frames`,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── GENERATE SCRIPT (structured) ───
    if (action === "generate-script") {
      const { productName, productCategory, productPrice, currency, context } = body;

      const prompt = `You are a UGC content strategist. Create a 15-30 second short-form video script for "${productName}" (${productCategory}, ${currency} ${productPrice}).

${context ? `Additional context: ${context}` : ""}

Return ONLY valid JSON (no markdown, no code blocks) in this exact format:
{
  "title": "Script title",
  "hook": "First 2 seconds - scroll stopping opening line",
  "scenes": [
    {
      "scene": 1,
      "duration": "0:00-0:03",
      "direction": "Camera direction",
      "dialogue": "What the creator says",
      "text_overlay": "Optional text overlay"
    }
  ],
  "cta": "Call to action",
  "hashtags": ["tag1", "tag2"],
  "style": "clean_aesthetic|street_style|luxury_showcase|try_on"
}`;

      const data = await callAI(LOVABLE_API_KEY, prompt, "google/gemini-3-flash-preview", false);
      const content = data.choices?.[0]?.message?.content || "";

      // Try to parse as JSON
      let scriptData;
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        scriptData = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
      } catch {
        scriptData = null;
      }

      return new Response(
        JSON.stringify({ success: true, scriptData, rawContent: content }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── GENERATE SINGLE FRAME (for regeneration) ───
    if (action === "generate-frame") {
      const { avatarDescription, productName, scene, camera, expression } = body;

      const prompt = `CONSISTENCY: Use EXACT person: ${avatarDescription}. Product: "${productName}".

Scene: ${scene}
Camera: ${camera}
Expression: ${expression}

Style: Cinematic UGC, vertical 9:16, Instagram-quality, natural lighting.
On a clean background.`;

      const data = await callAI(LOVABLE_API_KEY, prompt);
      const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

      return new Response(
        JSON.stringify({ success: true, imageUrl }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── LEGACY: GENERATE VIDEO (kept for backward compat) ───
    if (action === "generate-video") {
      const { script, avatarUrl, productName, productImages, provider } = body;

      // Try fal.ai if requested
      if (provider !== "lovable-ai") {
        const FAL_API_KEY = Deno.env.get("FAL_API_KEY");
        if (FAL_API_KEY) {
          const videoPrompt = `UGC-style product review. Creator presents "${productName}". Script: ${script?.slice(0, 500)}. Authentic, casual, well-lit, vertical.`;
          const falRes = await fetch("https://queue.fal.run/fal-ai/veo2", {
            method: "POST",
            headers: { Authorization: `Key ${FAL_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({ prompt: videoPrompt, aspect_ratio: "9:16", duration: "8s" }),
          });

          if (falRes.ok) {
            const falData = await falRes.json();
            return new Response(
              JSON.stringify({ success: true, videoUrl: falData.video?.url, requestId: falData.request_id, provider: "fal" }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

          const errText = await falRes.text();
          console.error("fal.ai error:", falRes.status, errText);
          if (falRes.status === 401) {
            return new Response(JSON.stringify({ error: "fal.ai API key is invalid." }), {
              status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          console.log("fal.ai unavailable, falling back to storyboard");
        }
      }

      // Fallback: generate single storyboard frame
      const prompt = `Create a cinematic UGC-style product marketing image for "${productName}". Show a stylish content creator presenting the product. Vertical 9:16, cinematic lighting, Instagram-worthy. Include text overlay "${productName}". On a clean background.`;
      const data = await callAI(LOVABLE_API_KEY, prompt);
      const storyboardUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

      if (!storyboardUrl) throw { status: 500, message: "AI did not return an image" };

      return new Response(
        JSON.stringify({ success: true, storyboardUrl, provider: "lovable-ai", message: "Generated AI storyboard frame." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw { status: 400, message: `Unknown action: ${action}` };
  } catch (e: unknown) {
    console.error("UGC error:", e);
    const err = e as { status?: number; message?: string };
    const status = err?.status || 500;
    const message = err?.message || (e instanceof Error ? e.message : "Unknown error");
    return new Response(
      JSON.stringify({ error: message }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
