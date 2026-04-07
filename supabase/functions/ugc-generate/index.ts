import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function aiHeaders(apiKey: string) {
  return { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" };
}

// Build multimodal content array with optional images
function buildContent(text: string, imageUrls: string[] = []): any {
  if (imageUrls.length === 0) return text;
  const parts: any[] = [{ type: "text", text }];
  for (const url of imageUrls) {
    if (url) parts.push({ type: "image_url", image_url: { url } });
  }
  return parts;
}

async function callAI(apiKey: string, prompt: string | any[], model = "google/gemini-3.1-flash-image-preview", wantImage = true) {
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
      const { gender, ethnicity, setting, productName, productImageUrl, avatarImageBase64 } = body;

      const settingDescriptions: Record<string, string> = {
        studio: "in a clean, well-lit photography studio with soft lighting",
        bedroom: "in a cozy, aesthetic bedroom setting",
        outdoor: "in a beautiful outdoor setting with natural light",
        office: "in a modern, stylish office space",
        fashion_store: "in a trendy fashion boutique with clothing displays",
      };

      let prompt = `Generate a photorealistic portrait of a ${ethnicity} ${gender} fashion influencer/content creator ${settingDescriptions[setting] || "in a studio"}.`;

      if (productName) {
        prompt += ` They are actively holding, wearing, or showcasing a product called "${productName}". The product MUST be clearly visible in the image — this is critical.`;
      }

      prompt += ` The person should look approachable, stylish, and authentic. The image should look like a high-quality UGC video thumbnail. Vertical 9:16 framing.`;

      // Include product image for visual reference
      const images: string[] = [];
      if (productImageUrl) images.push(productImageUrl);
      if (avatarImageBase64) {
        // If user uploaded their own face, instruct AI to use it as reference
        prompt = `CRITICAL: Use the provided reference photo as the EXACT person/face for this image. Generate the SAME person ${settingDescriptions[setting] || "in a studio"}.`;
        if (productName) prompt += ` They are holding/wearing/showcasing "${productName}" — the product MUST be clearly visible.`;
        prompt += ` Photorealistic, UGC-style, vertical 9:16.`;
        images.push(avatarImageBase64);
      }

      const content = buildContent(prompt, images);
      const data = await callAI(LOVABLE_API_KEY, content);
      const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

      return new Response(
        JSON.stringify({ success: true, imageUrl }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── GENERATE MULTI-FRAME STORYBOARD ───
    if (action === "generate-storyboard") {
      const { productName, productImageUrl, avatarDescription, avatarImageUrl, script, frameCount = 4 } = body;

      const frames: Array<{ frame: number; imageUrl: string; scene: string }> = [];

      const scenes = [
        { scene: "Hook - Creator holds up the product excitedly, showing it to camera", camera: "close-up", expression: "excited" },
        { scene: "Showcase - Creator shows product details, turning it to show different angles", camera: "medium shot", expression: "confident" },
        { scene: "Benefits - Creator demonstrates the product, showing how it looks/works when worn or used", camera: "wide shot", expression: "happy" },
        { scene: "CTA - Creator holds product close, persuasive call to action", camera: "close-up", expression: "friendly" },
      ];
      if (frameCount >= 5) scenes.push({ scene: "Lifestyle - Product in use in a real-life setting, styled outfit or ensemble", camera: "wide shot", expression: "natural" });
      if (frameCount >= 6) scenes.push({ scene: "Final - Creator with product, confident pose, brand energy", camera: "medium close-up", expression: "smiling" });

      const actualFrames = scenes.slice(0, frameCount);

      for (let i = 0; i < actualFrames.length; i++) {
        const s = actualFrames[i];

        let framePrompt = `CRITICAL CONSISTENCY RULES:
- Use the EXACT SAME person throughout: ${avatarDescription}
- The product is "${productName}" — show the EXACT SAME product in every frame
- The product MUST be clearly visible — the creator is holding, wearing, or showcasing it
- Do NOT invent new products or change the product appearance

Create frame ${i + 1} of a ${actualFrames.length}-frame UGC product video.

Scene: ${s.scene}
Camera: ${s.camera}
Expression: ${s.expression}

Style: Cinematic, vertical 9:16, Instagram/TikTok quality, natural lighting, shallow depth of field.`;

        // Build multimodal content with reference images
        const images: string[] = [];
        if (productImageUrl) images.push(productImageUrl);
        if (avatarImageUrl) {
          framePrompt += `\n\nCRITICAL: The person in this frame MUST look exactly like the reference avatar photo provided. Same face, same features.`;
          images.push(avatarImageUrl);
        }

        const content = buildContent(framePrompt, images);

        try {
          const data = await callAI(LOVABLE_API_KEY, content);
          const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
          if (imageUrl) {
            frames.push({ frame: i + 1, imageUrl, scene: s.scene });
          }
        } catch (err) {
          console.error(`Frame ${i + 1} failed:`, err);
        }

        if (i < actualFrames.length - 1) {
          await new Promise(r => setTimeout(r, 2000));
        }
      }

      if (frames.length === 0) {
        throw { status: 500, message: "Failed to generate any frames" };
      }

      return new Response(
        JSON.stringify({ success: true, frames, message: `Generated ${frames.length} frames` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── GENERATE SCRIPT ───
    if (action === "generate-script") {
      const { productName, productCategory, productPrice, currency, context } = body;

      const prompt = `You are a UGC content strategist for a fashion brand. Create a compelling 15-30 second short-form video script for "${productName}" (${productCategory}, ${currency} ${productPrice}).

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
      const { avatarDescription, avatarImageUrl, productName, productImageUrl, scene, camera, expression } = body;

      let prompt = `CONSISTENCY: Use EXACT person: ${avatarDescription}. Product: "${productName}" — MUST be clearly visible, held/worn by creator.

Scene: ${scene}
Camera: ${camera}
Expression: ${expression}

Style: Cinematic UGC, vertical 9:16, Instagram-quality, natural lighting.`;

      const images: string[] = [];
      if (productImageUrl) images.push(productImageUrl);
      if (avatarImageUrl) {
        prompt += `\nCRITICAL: Use the reference avatar photo — same face/features.`;
        images.push(avatarImageUrl);
      }

      const content = buildContent(prompt, images);
      const data = await callAI(LOVABLE_API_KEY, content);
      const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

      return new Response(
        JSON.stringify({ success: true, imageUrl }),
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
