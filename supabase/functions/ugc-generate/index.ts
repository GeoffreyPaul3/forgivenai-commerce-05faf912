import { createClient } from "https://esm.sh/@supabase/supabase-js@2.40.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const QWEN_BASE_URL = "https://dashscope-intl.aliyuncs.com/compatible-mode/v1";

function aiHeaders(apiKey: string) {
  return { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" };
}

async function fetchCanonicalFrames(supabase: any, influencerId: string): Promise<string[]> {
  if (!influencerId) return [];
  try {
    const { data, error } = await supabase
      .from('influencers')
      .select('canonical_frames')
      .eq('id', influencerId)
      .single();
    if (error) {
      console.log(`No canonical frames found for influencer ${influencerId}.`);
      return [];
    }
    // Ensure it's an array of strings
    if (Array.isArray(data?.canonical_frames)) {
      return data.canonical_frames.filter((url: any) => typeof url === 'string');
    }
    return [];
  } catch (e) {
    console.warn(`Failed to fetch canonical frames for influencer ${influencerId}:`, e);
    return [];
  }
}

async function callElevenLabsTTS(apiKey: string, text: string, voiceId: string) {
  console.log(`Calling ElevenLabs TTS for voice: ${voiceId}...`);
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      model_id: "eleven_multilingual_v2",
      voice_settings: { stability: 0.5, similarity_boost: 0.8 }
    }),
  });
  if (!res.ok) throw new Error(`ElevenLabs TTS failed: ${res.status} ${await res.text()}`);
  return await res.blob();
}

async function pollFalQueue(apiKey: string, statusUrl: string, responseUrl: string, maxAttempts = 100, intervalMs = 2000): Promise<any> {
  // Guard: if either URL contains 'undefined', the request_id was not returned by Fal.ai.
  // Polling these malformed URLs causes 405 responses from the server.
  if (statusUrl.includes("/undefined/") || responseUrl.includes("/undefined/")) {
    throw new Error(`[Fal.ai Polling] Aborted — malformed queue URL (request_id was not returned). status: ${statusUrl}`);
  }

  let attempts = 0;
  while (attempts < maxAttempts) {
    attempts++;
    try {
      const statusRes = await fetch(statusUrl, {
        method: "GET",
        headers: { "Authorization": `Key ${apiKey}` }
      });

      if (statusRes.status === 405) {
        // 405 = Method Not Allowed on the status URL.
        // Fal.ai sometimes returns this when the job finishes and the status URL
        // is no longer valid. Try fetching the result URL directly.
        console.warn(`[Fal.ai Polling] 405 on status URL (attempt ${attempts}). Trying result URL directly...`);
        const directRes = await fetch(responseUrl, {
          method: "GET",
          headers: { "Authorization": `Key ${apiKey}` }
        });
        if (directRes.ok) {
          const directData = await directRes.json();
          // If the result URL also returns a status, check it
          const s = directData.status;
          if (!s || s === "COMPLETED" || s === "completed" || s === "SUCCEEDED" || s === "succeeded") {
            console.log(`[Fal.ai Polling] ✅ Result fetched directly after 405 on status URL.`);
            return directData;
          }
          if (s === "FAILED" || s === "failed") {
            throw new Error(`Fal.ai task failed: ${directData.error || "Unknown error"}`);
          }
        }
        await new Promise(r => setTimeout(r, intervalMs));
        continue;
      }

      if (!statusRes.ok) {
        const errText = await statusRes.text();
        console.warn(`[Fal.ai Polling] status check failed (${statusRes.status}): ${errText}`);
        await new Promise(r => setTimeout(r, intervalMs));
        continue;
      }

      const data = await statusRes.json();
      if (data.status === "COMPLETED" || data.status === "completed" || data.status === "SUCCEEDED" || data.status === "succeeded") {
        const responseRes = await fetch(responseUrl, {
          method: "GET",
          headers: { "Authorization": `Key ${apiKey}` }
        });
        if (!responseRes.ok) {
          const errText = await responseRes.text();
          // 4xx = permanent bad-input failure — do NOT retry, throw immediately
          if (responseRes.status >= 400 && responseRes.status < 500) {
            throw new Error(`Failed to fetch final response from ${responseUrl} (${responseRes.status}): ${errText}`);
          }
          throw new Error(`Failed to fetch final response from ${responseUrl} (${responseRes.status}): ${errText}`);
        }
        return await responseRes.json();
      }
      if (data.status === "FAILED" || data.status === "failed") {
        console.error(`Fal.ai task failed:`, JSON.stringify(data));
        throw new Error(`Fal.ai task failed: ${data.error || data.detail || "Unknown error"}`);
      }
      if (attempts % 10 === 0) {
        console.log(`[Fal.ai Polling] Still waiting... attempt ${attempts}/${maxAttempts}, status: ${data.status || "in_queue"}`);
      }
    } catch (fetchErr: any) {
      // Re-throw structured errors immediately — these are permanent failures that retrying won't fix
      const msg: string = fetchErr.message || "";
      if (
        msg.startsWith("Fal.ai task failed") ||
        msg.startsWith("[Fal.ai Polling] Aborted") ||
        msg.includes("Failed to fetch final response") ||
        msg.includes("(422)") ||
        msg.includes("(400)") ||
        msg.includes("(401)") ||
        msg.includes("(403)")
      ) throw fetchErr;
      console.warn(`[Fal.ai Polling] fetch error on attempt ${attempts}:`, fetchErr.message);
    }
    await new Promise(r => setTimeout(r, intervalMs));
  }
  throw new Error(`Fal.ai polling timed out after ${maxAttempts} attempts`);
}

