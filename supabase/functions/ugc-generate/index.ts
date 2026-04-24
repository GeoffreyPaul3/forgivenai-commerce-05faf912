import { createClient } from "https://esm.sh/@supabase/supabase-js@2.40.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
  const body: any = {
    model: "qwen-image-plus",
    input: { prompt },
    parameters: { size: "720*1280", n: 1 }
  };

  if (refImageUrl) {
    body.input.ref_img = refImageUrl;
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
      errorMessage = errorJson.message || errorJson.code || errorMessage;
      console.error("Parsed Image AI Error:", errorJson);
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

  let attempts = 0;
  const maxAttempts = 30;
  while (attempts < maxAttempts) {
    attempts++;
    await new Promise(r => setTimeout(r, 2000));

    const pollRes = await fetch(`https://dashscope-intl.aliyuncs.com/api/v1/tasks/${taskId}`, {
      headers: aiHeaders(apiKey),
    });

    if (!pollRes.ok) {
      console.error(`Polling error (${pollRes.status}) for task ${taskId}`);
      continue;
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

async function persistImage(supabaseClient: any, imageUrl: string, folder: string) {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error(`Failed to fetch image from AI provider: ${response.statusText}`);
    const blob = await response.blob();
    const fileName = `${folder}/${crypto.randomUUID()}.png`;

    const { data: uploadData, error: uploadError } = await supabaseClient.storage
      .from("ugc-assets")
      .upload(fileName, blob, { contentType: "image/png", upsert: true });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return imageUrl;
    }

    const { data: { publicUrl } } = supabaseClient.storage.from("ugc-assets").getPublicUrl(fileName);
    return publicUrl;
  } catch (err) {
    console.error("Persist image error:", err);
    return imageUrl;
  }
}

async function callTTS(apiKey: string, text: string, voice = "sambert-camila-v1") {
  const url = "https://dashscope-intl.aliyuncs.com/api/v1/services/audio/tts/generation-sync";
  const res = await fetch(url, {
    method: "POST",
    headers: {
      ...aiHeaders(apiKey),
      "X-DashScope-Data-Type": "audio"
    },
    body: JSON.stringify({
      model: voice,
      input: { text },
      parameters: { format: "mp3", sample_rate: 16000 }
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    console.error("TTS error:", res.status, t);
    throw new Error(`TTS generation failed: ${res.status}`);
  }

  return await res.blob();
}

async function persistAudio(supabaseClient: any, audioBlob: Blob, folder: string) {
  try {
    const fileName = `${folder}/${crypto.randomUUID()}.mp3`;
    const { data: uploadData, error: uploadError } = await supabaseClient.storage
      .from("ugc-assets")
      .upload(fileName, audioBlob, { contentType: "audio/mpeg", upsert: true });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabaseClient.storage.from("ugc-assets").getPublicUrl(fileName);
    return publicUrl;
  } catch (err) {
    console.error("Persist audio error:", err);
    throw err;
  }
}

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

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

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const referenceImage = body.avatarImageUrl || body.avatarImageBase64;

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
      const persistedUrl = await persistImage(supabase, imageUrl, "avatars");

      return new Response(
        JSON.stringify({ success: true, imageUrl: persistedUrl }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "generate-storyboard") {
      const { productName, productImageUrl, avatarDescription, avatarImageUrl, frameCount = 4 } = body;

      const frames: Array<{ frame: number; imageUrl: string; scene: string }> = [];
      const identityLock = `STRICT IDENTITY & PRODUCT LOCK:
- PERSON: ${avatarDescription}
- PRODUCT: "${productName}"
- PRODUCT IMAGE REFERENCE: ${productImageUrl || "N/A"}
- Maintain consistent facial features and EXACT product design across all frames.`;

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
Requirement: High fidelity to product design from ${productImageUrl}.
Style: Cinematic UGC, vertical 9:16, natural lighting, consistent with previous frames.`;

        try {
          const imageUrl = await callImageAI(QWEN_API_KEY, framePrompt, referenceImage);
          if (imageUrl) {
            const persistedUrl = await persistImage(supabase, imageUrl, "frames");
            frames.push({ frame: i + 1, imageUrl: persistedUrl, scene: s.scene });
          }
        } catch (err) {
          console.error(`Frame ${i + 1} failed:`, err);
        }

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

    if (action === "generate-frame") {
      const { productName, avatarDescription, avatarImageUrl, scene, camera, expression } = body;
      const identityLock = buildIdentityLock(avatarDescription, productName);
      const framePrompt = `${identityLock}
Scene: ${scene}
Camera: ${camera}
Expression: ${expression || "natural"}
Style: Cinematic UGC, vertical 9:16, natural lighting.`;

      const imageUrl = await callImageAI(QWEN_API_KEY, framePrompt, referenceImage);
      const persistedUrl = await persistImage(supabase, imageUrl, "frames");

      return new Response(
        JSON.stringify({ success: true, imageUrl: persistedUrl }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "generate-campaign-shot") {
      const { influencer, product, style, scene } = body;
      const productImageUrl = product.images?.[0] || "";
      const influencerImageUrl = influencer.avatar_url || "";
      
      const prompt = `REALITY OVER FICTION — 100% PRODUCT FIDELITY:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. PRODUCT LOCK: The model MUST wear the EXACT item from this image: ${productImageUrl}
   - NO hallucinations. NO generic clothes. 
   - Replicate the EXACT design, pattern, fabric, and color (if it's black, it must be the same black).
   - The "${product.name}" is the focal point.

2. IDENTITY LOCK: The model is ${influencer.name} (${influencer.ethnicity} ${influencer.gender}, ${influencer.body_type || "tall editorial"}).
   - Use this face reference: ${influencerImageUrl}
   - Maintain consistent facial features and skin tone.

3. SETTING: ${scene.replace("_", " ")}
4. STYLE: ${style.replace("_", " ")} - High-end fashion campaign.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Composition: 9:16 Vertical, professional lighting.
Quality: 8K, Photorealistic, sharp focus, natural textures.
NO: Text, watermarks, distorted hands, blurry face, fictional clothing.`;

      // Use the PRODUCT as the primary reference image for the AI synthesis engine
      // This ensures the clothes are the "source of truth"
      const imageUrl = await callImageAI(QWEN_API_KEY, prompt, productImageUrl);
      const persistedUrl = await persistImage(supabase, imageUrl, "campaigns");

      return new Response(
        JSON.stringify({ success: true, imageUrl: persistedUrl }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

    if (action === "generate-tts") {
      const { text, voice } = body;
      if (!text) throw { status: 400, message: "Text is required for TTS" };

      const audioBlob = await callTTS(QWEN_API_KEY, text, voice);
      const audioUrl = await persistAudio(supabase, audioBlob, "audio");

      return new Response(
        JSON.stringify({ success: true, audioUrl }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw { status: 400, message: `Unknown action: ${action}` };
  } catch (e: any) {
    console.error("UGC error details:", e);
    const status = e?.status || 500;
    const message = e?.message || "An unexpected error occurred in the AI generator";
    
    return new Response(
      JSON.stringify({ error: message, details: e instanceof Error ? e.stack : undefined }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
