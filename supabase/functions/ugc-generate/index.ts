import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const QWEN_BASE_URL = "https://dashscope-intl.aliyuncs.com/compatible-mode/v1";
const WANX_API_URL = "https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis";

function aiHeaders(apiKey: string) {
  return { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" };
}

async function callTextAI(apiKey: string, prompt: string, model = "qwen-plus") {
  const res = await fetch(`${QWEN_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: aiHeaders(apiKey),
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    console.error("Text AI error:", res.status, t);
    if (res.status === 429) throw { status: 429, message: "Rate limited. Please try again shortly." };
    if (res.status === 402) throw { status: 402, message: "AI credits exhausted. Please add funds to your Alibaba account." };
    throw { status: 500, message: `Text generation failed (${res.status})` };
  }

  return await res.json();
}

async function callImageAI(apiKey: string, prompt: string, refImageUrl?: string) {
  // 1. Submit Image Generation Task (Wanx-v1)
  const body: any = {
    model: "wanx-v1",
    input: { prompt },
    parameters: { size: "720*1280", n: 1 }
  };

  if (refImageUrl) {
    body.input.ref_img = refImageUrl;
    // For image-to-image, sometimes specific parameters are needed
    // but we'll stick to basic prompt reference for now
  }

  console.log(`Submitting image task for prompt: ${prompt.substring(0, 100)}...`);

  const res = await fetch(WANX_API_URL, {
    method: "POST",
    headers: {
      ...aiHeaders(apiKey),
      "X-DashScope-Async": "enable"
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const t = await res.text();
    console.error("Image AI Submission error:", res.status, t);
    let errorMessage = `Image generation submission failed (${res.status})`;
    try {
      const errorJson = JSON.parse(t);
      errorMessage = errorJson.message || errorJson.error || errorMessage;
    } catch { /* use default */ }
    
    if (res.status === 402) throw { status: 402, message: "AI credits exhausted. Please add funds to your Alibaba account." };
    throw { status: 500, message: errorMessage };
  }

  const taskData = await res.json();
  const taskId = taskData.output?.task_id;

  if (!taskId) {
    console.error("No taskId returned from Alibaba:", taskData);
    throw { status: 500, message: "No task ID received from AI provider" };
  }

  // 2. Poll for Completion
  let attempts = 0;
  const maxAttempts = 30; // Increased to 1 min total
  while (attempts < maxAttempts) {
    attempts++;
    await new Promise(r => setTimeout(r, 2000));

    const pollRes = await fetch(`https://dashscope-intl.aliyuncs.com/api/v1/tasks/${taskId}`, {
      headers: aiHeaders(apiKey),
    });

    if (!pollRes.ok) {
      console.error(`Polling error (${pollRes.status}) for task ${taskId}`);
      continue; // Retry polling if temporary network issue
    }

    const pollData = await pollRes.json();
    const status = pollData.output?.task_status;

    if (status === "SUCCEEDED") {
      const url = pollData.output?.results?.[0]?.url;
      if (!url) throw new Error("Image task succeeded but no URL returned");
      return url;
    } else if (status === "FAILED") {
      console.error("Image task failed:", pollData);
      throw new Error(`Image task failed: ${pollData.output?.message || "Unknown error"}`);
    }
    
    console.log(`Polling task ${taskId}: ${status} (attempt ${attempts})...`);
  }

  throw new Error("Image generation timed out after polling.");
}