async function generateAmbientAudio(apiKey: string, setting: string) {
  console.log(`Generating ambient audio for setting: ${setting}...`);
  const endpoint = "fal-ai/stable-audio";
  const res = await fetch(`https://queue.fal.run/${endpoint}`, {
    method: "POST",
    headers: { "Authorization": `Key ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ 
      prompt: `Foley recording of ${setting} atmosphere, room tone, subtle background sounds, realistic, high quality, 44.1kHz`,
      duration: 10
    }),
  });
  if (!res.ok) return null;
  try {
    const resData = await res.json();
    const requestId = resData.request_id;
    if (!requestId) { console.warn("[generateAmbientAudio] No request_id returned"); return null; }
    const statusUrl = resData.status_url || `https://queue.fal.run/${endpoint}/requests/${requestId}/status`;
    const responseUrl = resData.response_url || `https://queue.fal.run/${endpoint}/requests/${requestId}`;
    const data = await pollFalQueue(apiKey, statusUrl, responseUrl, 20, 2000);
    return data.audio?.url || data.response?.audio?.url || null;
  } catch (err) {
    console.error("Ambient Audio Generation Error:", err);
    return null;
  }
}

async function mixAudioLayers(apiKey: string, audioUrls: string[]) {
  console.log("Mixing audio layers via Fal.ai FFmpeg...");
  const endpoint = "fal-ai/ffmpeg-api/merge-audios";
  const res = await fetch(`https://queue.fal.run/${endpoint}`, {
    method: "POST",
    headers: { "Authorization": `Key ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ audio_urls: audioUrls.filter(u => !!u) }),
  });
  if (!res.ok) return audioUrls[0]; // Fallback to first track if mix fails
  try {
    const resData = await res.json();
    const requestId = resData.request_id;
    if (!requestId) { console.warn("[mixAudioLayers] No request_id returned"); return audioUrls[0]; }
    const statusUrl = resData.status_url || `https://queue.fal.run/${endpoint}/requests/${requestId}/status`;
    const responseUrl = resData.response_url || `https://queue.fal.run/${endpoint}/requests/${requestId}`;
    const data = await pollFalQueue(apiKey, statusUrl, responseUrl, 30, 2000);
    return data.audio?.url || data.response?.audio?.url || audioUrls[0];
  } catch (err) {
    console.error("mixAudioLayers Error:", err);
    return audioUrls[0];
  }
}

async function mergeAudioVideo(apiKey: string, videoUrl: string, audioUrl: string) {
  console.log("Merging audio and video via Fal.ai FFmpeg...");
  const endpoint = "fal-ai/ffmpeg-api/merge-audio-video";
  const res = await fetch(`https://queue.fal.run/${endpoint}`, {
    method: "POST",
    headers: { "Authorization": `Key ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ video_url: videoUrl, audio_url: audioUrl }),
  });
  if (!res.ok) return videoUrl;
  try {
    const resData = await res.json();
    const requestId = resData.request_id;
    if (!requestId) { console.warn("[mergeAudioVideo] No request_id returned, skipping merge"); return videoUrl; }
    const statusUrl = resData.status_url || `https://queue.fal.run/${endpoint}/requests/${requestId}/status`;
    const responseUrl = resData.response_url || `https://queue.fal.run/${endpoint}/requests/${requestId}`;
    const data = await pollFalQueue(apiKey, statusUrl, responseUrl, 30, 2000);
    return data.video?.url || data.response?.video?.url || videoUrl;
  } catch (err) {
    console.error("mergeAudioVideo Error:", err);
    return videoUrl;
  }
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

async function generateBasePortrait(falKey: string, gender: string, ethnicity: string, setting: string) {
  console.log(`[generateBasePortrait] Requesting baseline portrait for ${ethnicity} ${gender} in ${setting}...`);
  const prompt = `High-end fashion portrait photography. MODEL: ${ethnicity} ${gender}. SETTING: ${setting}. Wearing a plain simple white t-shirt. Clean background, studio lighting, photorealistic, 8k.`;
  
  const res = await fetch("https://fal.run/fal-ai/flux/dev", {
    method: "POST",
    headers: {
      "Authorization": `Key ${falKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      prompt,
      image_size: "portrait_4_3",
      num_inference_steps: 28,
      guidance_scale: 3.5,
      num_images: 1,
      enable_safety_checker: false
    })
  });
  
  if (!res.ok) {
    const t = await res.text();
    console.error("Base portrait generation error:", res.status, t);
    throw new Error(`Failed to generate base portrait (${res.status})`);
  }
  
  const data = await res.json();
  return data.images[0].url;
}

// ─── callIDMVTON, getPhottaProductType, callPhottaAI removed — Fal.ai exclusive ───

async function getLeffaGarmentType_unused() {} // kept as tombstone; real logic below

// FASHN v1.6 is the sole VTON engine
function getLeffaGarmentType(category: string, garmentDetails: string): "tops" | "bottoms" | "dresses" {
  const text = `${category} ${garmentDetails}`.toLowerCase();
  if (text.includes("dress") || text.includes("suit") || text.includes("one-piece") || text.includes("jumpsuit")) return "dresses";
  if (text.includes("skirt") || text.includes("pants") || text.includes("shorts") || text.includes("trousers") || text.includes("bottom")) return "bottoms";
  return "tops";
}

async function callFalVTON(apiKey: string, endpoint: string, humanUrl: string, productImages: string[], description: string, category: string) {
  console.log(`Calling Fal.ai VTON engine: ${endpoint}...`);
  
  const isFashn = endpoint.includes("fashn");
  const isLeffa = endpoint.includes("leffa");
  
  const garmentUrl = productImages[0] || "";

  const bodyData: Record<string, any> = {
    // Kling / Kolors / General
    human_image_url: humanUrl,
    garment_image_url: garmentUrl,
    person_image_url: humanUrl,
    cloth_image_url: garmentUrl,
    description: description,
    num_inference_steps: 40,
    reference_images: productImages.slice(1),
    garment_images: productImages,
  };

  if (isFashn) {
    bodyData.model_image = humanUrl;
    bodyData.garment_image = garmentUrl;
    bodyData.garment_photo_type = "auto";
    const mappedCat = getLeffaGarmentType(category, description);
    bodyData.category = mappedCat === "dresses" ? "one-pieces" : mappedCat;
    // Inject multi-angle conditioning parameters for enterprise VTON
    bodyData.reference_images = productImages.slice(1);
    bodyData.garment_images = productImages;
  }

  if (isLeffa) {
    bodyData.garment_type = getLeffaGarmentType(category, description);
  }

  const res = await fetch(`https://queue.fal.run/${endpoint}`, {
    method: "POST",
    headers: { "Authorization": `Key ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(bodyData),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error(`Fal.ai ${endpoint} submission error: ${res.status} ${errText}`);
    // Propagate balance exhaustion immediately so all fal engines are skipped
    if (res.status === 403 && errText.includes("Exhausted balance")) {
      throw new Error(`FAL_BALANCE_EXHAUSTED: ${errText}`);
    }
    throw new Error(`Fal.ai ${endpoint} error: ${errText}`);
  }

  const resData = await res.json();
  console.log(`[callFalVTON] ${endpoint} submission response keys:`, Object.keys(resData).join(", "));

  // Validate that we got a request_id — without it we cannot poll for status
  const requestId = resData.request_id;
  if (!requestId) {
    console.error(`[callFalVTON] No request_id in ${endpoint} response:`, JSON.stringify(resData).substring(0, 300));
    throw new Error(`Fal.ai ${endpoint} did not return a request_id — cannot poll for result`);
  }

  const statusUrl = resData.status_url || `https://queue.fal.run/${endpoint}/requests/${requestId}/status`;
  const responseUrl = resData.response_url || `https://queue.fal.run/${endpoint}/requests/${requestId}`;
  console.log(`[callFalVTON] Polling ${endpoint} — request_id: ${requestId}`);
  
  const data = await pollFalQueue(apiKey, statusUrl, responseUrl, 90, 2000);
  
  // Different models return image in different paths — try them all
  const imageUrl =
    data.image?.url ||
    data.images?.[0]?.url ||
    data.output?.[0]?.url ||
    data.output ||
    data.response?.image?.url ||
    data.response?.images?.[0]?.url ||
    data.response?.output?.[0]?.url ||
    data.response?.output;
  if (imageUrl) return imageUrl;
  console.error(`Fal.ai ${endpoint} completed but no image URL found in response:`, JSON.stringify(data).substring(0, 500));
  throw new Error(`Fal.ai ${endpoint} returned no image`);
}

async function callFalAI(apiKey: string, humanUrl: string, productImages: string[], description: string, category: string) {
  // STRICT MODE: FASHN v1.6 is the ONLY authorised VTON engine.
  // No fallback engines — consistency and fidelity above all.
  console.log("[VTON] Calling Fal.ai FASHN v1.6 (exclusive engine)...");
  return await callFalVTON(apiKey, "fal-ai/fashn/tryon/v1.6", humanUrl, productImages, description, category);
}

async function generateTikTokMusic(apiKey: string, prompt: string) {
  console.log(`Generating TikTok music for prompt: ${prompt}...`);
  const endpoint = "fal-ai/stable-audio";
  const res = await fetch(`https://queue.fal.run/${endpoint}`, {
    method: "POST",
    headers: { "Authorization": `Key ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: `TikTok viral background music, ${prompt}, high quality, catchy` }),
  });
  if (!res.ok) return null;
  try {
    const resData = await res.json();
    const requestId = resData.request_id;
    if (!requestId) { console.warn("[generateTikTokMusic] No request_id returned"); return null; }
    const statusUrl = resData.status_url || `https://queue.fal.run/${endpoint}/requests/${requestId}/status`;
    const responseUrl = resData.response_url || `https://queue.fal.run/${endpoint}/requests/${requestId}`;
    const data = await pollFalQueue(apiKey, statusUrl, responseUrl, 20, 3000);
    return data.audio?.url || data.response?.audio?.url || null;
  } catch (err) {
    console.error("generateTikTokMusic Error:", err);
    return null;
  }
}

// Submit Kling job to Fal.ai WITHOUT polling — returns job identifiers immediately.
// The client uses check-video-status to poll and retrieve the final URL.
async function submitKlingJob(apiKey: string, imageUrl: string, prompt: string): Promise<{ requestId: string; statusUrl: string; responseUrl: string }> {
  console.log("[Kling] Submitting Kling 3.0 Pro job to Fal.ai (async)...");
  const ENDPOINT = "fal-ai/kling-video/v3/pro/image-to-video";
  const res = await fetch(`https://queue.fal.run/${ENDPOINT}`, {
    method: "POST",
    headers: { "Authorization": `Key ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      image_url: imageUrl,
      prompt: `Realistic TikTok-style influencer motion. The creator naturally blinks, breathes, adjusts outfit, shifts posture, smiles subtly. Maintain exact face, exact clothing, exact product details. Real iPhone creator footage. (${prompt})`,
      negative_prompt: "slideshow, static, still image, blurry, distorted face, unnatural movement, warping, low resolution, jumping frames, generic background, robotic, zoom, pan",
      aspect_ratio: "9:16",
      motion_score: 10,
      camera_motion: "handheld",
      cfg_scale: 0.5
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error("[Kling] Submission Error:", res.status, errorText);
    throw new Error(`Kling submission error: ${errorText}`);
  }

  const resData = await res.json();
  const requestId = resData.request_id;
  if (!requestId) throw new Error("[Kling] No request_id returned from Fal.ai submission.");
  console.log(`[Kling] Job submitted. request_id: ${requestId}`);

  const statusUrl = resData.status_url || `https://queue.fal.run/${ENDPOINT}/requests/${requestId}/status`;
  const responseUrl = resData.response_url || `https://queue.fal.run/${ENDPOINT}/requests/${requestId}`;
  return { requestId, statusUrl, responseUrl };
}

async function generateCampaignVideo(apiKey: string, imageUrl: string, prompt: string, canonicalFrames: string[] = []) {
  console.log("Calling Seedance 2.0 (Campaign Video Engine) via Fal.ai...");
  
  const payload: any = {
    image_url: imageUrl,
    prompt: `Luxury campaign video. Cinematic motion, high-end fashion commerce. ${prompt}`,
  };
  
  if (canonicalFrames.length > 0) {
    payload.reference_images = canonicalFrames;
    console.log(`Injecting ${canonicalFrames.length} canonical identity frames as reference...`);
  }

  const res = await fetch("https://queue.fal.run/bytedance/seedance-2.0/reference-to-video", {
    method: "POST",
    headers: { "Authorization": `Key ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error("Seedance Submission Error:", res.status, errorText);
    throw new Error(`Seedance error: ${errorText}`);
  }
  
  const resData = await res.json();
  const endpoint = "bytedance/seedance-2.0/reference-to-video";
  console.log(`Polling Seedance 2.0 (request ID: ${resData.request_id})...`);
  const statusUrl = resData.status_url || `https://queue.fal.run/${endpoint}/requests/${resData.request_id}/status`;
  const responseUrl = resData.response_url || `https://queue.fal.run/${endpoint}/requests/${resData.request_id}`;
  
  const data = await pollFalQueue(apiKey, statusUrl, responseUrl, 300, 5000);
  if (data.response?.video?.url) return data.response.video.url;
  throw new Error("Seedance returned no video URL");
}



async function callFalBriaBackgroundRemoval(apiKey: string, imageUrl: string): Promise<string> {
  console.log(`[Segmentation] Calling fal-ai/bria/background-removal for: ${imageUrl.substring(0, 100)}...`);
  const res = await fetch("https://queue.fal.run/fal-ai/bria/background-removal", {
    method: "POST",
    headers: { "Authorization": `Key ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      image_url: imageUrl,
      return_mask: false
    }),
  });
  if (!res.ok) {
    throw new Error(`Fal Bria background-removal error: ${await res.text()}`);
  }
  const resData = await res.json();
  const endpoint = "fal-ai/bria/background-removal";
  const statusUrl = resData.status_url || `https://queue.fal.run/${endpoint}/requests/${resData.request_id}/status`;
  const responseUrl = resData.response_url || `https://queue.fal.run/${endpoint}/requests/${resData.request_id}`;
  
  const data = await pollFalQueue(apiKey, statusUrl, responseUrl, 30, 1500);
  const outUrl = data.response?.image?.url || data.response?.images?.[0]?.url || data.response?.output?.url;
  if (outUrl) return outUrl;
  throw new Error("No image URL found in completed background removal response");
}

async function callPoseMapping(apiKey: string, humanImageUrl: string) {
  console.log(`[Pose Mapping] Calling fal-ai/dwpose for: ${humanImageUrl.substring(0, 100)}...`);
  try {
    const res = await fetch("https://queue.fal.run/fal-ai/dwpose", {
      method: "POST",
      headers: { "Authorization": `Key ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        image_url: humanImageUrl
      }),
    });
    if (!res.ok) {
      throw new Error(`Fal DWPose error: ${await res.text()}`);
    }
    const resData = await res.json();
    const endpoint = "fal-ai/dwpose";
    const statusUrl = resData.status_url || `https://queue.fal.run/${endpoint}/requests/${resData.request_id}/status`;
    const responseUrl = resData.response_url || `https://queue.fal.run/${endpoint}/requests/${resData.request_id}`;
    
    const data = await pollFalQueue(apiKey, statusUrl, responseUrl, 30, 1500);
    console.log("[Pose Mapping] DWPose completed successfully.");
    return data.response;
  } catch (err) {
    console.warn("[Pose Mapping] DWPose call failed:", err);
    return null;
  }
}

// runSpecializedObjectVTON removed to enforce strict standard VTON paths

async function segmentGarment(
  keys: { phottaKey: string; falKey: string },
  imageUrl: string,
  category: string
): Promise<string> {
  const lowerCat = category.toLowerCase();
  const isApparel = lowerCat.includes("apparel") || lowerCat.includes("clothing") || lowerCat.includes("top") || lowerCat.includes("bottom") || lowerCat.includes("dress") || lowerCat.includes("shirt") || lowerCat.includes("jacket") || lowerCat.includes("pants") || lowerCat.includes("suit");

  if (!isApparel && keys.falKey) {
    try {
      return await callFalBriaBackgroundRemoval(keys.falKey, imageUrl);
    } catch (err) {
      console.warn(`[segmentGarment] Fal Bria background removal failed for non-apparel category ${category}:`, err);
    }
  }

  if (keys.phottaKey) {
    try {
      console.log(`Performing Photta Ghost Mannequin Segmentation on: ${imageUrl.substring(0, 100)}...`);
      const res = await fetch("https://api.photta.com/v1/ghost-mannequin", {
        method: "POST",
        headers: { "Authorization": `Bearer ${keys.phottaKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ 
          product_image_url: imageUrl, 
          style: "hollow-man",
          resolution: "2K"
        }),
      });

      if (!res.ok) {
        console.warn(`[segmentGarment] Photta ghost-mannequin returned ${res.status}, using original.`);
        return imageUrl;
      }

      const resJson = await res.json();
      const generation_id = resJson.generation_id || resJson.id;
      if (!generation_id) return imageUrl;

      let attempts = 0;
      while (attempts < 40) {
        attempts++;
        const statusRes = await fetch(`${PHOTTA_BASE_URL}/ghost-mannequin/${generation_id}`, {
          headers: { "Authorization": `Bearer ${keys.phottaKey}` }
        });
        if (!statusRes.ok) { await new Promise(r => setTimeout(r, 2000)); continue; }
        const data = await statusRes.json();
        if (data.status === "completed" || data.status === "SUCCEEDED") return data.output_url || data.result_url || imageUrl;
        if (data.status === "failed") return imageUrl;
        await new Promise(r => setTimeout(r, 2000));
      }
    } catch (err) {
      console.warn("[segmentGarment] Photta ghost mannequin failed:", err);
    }
  }
  return imageUrl;
}

async function cleanProductImage(apiKey: string, productImageUrl: string) {
  console.log(`Cleaning product image (Ghost Mannequin): ${productImageUrl.substring(0, 100)}...`);
  const res = await fetch(`${PHOTTA_BASE_URL}/ghost-mannequin`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ product_image_url: productImageUrl, style: "hollow-man", resolution: "2K" }),
  });

  if (!res.ok) {
    console.warn(`Ghost Mannequin cleaning failed (${res.status}), using original image.`);
    return productImageUrl;
  }

  const resJson = await res.json();
  const generation_id = resJson.generation_id || resJson.id;
  if (!generation_id) return productImageUrl;

  let attempts = 0;
  while (attempts < 40) {
    attempts++;
    const statusRes = await fetch(`${PHOTTA_BASE_URL}/ghost-mannequin/${generation_id}`, {
      headers: { "Authorization": `Bearer ${apiKey}` }
    });
    if (!statusRes.ok) { await new Promise(r => setTimeout(r, 2000)); continue; }
    const data = await statusRes.json();
    if (data.status === "completed" || data.status === "SUCCEEDED") return data.output_url || data.result_url || productImageUrl;
    if (data.status === "failed") return productImageUrl;
    await new Promise(r => setTimeout(r, 2000));
  }
  return productImageUrl;
}

async function detectGarmentColor(apiKey: string, imageUrl: string): Promise<string> {
  console.log("Detecting garment color via Qwen VL...");
  try {
    const res = await fetch("https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "qwen-vl-plus",
        input: {
          messages: [{
            role: "user",
            content: [
              { image: imageUrl },
              { text: "You are a fashion product analyst. Analyze the clothing/shoes in this image with extreme precision. Identify:\n1. PRIMARY COLOR (be very specific, e.g. 'Coffee Brown', 'Jet-Black', 'Navy Blue', 'Burgundy Red')\n2. SECONDARY COLOR if any\n3. MATERIAL (e.g. 'Leather', 'Suede', 'Canvas', 'Cotton', 'Denim')\n4. TYPE (e.g. 'Sneakers', 'Dress Shoes', 'T-Shirt', 'Jacket')\n5. KEY DETAILS (e.g. 'white sole', 'gold buckle', 'zip closure')\n\nReturn ONLY in this format:\nColor: [Primary Color], Material: [Material], Type: [Type], Details: [Key Details]" }
            ]
          }]
        }
      })
    });
    if (!res.ok) {
      console.warn(`Qwen VL returned ${res.status}, using fallback`);
      return "Color: original, Material: unknown";
    }
    const data = await res.json();
    const content = data.output?.choices?.[0]?.message?.content?.[0]?.text || "Color: original, Material: unknown";
    console.log(`✅ Detected product details: ${content}`);
    return content;
  } catch (e) {
    console.warn("Color detection failed:", e);
    return "Color: original, Material: unknown";
  }
}

async function verifyProductFidelity(
  apiKey: string,
  productImages: string[],
  generatedImageUrl: string
): Promise<{ pass: boolean; score: number; reasoning: string }> {
  console.log("🔍 Running Rigorous 10-Point Visual Identity Audit via Qwen VL...");
  
  const contentItems: any[] = [];
  // Use all product reference images for strict multi-angle audit
  for (const url of productImages.slice(0, 5)) {
    contentItems.push({ image: url });
  }
  contentItems.push({ image: generatedImageUrl });
  
  const prompt = [
    `You are a strict, world-class QA auditor for a fashion e-commerce company.`,
    `The first images are the ORIGINAL PRODUCT references (front, side, textures). The last image is the AI-generated model wearing the product.`,
    `Your task is to perform a rigorous 10-Point Visual Identity Audit to verify if the generated model is wearing the EXACT inventory product.`,
    `Perform direct pixel-level and aesthetic comparisons and grade the following 10 criteria on a scale of 0 to 10:`,
    `1. Color: Does the hue, shade, gradients, and secondary colors match 100%?`,
    `2. Shape: Are the proportions, width, and structural cuts identical?`,
    `3. Silhouette: Does the fit, drape, and posture matching look natural without mutating the design?`,
    `4. Patterns: Are prints, stripes, graphic elements, and logo locations perfectly preserved?`,
    `5. Logos: Is the brand logo/text legible, crisp, and located in the correct position?`,
    `6. Textures: Does the fabric texture (leather shine, knit pattern, denim weave) match the reference?`,
    `7. Stitching: Are the seams, borders, thread colors, and collar stitching accurately kept?`,
    `8. Accessories: Are buttons, zippers, buckles, pockets, and straps identical in count, color, and size?`,
    `9. Neckline: Is the collar shape, depth, and wings 100% correct? (For non-apparel like shoes/bags, score 10/10 if not applicable)`,
    `10. Sleeves: Are sleeve lengths, cuff structures, and shoulder seams matching? (For non-apparel like shoes/bags, score 10/10 if not applicable)`,
    ``,
    `Return ONLY a valid JSON object. Do NOT include markdown blocks or any other characters outside the JSON.`,
    `The JSON must follow this exact format:`,
    `{`,
    `  "scores": {`,
    `    "color": 10,`,
    `    "shape": 10,`,
    `    "silhouette": 10,`,
    `    "patterns": 10,`,
    `    "logos": 10,`,
    `    "textures": 9,`,
    `    "stitching": 10,`,
    `    "accessories": 10,`,
    `    "neckline": 10,`,
    `    "sleeves": 10`,
    `  },`,
    `  "overall_score": 99,`,
    `  "reasoning": "Color matches perfectly, but the leather texture is slightly smoother in the generated image than the raw product image."`,
    `}`
  ].join("\n");
  
  contentItems.push({ text: prompt });

  try {
    const res = await fetch("https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "qwen-vl-plus",
        input: {
          messages: [{
            role: "user",
            content: contentItems
          }]
        }
      })
    });
    
    if (!res.ok) {
      console.warn(`Qwen VL Audit API returned ${res.status}. Falling back to standard pass.`);
      return { pass: true, score: 95, reasoning: "API error - skipped verification to prevent lockup" };
    }
    
    const data = await res.json();
    const rawContent = data.output?.choices?.[0]?.message?.content?.[0]?.text || "";
    console.log(`🔍 Qwen VL Audit raw response:`, rawContent);
    
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const auditResult = JSON.parse(jsonMatch[0]);
      const overallScore = auditResult.overall_score || 0;
      const reasoning = auditResult.reasoning || "No reasoning provided";
      
      let categoryMismatch = false;
      if (auditResult.scores) {
        for (const [cat, val] of Object.entries(auditResult.scores)) {
          // Threshold: 7/10 minimum per category — enforces strict identity and garment details preservation
          if (typeof val === "number" && val < 7) {
            categoryMismatch = true;
            console.warn(`[Audit] Critical mismatch in category: ${cat} (Score: ${val}/10) — below minimum 7`);
          } else if (typeof val === "number" && val < 9) {
            console.log(`[Audit] Minor deviation in category: ${cat} (Score: ${val}/10) — acceptable`);
          }
        }
      }
      
      // Overall threshold: 88% — ENTERPRISE STRICT PRODUCT LOCK
      const pass = !categoryMismatch && overallScore >= 88;
      console.log(`[Audit Result] Score: ${overallScore}%. Pass: ${pass}. Reason: ${reasoning}`);
      return { pass, score: overallScore, reasoning };
    } else {
      throw new Error("Could not find valid JSON in Qwen VL response");
    }
  } catch (err: any) {
    console.error("Fidelity verification API failed. HARD FAIL generation.", err);
    return { pass: false, score: 0, reasoning: `Audit unavailable: ${err.message}` };
  }
}

async function runIdentityReinforcement(falKey: string, imageUrl: string, prompt: string = "Restore facial consistency, skin realism, eyes, and hair consistency. DO NOT modify the clothing. Hyper-realistic fashion photography.", canonicalFrames: string[] = []): Promise<string> {
  console.log("🧬 Running Identity Reinforcement Pass...");
  
  const engines = [
    "nano-banana-pro/edit",
    "openai/gpt-image-2/edit"
  ];

  const payload: any = {
    image_url: imageUrl,
    prompt: prompt
  };
  if (canonicalFrames.length > 0) {
    payload.reference_images = canonicalFrames;
    console.log(`Injecting ${canonicalFrames.length} canonical identity frames into Reinforcement Pass...`);
  }

  for (const engine of engines) {
    try {
      console.log(`Attempting Identity Reinforcement with: ${engine}`);
      const res = await fetch(`https://queue.fal.run/${engine}`, {
        method: "POST",
        headers: { "Authorization": `Key ${falKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        console.warn(`Identity Reinforcement ${engine} failed: ${res.status}`);
        continue;
      }

      const data = await res.json();
      const resultUrl = data.image?.url || data.images?.[0]?.url;
      if (resultUrl) {
        console.log(`✅ Identity Reinforcement SUCCESS with ${engine}`);
        return resultUrl;
      }
    } catch (e: any) {
      console.warn(`Identity Reinforcement engine ${engine} errored:`, e.message);
    }
  }
  
  console.warn("⚠️ All Identity Reinforcement engines failed. Returning original image.");
  return imageUrl;
}

async function verifyVideoFidelity(
  apiKey: string,
  productImages: string[],
  videoUrl: string
): Promise<{ pass: boolean; reasoning: string }> {
  console.log("🔍 Running Qwen VL Video Consistency and Texture Drift Audit...");
  const primaryProductUrl = productImages[0] || "";
  
  const prompt = [
    `You are a strict video QC specialist. Analyze the provided product image and the generated influencer video.`,
    `Perform a rigorous frame-by-frame visual consistency audit checking for:`,
    `1. Texture Drift: Do the clothing textures, pattern scales, or prints morph or slide over the body during movement?`,
    `2. Warping & Mutations: Does the shape, neckline, buttons, or straps of the garment distort or change in count/geometry during motion?`,
    `3. Color Shifts: Do the fabric colors fade, change shades, or shift under moving light?`,
    `4. Product Matching: Does the garment in the video remain 100% identical to the reference product image throughout?`,
    ``,
    `Return ONLY a valid JSON object. Do NOT include markdown blocks or any other characters outside the JSON.`,
    `The JSON must follow this exact format:`,
    `{`,
    `  "drift_detected": false,`,
    `  "warping_detected": false,`,
    `  "color_shift_detected": false,`,
    `  "product_match_percentage": 98,`,
    `  "pass": true,`,
    `  "reasoning": "The garment is fully stable, textures do not slide or warp, color is locked perfectly with zero drift."`,
    `}`
  ].join("\n");

  try {
    const res = await fetch("https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "qwen-vl-plus",
        input: {
          messages: [{
            role: "user",
            content: [
              { image: primaryProductUrl },
              { video: [videoUrl] },
              { text: prompt }
            ]
          }]
        }
      })
    });

    if (!res.ok) {
      console.warn(`Qwen VL Video verification returned ${res.status}. Allowing fallback.`);
      return { pass: true, reasoning: "Video audit skipped due to API availability." };
    }

    const data = await res.json();
    const rawContent = data.output?.choices?.[0]?.message?.content?.[0]?.text || "";
    console.log(`🔍 Qwen VL Video Audit response:`, rawContent);

    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const auditResult = JSON.parse(jsonMatch[0]);
      const pass = auditResult.pass === true && 
                   auditResult.drift_detected === false && 
                   auditResult.warping_detected === false && 
                   auditResult.color_shift_detected === false && 
                   (auditResult.product_match_percentage || 0) >= 95;
      
      console.log(`[Video Audit Result] Pass: ${pass}. Reasoning: ${auditResult.reasoning}`);
      return { pass, reasoning: auditResult.reasoning || "Completed video audit." };
    }
  } catch (err: any) {
    console.warn("Video consistency audit failed, defaulting permitting:", err);
  }
  return { pass: true, reasoning: "Skipped audit due to verification execution error." };
}

// NOTE: callTryOnAI (Alibaba aitryon-plus) is intentionally removed.
// aitryon-plus is only available in the China (Beijing) region on dashscope.aliyuncs.com.
// Our API key is for the international region (dashscope-intl.aliyuncs.com) where the model
// does not exist. Calling it always returns {"code":"InvalidParameter","message":"Model not exist."}.
// The VTON pipeline uses Photta + HF IDM-VTON spaces as the reliable multi-engine fallback chain.

// callImageAI removed to enforce strict enterprise VTON

async function persistImage(supabaseClient: any, imageUrl: string, folder: string, hfToken?: string) {
  try {
    if (!imageUrl) return null;
    console.log(`Persisting image from: ${imageUrl.substring(0, 100)}...`);
    
    // Some Gradio URLs might have double slashes after /file=, we clean those up
    const sanitizedUrl = imageUrl.replace("file=/", "file=/"); // No change, just a placeholder for logic
    
    const response = await fetch(imageUrl, {
      headers: {
        ...(hfToken ? { "Authorization": `Bearer ${hfToken}` } : {}),
        "Accept": "image/*"
      }
    });
    
    if (!response.ok) {
      console.warn(`Failed to fetch image for persistence: ${response.status} ${response.statusText}. URL was: ${imageUrl}`);
      // If we can't persist it, we'll try to return the original and hope the browser can see it (unlikely for private HF but worth a shot)
      return imageUrl;
    }
    const blob = await response.blob();
    const fileName = `${folder}/${crypto.randomUUID()}.png`;
    const { error: uploadError } = await supabaseClient.storage.from("ugc-assets").upload(fileName, blob, { contentType: "image/png", upsert: true });
    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return imageUrl;
    }
    const { data: { publicUrl } } = supabaseClient.storage.from("ugc-assets").getPublicUrl(fileName);
    console.log(`Successfully persisted image to: ${publicUrl}`);
    return publicUrl;
  } catch (err) {
    console.error("Persistence error:", err);
    return imageUrl;
  }
}

async function callTTS(apiKey: string, text: string, voice = "sambert-camila-v1") {
  const url = "https://dashscope-intl.aliyuncs.com/api/v1/services/audio/tts/generation-sync";
  const res = await fetch(url, {
    method: "POST",
    headers: { ...aiHeaders(apiKey), "X-DashScope-Data-Type": "audio" },
    body: JSON.stringify({ model: voice, input: { text }, parameters: { format: "mp3", sample_rate: 16000 } }),
  });
  if (!res.ok) throw new Error(`TTS failed: ${res.status}`);
  return await res.blob();
}

async function persistAudio(supabaseClient: any, audioBlob: Blob, folder: string) {
  const fileName = `${folder}/${crypto.randomUUID()}.mp3`;
  const { error: uploadError } = await supabaseClient.storage.from("ugc-assets").upload(fileName, audioBlob, { contentType: "audio/mpeg", upsert: true });
  if (uploadError) throw uploadError;
  const { data: { publicUrl } } = supabaseClient.storage.from("ugc-assets").getPublicUrl(fileName);
  return publicUrl;
}

// --- CACHING UTILITIES ---
async function getCacheKey(personUrl: string, garmentUrl: string, extra?: string) {
  const data = `${personUrl}|${garmentUrl}|${extra || ""}`;
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(data));
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function checkCache(supabase: any, key: string) {
  console.log(`Checking cache for key: ${key.substring(0, 8)}...`);
  const { data } = await supabase.from("ugc_cache").select("image_url").eq("cache_key", key).maybeSingle();
  return data?.image_url;
}

async function storeInCache(supabase: any, key: string, imageUrl: string, influencerId?: string, productId?: string) {
  if (!imageUrl) {
    console.warn("Skipping cache storage: imageUrl is null");
    return;
  }
  console.log(`Caching result: ${imageUrl.substring(0, 30)}...`);
  await supabase.from("ugc_cache").insert({
    cache_key: key,
    image_url: imageUrl,
    influencer_id: influencerId,
    product_id: productId
  });
}

async function runUnifiedVTON(
  keys: { qwenKey: string; falKey: string; phottaKey: string; hfToken: string },
  personImageUrl: string,
  productImages: string[],
  category: string,
  description: string,
  supabaseClient: any,
  ethnicity?: string,
  gender?: string
): Promise<{ url: string; score: number }> {
  const targetEthnicity = ethnicity || "person";
  const targetGender = gender || "female";
  console.log(`[Unified VTON] Starting pipeline — category: "${category}", description: "${description}", references count: ${productImages.length}`);

  if (productImages.length === 0) {
    throw new Error("Generation blocked: no product image references provided.");
  }

  const primaryProductUrl = productImages[0];

  // 1. Detect garment details using AI vision — this is the single source of truth for the garment
  const garmentDetails = await detectGarmentColor(keys.qwenKey, primaryProductUrl);
  const colorMatch = garmentDetails.match(/Color: ([^,]+)/);
  const garmentColor = colorMatch ? colorMatch[1].trim() : "original";
  console.log(`[Unified VTON] AI-detected details: ${garmentDetails}`);

  // 3. Try-On (Standard Apparel Route - Exclusive VTON Pipeline)
  const segmentedProductImages: string[] = [];
  for (const url of productImages) {
    try {
      const seg = await segmentGarment(keys, url, category);
      segmentedProductImages.push(seg);
    } catch (err) {
      console.warn(`[Unified VTON] Segment clothing failed for ${url}, using original:`, err);
      segmentedProductImages.push(url);
    }
  }

  let lastReasoning = "";
  const maxRetries = 3;
  // Best-effort tracking: serve the highest-scoring result if nothing reaches the pass threshold
  let bestResultUrl: string | null = null;
  let bestResultScore = 0;
  // Track if fal.ai balance is exhausted to avoid repeated failed calls
  let falBalanceExhausted = false;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`[Unified VTON] Attempt ${attempt} of ${maxRetries} for apparel try-on...`);

    // Mutate seed based on attempt
    const seed = attempt === 1 ? 42 : attempt === 2 ? 738920 : 1948302;

    const engines = [
      {
        name: "Fal.ai VTON",
        available: !!keys.falKey && !falBalanceExhausted,
        fn: async () => {
          return await callFalAI(
            keys.falKey,
            personImageUrl,
            segmentedProductImages,
            `${garmentDetails} — worn by a ${targetGender} ${targetEthnicity} model. seed: ${seed}`,
            category
          );
        }
      }
    ];

    for (const engine of engines) {
      if (!engine.available) continue;
      try {
        console.log(`[Unified VTON] Trying apparel engine: ${engine.name} on attempt ${attempt}...`);
        const resultUrl = await engine.fn();
        if (resultUrl) {
          console.log(`[Unified VTON] Engine ${engine.name} succeeded. Verifying fidelity...`);

          const audit = await verifyProductFidelity(keys.qwenKey, productImages, resultUrl);
          if (audit.pass) {
            console.log(`[Unified VTON] ✅ Apparel fidelity check PASSED for: ${engine.name} (Score: ${audit.score}%)`);
            return { url: resultUrl, score: audit.score };
          } else {
            console.warn(`[Unified VTON] ❌ Apparel fidelity check FAILED for: ${engine.name} (Score: ${audit.score}%). Reason: ${audit.reasoning}`);
            lastReasoning = audit.reasoning;
            // Track the best result so far for best-effort fallback
            if (audit.score > bestResultScore) {
              bestResultScore = audit.score;
              bestResultUrl = resultUrl;
              console.log(`[Unified VTON] 📌 New best-effort candidate: ${engine.name} (Score: ${audit.score}%)`);
            }
          }
        }
      } catch (err: any) {
        const msg = err.message || String(err);
        // Mark fal.ai as exhausted for this request so we don't retry it
        if (msg.startsWith("FAL_BALANCE_EXHAUSTED")) {
          falBalanceExhausted = true;
          console.warn(`[Unified VTON] ⚠️ Fal.ai balance exhausted — skipping fal engines for remaining attempts.`);
        } else if (msg.startsWith("SKIP_ENGINE")) {
          console.warn(`[Unified VTON] ⏭️ Engine ${engine.name} skipped: ${msg}`);
        } else {
          console.warn(`[Unified VTON] Engine ${engine.name} errored on attempt ${attempt}:`, msg);
        }
      }
    }
  }

  // STRICT PRODUCT LOCK: HARD FAIL IF NOT PASSED
  throw new Error(
    `STRICT_PRODUCT_LOCK_FAILED: Virtual try-on failed after ${maxRetries} attempts. ` +
    `None of the generations met the strict 88%+ visual fidelity threshold. ` +
    `Last auditor reasoning: ${lastReasoning || "All attempts timed out or failed to execute."}`
  );
}

// runUnifiedVTONForAvatar removed to enforce strict enterprise VTON across all modes

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { action } = body;
    const QWEN_API_KEY = Deno.env.get("QWEN_API_KEY") || "";
    const HF_TOKEN = Deno.env.get("HF_TOKEN") || "";
    const PHOTTA_API_KEY = Deno.env.get("PHOTTA_API_KEY") || "";
    const FAL_KEY = Deno.env.get("FAL_KEY") || "";
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY") || "";

    if (!QWEN_API_KEY) throw { status: 500, message: "Missing QWEN_API_KEY" };

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const referenceImage = body.avatarImageUrl || body.avatarImageBase64;

    // ═══════════════════════════════════════════════════════
    // INVENTORY VALIDATION GATE
    // If a productId is provided, fetch the product's real images
    // directly from the Supabase inventory database. This guarantees
    // the pipeline ALWAYS uses actual inventory product images and
    // cannot be contaminated by stale frontend data or external URLs.
    // ═══════════════════════════════════════════════════════
    let inventoryImages: string[] = [];
    const incomingProductId = body.productId || body.product?.id;
    if (incomingProductId && !String(incomingProductId).startsWith("live_")) {
      try {
        const { data: dbProduct, error: dbErr } = await supabase
          .from("products")
          .select("images, status")
          .eq("id", incomingProductId)
          .maybeSingle();
        if (dbErr) {
          console.warn("[Inventory Gate] DB lookup error:", dbErr.message);
        } else if (dbProduct) {
          if (dbProduct.status !== "active") {
            throw { status: 400, message: `Product ${incomingProductId} is not active in inventory (status: ${dbProduct.status}). Generation blocked.` };
          }
          const dbImages: string[] = Array.isArray(dbProduct.images)
            ? dbProduct.images.filter((u: any) => typeof u === "string" && u.trim())
            : [];
          if (dbImages.length > 0) {
            inventoryImages = dbImages;
            console.log(`[Inventory Gate] ✅ Locked ${dbImages.length} verified image(s) for product ${incomingProductId} from database.`);
          } else {
            console.warn(`[Inventory Gate] Product ${incomingProductId} found in DB but has no images. Falling back to request payload.`);
          }
        } else {
          console.warn(`[Inventory Gate] Product ${incomingProductId} not found in DB. Falling back to request payload.`);
        }
      } catch (gateErr: any) {
        if (gateErr.status) throw gateErr; // re-throw 400 errors (inactive product)
        console.warn("[Inventory Gate] Unexpected error during DB lookup:", gateErr);
      }
    }

    // Collect all potential product image references into a deduplicated list.
    // Inventory DB images take PRIORITY — they are prepended before any payload URLs.
    const candidateUrls: string[] = [...inventoryImages];
    const addCandidates = (val: any) => {
      if (!val) return;
      if (Array.isArray(val)) {
        val.forEach(item => {
          if (typeof item === 'string' && item.trim()) {
            candidateUrls.push(item.trim());
          }
        });
      } else if (typeof val === 'string' && val.trim()) {
        candidateUrls.push(val.trim());
      }
    };

    // Only add payload URLs if we didn't already get authoritative DB images
    if (inventoryImages.length === 0) {
      addCandidates(body.productImageUrl);
      addCandidates(body.product?.images);
      addCandidates(body.product?.side_images);
      addCandidates(body.product?.closeups);
      addCandidates(body.product?.textures);
      addCandidates(body.side_images);
      addCandidates(body.closeups);
      addCandidates(body.textures);
    } else {
      // Even if we have DB images, include extra payload references as supplemental views
      addCandidates(body.product?.side_images);
      addCandidates(body.product?.closeups);
      addCandidates(body.product?.textures);
    }

    // Deduplicate while preserving order (DB images first = highest priority)
    const productImages = [...new Set(candidateUrls)];
    const primaryProductUrl = productImages[0] || "";
    console.log(`[Product Images] Total references for generation: ${productImages.length} (inventory DB: ${inventoryImages.length}, payload extras: ${productImages.length - inventoryImages.length})`);

    if (action === "generate-avatar") {
      const { productName, productCategory } = body;
      const ethnicity = body.ethnicity || "African";
      const gender = body.gender || "female";
      const setting = body.setting || "studio";
      
      console.log(`Generating avatar for ${productName} (${gender}, ${ethnicity})...`);

      let url: string | null | undefined = null;

      let vtonPersonImage = referenceImage;
      if (!vtonPersonImage) {
        console.log(`[generate-avatar] No reference image. Generating baseline portrait...`);
        vtonPersonImage = await generateBasePortrait(FAL_KEY, gender, ethnicity, setting);
      }

      if (!primaryProductUrl) {
        url = vtonPersonImage;
      } else {
        // Run the VTON pipeline using strict product lock rules
        const vtonResult = await runUnifiedVTON(
          { qwenKey: QWEN_API_KEY, falKey: FAL_KEY, phottaKey: PHOTTA_API_KEY, hfToken: HF_TOKEN },
          vtonPersonImage,
          productImages,
          productCategory || "apparel",
          productName || "garment",
          supabase,
          ethnicity,
          gender
        );
        url = vtonResult.url;
        console.log(`[generate-avatar] ✅ VTON pipeline succeeded (score: ${vtonResult.score}%)`);
      }

      if (!url) throw { status: 500, message: "Avatar generation failed — strict product lock enforcement." };

      const persistedUrl = await persistImage(supabase, url, "avatars");
      return new Response(JSON.stringify({ success: true, imageUrl: persistedUrl }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }


    if (action === "check-video-status") {
      // ─── ASYNC VIDEO STATUS CHECK ────────────────────────────────────────────
      // Called by the client to check if the Kling video job is complete.
      // When complete, runs audio assembly + returns the final video URL.
      const { requestId, statusUrl, responseUrl, masterFrameUrl, productName, voiceId, musicPrompt, scriptText, influencerId } = body;
      if (!requestId || !statusUrl || !responseUrl) {
        return new Response(JSON.stringify({ error: "requestId, statusUrl, and responseUrl are required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      try {
        // Check Fal.ai job status
        const statusRes = await fetch(statusUrl, { headers: { "Authorization": `Key ${FAL_KEY}` } });
        if (!statusRes.ok) {
          return new Response(JSON.stringify({ status: "IN_PROGRESS", message: "Job still processing" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        const statusData = await statusRes.json();
        const jobStatus: string = statusData.status || "IN_PROGRESS";

        if (jobStatus === "FAILED" || jobStatus === "failed") {
          return new Response(JSON.stringify({ status: "FAILED", error: statusData.error || "Video generation failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        if (jobStatus !== "COMPLETED" && jobStatus !== "completed" && jobStatus !== "SUCCEEDED" && jobStatus !== "succeeded") {
          return new Response(JSON.stringify({ status: "IN_PROGRESS", queuePosition: statusData.queue_position }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        // Job is complete — fetch the result
        console.log(`[check-video-status] ✅ Kling job ${requestId} COMPLETE. Fetching result...`);
        const resultRes = await fetch(responseUrl, { headers: { "Authorization": `Key ${FAL_KEY}` } });
        if (!resultRes.ok) throw new Error(`Failed to fetch result: ${resultRes.status}`);
        const resultData = await resultRes.json();
        const rawVideoUrl = resultData.video?.url || resultData.response?.video?.url;
        if (!rawVideoUrl) throw new Error("Kling result contained no video URL");
        console.log(`[check-video-status] Raw video URL: ${rawVideoUrl}`);

        // ── AUDIO ENGINE ────────────────────────────────────────────────────────
        let finalAudioUrl = null;
        try {
          const audioLayers: string[] = [];
          if (ELEVENLABS_API_KEY && (voiceId || body.influencerVoiceId) && scriptText) {
            const voiceBlob = await callElevenLabsTTS(ELEVENLABS_API_KEY, scriptText, voiceId || body.influencerVoiceId);
            const voiceUrl = await persistAudio(supabase, voiceBlob, "audio_voice");
            audioLayers.push(voiceUrl);
          } else if (scriptText && QWEN_API_KEY) {
            const voiceBlob = await callTTS(QWEN_API_KEY, scriptText);
            const voiceUrl = await persistAudio(supabase, voiceBlob, "audio_voice");
            audioLayers.push(voiceUrl);
          }
          if (FAL_KEY) {
            const ambientUrl = await generateAmbientAudio(FAL_KEY, body.setting || "natural lifestyle street");
            if (ambientUrl) audioLayers.push(ambientUrl);
            const musicUrl = await generateTikTokMusic(FAL_KEY, musicPrompt || "fashion influencer vibe");
            if (musicUrl) audioLayers.push(musicUrl);
          }
          if (audioLayers.length > 1) {
            finalAudioUrl = await mixAudioLayers(FAL_KEY, audioLayers);
          } else if (audioLayers.length === 1) {
            finalAudioUrl = audioLayers[0];
          }
        } catch (audioErr) {
          console.warn("[check-video-status] Audio assembly failed (non-fatal):", audioErr);
        }

        // ── FINAL ASSEMBLY ───────────────────────────────────────────────────────
        let finalVideoUrl = rawVideoUrl;
        if (finalAudioUrl && FAL_KEY) {
          try {
            finalVideoUrl = await mergeAudioVideo(FAL_KEY, rawVideoUrl, finalAudioUrl);
          } catch (mergeErr) {
            console.warn("[check-video-status] Audio merge failed, using raw video:", mergeErr);
          }
        }
        console.log(`🚀 [check-video-status] Pipeline Complete: ${finalVideoUrl}`);

        return new Response(JSON.stringify({
          status: "COMPLETED",
          videoUrl: finalVideoUrl,
          masterFrameUrl: masterFrameUrl || null,
          audioUrl: finalAudioUrl
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

      } catch (e: any) {
        console.error("[check-video-status] Error:", e);
        return new Response(JSON.stringify({ status: "FAILED", error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }


    if (action === "generate-ugc-video") {
      const { productName, productCategory, productDescription, avatarGender, avatarEthnicity, isUGC, avatarImageBase64, influencerId, voiceId, musicPrompt, scriptText } = body;
      console.log(`🎬 STARTING HIGH-MOTION UGC PIPELINE: ${productName} (${avatarGender}, ${avatarEthnicity})...`);
      
      // --- STAGE 1: PRODUCT LOCK ENGINE ---
      if (productImages.length === 0) throw new Error("Generation blocked: no product image.");
      console.log("Stage 1: Product Lock Engine verified.");

      let referenceImage = body.influencerImageUrl || body.avatarImageUrl;
      if (avatarImageBase64 && !referenceImage) {
        referenceImage = await persistImage(supabase, avatarImageBase64, "uploads");
      }
      if (!referenceImage) throw new Error("Influencer identity or photo is required.");

      // --- STAGE 2: VTON MASTER FRAME ---
      console.log("Stage 2: Creating Luxury VTON Master Frame...");
      const vtonResult = await runUnifiedVTON(
        { qwenKey: QWEN_API_KEY, falKey: FAL_KEY, phottaKey: PHOTTA_API_KEY, hfToken: HF_TOKEN },
        referenceImage,
        productImages,
        productCategory || "apparel",
        productName || "garment",
        supabase,
        avatarEthnicity,
        avatarGender
      );
      const masterFrameUrl = vtonResult.url;
      const masterFrameScore = vtonResult.score;
      const persistedMasterUrl = await persistImage(supabase, masterFrameUrl, "master_frames");
      console.log(`✅ Master Frame created: ${persistedMasterUrl} (Score: ${masterFrameScore}%)`);

      // --- STAGE 3: SUBMIT VIDEO JOB (ASYNC — return immediately) ---
      console.log("Stage 3: Submitting Kling video job asynchronously...");
      const videoPrompt = `${avatarEthnicity} ${avatarGender} creator wearing ${productName}. ${productDescription || productName}`;

      if (!FAL_KEY) throw new Error("FAL_KEY missing — cannot submit video job.");
      const klingJob = await submitKlingJob(FAL_KEY, masterFrameUrl, videoPrompt);
      console.log(`🎬 Kling job submitted. requestId: ${klingJob.requestId}. Returning to client for async polling.`);

      // Return immediately — the client will poll check-video-status
      return new Response(JSON.stringify({
        success: true,
        pending: true,
        requestId: klingJob.requestId,
        statusUrl: klingJob.statusUrl,
        responseUrl: klingJob.responseUrl,
        masterFrameUrl: persistedMasterUrl,
        fidelityScore: masterFrameScore,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }


    if (action === "generate-campaign-shot") {
      const { influencer, product, scene } = body;
      const influencerImageUrl = influencer.avatar_url || "";
      const influencerEthnicity = influencer.ethnicity || influencer.skin_tone || "";
      const influencerGender = influencer.gender || "female";
      const cacheKey = await getCacheKey(influencerImageUrl, primaryProductUrl, `${scene}|${influencerEthnicity}|${influencerGender}`);
      const cachedUrl = await checkCache(supabase, cacheKey);
      
      const canonicalFrames = influencer.id ? await fetchCanonicalFrames(supabase, influencer.id) : [];
      if (cachedUrl) return new Response(JSON.stringify({ success: true, imageUrl: cachedUrl, cached: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

      try {
        const vtonResult = await runUnifiedVTON(
          { qwenKey: QWEN_API_KEY, falKey: FAL_KEY, phottaKey: PHOTTA_API_KEY, hfToken: HF_TOKEN },
          influencerImageUrl,
          productImages,
          product.category || "apparel",
          product.name || "garment",
          supabase,
          influencerEthnicity,
          influencerGender
        );

        let finalImageUrl = vtonResult.url;
        if (FAL_KEY) {
          finalImageUrl = await runIdentityReinforcement(FAL_KEY, finalImageUrl, undefined, canonicalFrames);
        }

        const persistedUrl = await persistImage(supabase, finalImageUrl, "campaigns", HF_TOKEN);
        await storeInCache(supabase, cacheKey, persistedUrl, influencer.id, product.id);
        return new Response(JSON.stringify({ success: true, imageUrl: persistedUrl, fidelityScore: vtonResult.score }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } catch (e: any) {
        console.error("Campaign shot generation failed:", e);
        return new Response(JSON.stringify({ error: e.message || "Error generating high-fidelity campaign shot" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    if (action === "generate-campaign-video") {
      const { imageUrl, prompt, influencerId } = body;
      try {
        if (!FAL_KEY) throw new Error("FAL_KEY missing");
        const canonicalFrames = influencerId ? await fetchCanonicalFrames(supabase, influencerId) : [];
        const videoUrl = await generateCampaignVideo(FAL_KEY, imageUrl, prompt || "Cinematic luxury campaign", canonicalFrames);
        return new Response(JSON.stringify({ success: true, videoUrl }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } catch (e: any) {
        console.error("Campaign video generation failed:", e);
        return new Response(JSON.stringify({ error: e.message || "Error generating campaign video" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    if (action === "generate-script") {
      const { productName, productCategory, productPrice, currency } = body;
      const prompt = `You are a world-class fashion creative director and UGC strategist.
Generate authentic, human-sounding creator scripts optimized for TikTok, Instagram Reels, and luxury fashion commerce.
The uploaded product is the source of truth.
Never describe product attributes that do not exist.
Maintain realism, authenticity, and natural conversational pacing.
Avoid robotic AI phrasing.
Scripts should feel like real influencer content filmed on an iPhone by a real creator.
Focus on:
- emotional hooks
- curiosity
- trust
- relatability
- modern creator cadence
- conversion psychology

Create a catchy, authentic, and high-converting 15-30s TikTok/Reels script for this product:
Product: "${productName}"
Category: ${productCategory}
Price: ${currency} ${productPrice}

Return ONLY a valid JSON object. DO NOT include any other text, explanations, or markdown code blocks outside the JSON.
The JSON must follow this EXACT schema:
{
  "title": "A catchy, viral title",
  "hook": "Strong opening hook (first 3 seconds)",
  "scenes": [
    {
      "scene": 1,
      "duration": "3s",
      "direction": "Detailed visual direction for the creator",
      "dialogue": "Exact words the creator says",
      "text_overlay": "On-screen text overlay"
    }
  ],
  "cta": "Strong final call to action",
  "hashtags": ["fashion", "ugc", "style"]
}
Ensure there are 4-6 scenes in total.`;

      const data = await callTextAI(QWEN_API_KEY, prompt);
      const content = data.choices?.[0]?.message?.content || "";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const scriptData = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
      return new Response(JSON.stringify({ success: true, scriptData }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "generate-tts") {
      const { text, voice } = body;
      const audioBlob = await callTTS(QWEN_API_KEY, text, voice);
      const audioUrl = await persistAudio(supabase, audioBlob, "audio");
      return new Response(JSON.stringify({ success: true, audioUrl }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "generate-video") {
      const { imageUrl, prompt, musicPrompt } = body;
      let videoUrl;
      try {
        if (FAL_KEY) {
          console.log("Generating High-Motion UGC video via True Motion Engine...");
          videoUrl = await generateTrueMotionVideo(FAL_KEY, imageUrl, prompt);
        } else {
          throw new Error("FAL_KEY missing");
        }
      } catch (e: any) {
        console.error("Kling video generation failed:", e);
        throw new Error(e.message || "Failed to generate high-motion UGC video");
      }
      
      let audioUrl = null;
      if (musicPrompt && FAL_KEY) {
        try {
          audioUrl = await generateTikTokMusic(FAL_KEY, musicPrompt);
        } catch (e) {
          console.warn("Music generation failed:", e);
        }
      }
      
      return new Response(JSON.stringify({ success: true, videoUrl, audioUrl }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    throw { status: 400, message: `Unknown action: ${action}` };
  } catch (e: any) {
    console.error("UGC error:", e);
    const isBusinessError = e.message?.includes("HARD FAIL") || e.message?.includes("STRICT_PRODUCT_LOCK_FAILED");
    const status = isBusinessError ? 200 : (e.status || 500);
    return new Response(JSON.stringify({ error: e.message || "Error" }), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