// ─── Identity Lock Prompt Builder ───
function buildIdentityLock(avatarDescription: string, productName: string): string {
  return `STRICT IDENTITY LOCK — USE CONTINUITY:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PERSON: ${avatarDescription}
- Maintain consistent facial features, skin tone, hair, and body type.
- approachable, stylish, and authentic fashion influencer.

PRODUCT: "${productName}"
- The EXACT product MUST be clearly visible — held, worn, or showcased by the creator.
- Forgiven Shopping Centre brand aesthetic.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { action } = body;
    const QWEN_API_KEY = Deno.env.get("QWEN_API_KEY");

    console.log(`UGC Action: ${action}`, { 
      action, 
      productName: body.productName,
      hasAvatarImageUrl: !!body.avatarImageUrl,
      hasAvatarBase64: !!body.avatarImageBase64
    });

    if (!QWEN_API_KEY) {
      throw { status: 500, message: "No AI API key configured (QWEN_API_KEY). Please set this in Supabase secrets." };
    }

    const referenceImage = body.avatarImageUrl || body.avatarImageBase64;

    // ─── GENERATE AVATAR ───
    if (action === "generate-avatar") {
      const { gender, ethnicity, setting, productName } = body;

      const settingDescriptions: Record<string, string> = {
        studio: "in a clean, well-lit photography studio",
        bedroom: "in a cozy, aesthetic bedroom",
        outdoor: "in a beautiful outdoor setting with natural light",
        office: "in a modern, stylish office",
        fashion_store: "in a trendy fashion boutique",
      };

      let prompt = `Photorealistic 9:16 vertical portrait of a ${ethnicity} ${gender} fashion content creator ${settingDescriptions[setting] || "in a studio"}.`;
      if (productName) {
        prompt += ` They are showcasing a product: "${productName}". The product must be clearly visible.`;
      }
      prompt += ` Approachable, stylish, high-quality UGC video thumbnail style.`;

      const imageUrl = await callImageAI(QWEN_API_KEY, prompt, referenceImage);

      return new Response(
        JSON.stringify({ success: true, imageUrl }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── GENERATE MULTI-FRAME STORYBOARD ───
    if (action === "generate-storyboard") {
      const { productName, avatarDescription, avatarImageUrl, frameCount = 4 } = body;

      const frames: Array<{ frame: number; imageUrl: string; scene: string }> = [];
      const identityLock = buildIdentityLock(avatarDescription, productName);

      const scenes = [
        { scene: "Hook - Creator holds up the product excitedly, showing it to camera", camera: "close-up" },
        { scene: "Showcase - Creator shows product details, turning it to show angles", camera: "medium shot" },
        { scene: "Benefits - Creator demonstrates the product in use", camera: "wide shot" },
        { scene: "CTA - Creator holds product close, persuasive closing", camera: "close-up" },
      ];

      const actualFrames = scenes.slice(0, Math.min(frameCount, scenes.length));

      for (let i = 0; i < actualFrames.length; i++) {
        const s = actualFrames[i];
        const framePrompt = `${identityLock}
Scene: ${s.scene}
Camera: ${s.camera}
Style: Cinematic UGC, vertical 9:16, natural lighting, consistent with previous frames.`;

        try {
          // If we have an avatar image, we use it as a reference
          const imageUrl = await callImageAI(QWEN_API_KEY, framePrompt, referenceImage);
          if (imageUrl) {
            frames.push({ frame: i + 1, imageUrl, scene: s.scene });
          }
        } catch (err) {
          console.error(`Frame ${i + 1} failed:`, err);
        }

        // Delay to avoid overwhelming task rate limits
        if (i < actualFrames.length - 1) {
          await new Promise(r => setTimeout(r, 1000));
        }
      }

      if (frames.length === 0) {
        throw { status: 500, message: "Failed to generate any storyboard frames. Check AI provider logs." };
      }

      return new Response(
        JSON.stringify({ success: true, frames, message: `Generated ${frames.length} frames` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── GENERATE SINGLE FRAME (e.g. Regeneration) ───
    if (action === "generate-frame") {
      const { productName, avatarDescription, avatarImageUrl, scene, camera, expression } = body;
      
      const identityLock = buildIdentityLock(avatarDescription, productName);
      const framePrompt = `${identityLock}
Scene: ${scene}
Camera: ${camera}
Expression: ${expression || "natural"}
Style: Cinematic UGC, vertical 9:16, natural lighting.`;

      const imageUrl = await callImageAI(QWEN_API_KEY, framePrompt, referenceImage);

      return new Response(
        JSON.stringify({ success: true, imageUrl }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── GENERATE SCRIPT ───
    if (action === "generate-script") {
      const { productName, productCategory, productPrice, currency, context } = body;

      const prompt = `You are a UGC content strategist for Forgiven Shopping Centre. Create a compelling 15-30 second video script for "${productName}" (${productCategory}, ${currency} ${productPrice}).
${context ? `Additional context: ${context}` : ""}

Return ONLY valid JSON:
{
  "title": "Script title",
  "hook": "Opening line",
  "scenes": [
    {
      "scene": 1,
      "duration": "0:00-0:03",
      "direction": "Camera direction",
      "dialogue": "What's said",
      "text_overlay": "Overlay text"
    }
  ],
  "cta": "Call to action",
  "hashtags": ["tag1", "tag2"],
  "style": "aesthetic"
}`;

      const data = await callTextAI(QWEN_API_KEY, prompt);
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

    throw { status: 400, message: `Unknown action: ${action}` };
  } catch (e: unknown) {
    console.error("UGC error details:", e);
    const err = e as { status?: number; message?: string };
    const status = err?.status || 500;
    const message = err?.message || (e instanceof Error ? e.message : "An unexpected error occurred in the AI generator");
    
    return new Response(
      JSON.stringify({ error: message, details: e instanceof Error ? e.stack : undefined }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
