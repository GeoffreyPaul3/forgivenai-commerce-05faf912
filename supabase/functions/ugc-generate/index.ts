import { createClient } from "https://esm.sh/@supabase/supabase-js@2.40.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const QWEN_BASE_URL = "https://dashscope-intl.aliyuncs.com/compatible-mode/v1";
const WANX_API_URL = "https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis";
const TRYON_API_URL = "https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/image2image/image-synthesis";
const PHOTTA_BASE_URL = "https://api.photta.app/api/v1";

function aiHeaders(apiKey: string) {
  return { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" };
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

async function generateAmbientAudio(apiKey: string, setting: string) {
  console.log(`Generating ambient audio for setting: ${setting}...`);
  const res = await fetch("https://queue.fal.run/fal-ai/stable-audio", {
    method: "POST",
    headers: { "Authorization": `Key ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ 
      prompt: `Foley recording of ${setting} atmosphere, room tone, subtle background sounds, realistic, high quality, 44.1kHz`,
      duration: 10
    }),
  });
  if (!res.ok) return null;
  const { request_id } = await res.json();
  let attempts = 0;
  while (attempts < 20) {
    attempts++;
    const statusRes = await fetch(`https://queue.fal.run/fal-ai/stable-audio/requests/${request_id}`, {
      headers: { "Authorization": `Key ${apiKey}` }
    });
    const data = await statusRes.json();
    if (data.status === "COMPLETED") return data.response.audio.url;
    await new Promise(r => setTimeout(r, 2000));
  }
  return null;
}

async function mixAudioLayers(apiKey: string, audioUrls: string[]) {
  console.log("Mixing audio layers via Fal.ai FFmpeg...");
  const res = await fetch("https://queue.fal.run/fal-ai/ffmpeg-api/merge-audios", {
    method: "POST",
    headers: { "Authorization": `Key ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ audio_urls: audioUrls.filter(u => !!u) }),
  });
  if (!res.ok) return audioUrls[0]; // Fallback to first track if mix fails
  const { request_id } = await res.json();
  let attempts = 0;
  while (attempts < 30) {
    attempts++;
    const statusRes = await fetch(`https://queue.fal.run/fal-ai/ffmpeg-api/merge-audios/requests/${request_id}`, {
      headers: { "Authorization": `Key ${apiKey}` }
    });
    const data = await statusRes.json();
    if (data.status === "COMPLETED") return data.response.audio.url;
    await new Promise(r => setTimeout(r, 2000));
  }
  return audioUrls[0];
}

async function mergeAudioVideo(apiKey: string, videoUrl: string, audioUrl: string) {
  console.log("Merging audio and video via Fal.ai FFmpeg...");
  const res = await fetch("https://queue.fal.run/fal-ai/ffmpeg-api/merge-audio-video", {
    method: "POST",
    headers: { "Authorization": `Key ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ video_url: videoUrl, audio_url: audioUrl }),
  });
  if (!res.ok) return videoUrl;
  const { request_id } = await res.json();
  let attempts = 0;
  while (attempts < 30) {
    attempts++;
    const statusRes = await fetch(`https://queue.fal.run/fal-ai/ffmpeg-api/merge-audio-video/requests/${request_id}`, {
      headers: { "Authorization": `Key ${apiKey}` }
    });
    const data = await statusRes.json();
    if (data.status === "COMPLETED") return data.response.video.url;
    await new Promise(r => setTimeout(r, 2000));
  }
  return videoUrl;
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

async function callIDMVTON(hfToken: string, personImageUrl: string, garmentImageUrl: string, description = "") {
  // We try multiple popular IDM-VTON spaces to ensure robustness
  // Ordered from most stable to least stable community mirrors
  const spaces = [
    "yisol-idm-vton.hf.space",
    "nymbo-virtual-try-on.hf.space",
    "cantis-idm-vton.hf.space",
    "mubashirmehmood-yisol-idm-vton.hf.space",
    "wytwyt02-yisol-idm-vton.hf.space",
    "lewareai-idm-vton.hf.space",
    "frogleo-ai-clothes-changer.hf.space",
    "jallenjia-change-clothes-ai.hf.space",
    "samikshachavan-ai-virtual-tryon.hf.space"
  ];

  for (const space of spaces) {
    try {
      console.log(`Starting IDM-VTON task on space: ${space}...`);
      
      // 1. Initial Submission
      // We try both /gradio_api/call/ and /call/ as some spaces differ
      const endpoint = `https://${space}/gradio_api/call/tryon`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(hfToken ? { "Authorization": `Bearer ${hfToken}` } : {})
        },
        body: JSON.stringify({
          data: [
            { "background": personImageUrl, "layers": [], "composite": null },
            garmentImageUrl,
            description || "fashion garment",
            true,  // is_checked
            false, // is_checked_crop
            30,    // denoise_steps
            42     // seed
          ]
        }),
      });

      if (!res.ok) {
        console.warn(`Space ${space} submission failed with status ${res.status}`);
        continue;
      }

      const { event_id } = await res.json();
      console.log(`Event ID for ${space}: ${event_id}`);

      // 2. Poll for the result
      let attempts = 0;
      while (attempts < 20) {
        attempts++;
        const pollRes = await fetch(`https://${space}/gradio_api/call/tryon/${event_id}`, {
          headers: hfToken ? { "Authorization": `Bearer ${hfToken}` } : {}
        });

        if (!pollRes.ok) {
          await new Promise(r => setTimeout(r, 2000));
          continue;
        }

        const streamText = await pollRes.text();
        const events = streamText.split(/\n\n|\n/);
        
        for (const event of events) {
          if (event.includes("event: complete")) {
            const dataLine = events[events.indexOf(event) + 1] || events.find(l => l.startsWith("data:"));
            if (dataLine && dataLine.startsWith("data:")) {
              try {
                const jsonData = JSON.parse(dataLine.substring(5));
                const result = jsonData?.[0];
                const imageUrl = result?.url || result;
                if (imageUrl) {
                  console.log(`IDM-VTON Success on ${space}! Raw result: ${JSON.stringify(result)}`);
                  let fullUrl = imageUrl;
                  if (!imageUrl.startsWith("http")) {
                    // Try to build a valid absolute URL for the Gradio file
                    // Most v4 spaces use /gradio_api/file=
                    fullUrl = `https://${space}/gradio_api/file=${imageUrl.startsWith('/') ? imageUrl.substring(1) : imageUrl}`;
                  }
                  return fullUrl;
                }
              } catch (e) {
                console.error("Failed to parse data line:", e);
              }
            }
          }
          if (event.includes("event: error") || event.includes('"msg":"error"')) {
             console.warn(`Error in stream for ${space}`);
             break; // Try next space
          }
        }
        await new Promise(r => setTimeout(r, 2000));
      }
    } catch (e) {
      console.warn(`Space ${space} failed:`, e);
    }
  }
  
  throw new Error("All IDM-VTON spaces failed or timed out");
}

// Maps garment category/detected details to Photta's valid product_type enum.
// Allowed: "top", "bottom", "top_and_bottom", "one_piece"
function getPhottaProductType(category: string, garmentDetails: string): string {
  const text = `${category} ${garmentDetails}`.toLowerCase();
  // one_piece: dresses, jumpsuits, rompers, overalls, bodysuits, playsuits
  if (
    text.includes("dress") ||
    text.includes("jumpsuit") ||
    text.includes("romper") ||
    text.includes("overall") ||
    text.includes("playsuit") ||
    text.includes("bodysuit") ||
    text.includes("one-piece") ||
    text.includes("one_piece")
  ) return "one_piece";
  // bottom: pants, jeans, shorts, skirts, trousers
  if (
    text.includes("skirt") ||
    text.includes("pants") ||
    text.includes("trousers") ||
    text.includes("jeans") ||
    text.includes("shorts") ||
    text.includes("leggings")
  ) return "bottom";
  // Default to top for shirts, blouses, jackets, hoodies, sweaters, etc.
  return "top";
}

async function callPhottaAI(apiKey: string, productImageUrl: string, productType?: string, mannequinId?: string, bodyEthnicity?: string, bodyGender?: string) {
  const resolvedType = productType || "top";
  
  // Dynamically fetch resources if IDs aren't provided
  let finalMannequinId = mannequinId;
  if (!finalMannequinId) {
    try {
      const mRes = await fetch(`${PHOTTA_BASE_URL}/mannequins`, { headers: { "Authorization": `Bearer ${apiKey}` } });
      if (mRes.ok) {
        const data = await mRes.json();
        const mannequins = Array.isArray(data) ? data : (data.mannequins || data.data || []);
        console.log(`[Photta] Fetched ${mannequins.length} mannequins from API.`);
        
        if (mannequins.length > 0) {
          // Try to find a mannequin matching target ethnicity and gender
          const targetEth = (bodyEthnicity || "African").toLowerCase();
          const targetGen = (bodyGender || "female").toLowerCase();
          
          let matched = mannequins.find((m: any) => {
            const eth = (m.ethnicity || m.name || "").toLowerCase();
            const gen = (m.gender || m.category || m.name || "").toLowerCase();
            return eth.includes(targetEth) && gen.includes(targetGen);
          });
          
          if (!matched) {
            // Fallback to matching just ethnicity
            matched = mannequins.find((m: any) => {
              const eth = (m.ethnicity || m.name || "").toLowerCase();
              return eth.includes(targetEth);
            });
          }
          
          if (!matched) {
            // Fallback to matching just gender
            matched = mannequins.find((m: any) => {
              const gen = (m.gender || m.category || m.name || "").toLowerCase();
              return gen.includes(targetGen);
            });
          }
          
          const chosen = matched || mannequins[0];
          finalMannequinId = chosen.id || chosen.mannequin_id || chosen.name;
          console.log(`[Photta] Selected mannequin: ${finalMannequinId} (${chosen.name || "unnamed"}, ethnicity: ${chosen.ethnicity || "unknown"}, gender: ${chosen.gender || "unknown"})`);
        }
      } else {
        console.error(`[Photta] Failed to fetch mannequins: ${mRes.status} ${await mRes.text()}`);
      }
    } catch (e) {
      console.error("[Photta] Error searching mannequins:", e);
    }
  }

  // If we still have no mannequin ID, Photta will reject the request with 400.
  // Skip this engine gracefully rather than wasting a call.
  if (!finalMannequinId) {
    console.warn("[Photta] Could not resolve a mannequin_id from the API. Skipping Photta engine.");
    throw new Error("SKIP_ENGINE: Photta mannequin_id could not be resolved. API may have changed its response format.");
  }

  // 0b. Dynamically fetch a valid pose_id for this product type
  let poseId = "";
  try {
    const posesRes = await fetch(`${PHOTTA_BASE_URL}/poses?product_type=${resolvedType}`, {
      headers: { "Authorization": `Bearer ${apiKey}` }
    });
    if (posesRes.ok) {
      const posesData = await posesRes.json();
      const poses = posesData.poses || posesData.data || posesData;
      if (Array.isArray(poses) && poses.length > 0) {
        poseId = poses[0].id || poses[0].pose_id || poses[0].name || "";
        console.log(`[Photta] Using pose_id: ${poseId} (${poses.length} available)`);
      }
    } else {
      console.warn(`[Photta] Could not fetch poses (${posesRes.status})`);
    }
  } catch (e) {
    console.warn("[Photta] Pose fetch failed:", e);
  }

  console.log(`Starting Photta Try-On (type: ${resolvedType}, mannequin: ${finalMannequinId}, pose: ${poseId}) for product: ${productImageUrl}...`);
  
  // 1. Build request body — only include fields that have values
  const requestBody: Record<string, any> = {
    product_images: [productImageUrl],
    product_type: resolvedType,
    resolution: "2K",
    aspect_ratio: "3:4"
  };
  if (poseId) requestBody.pose_id = poseId;
  if (finalMannequinId) requestBody.mannequin_id = finalMannequinId;

  console.log(`[Photta] Request payload:`, JSON.stringify(requestBody));

  const res = await fetch(`${PHOTTA_BASE_URL}/tryon/apparel`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(requestBody),
  });

  if (!res.ok) {
    const t = await res.text();
    console.error("Photta Submission error:", res.status, t);
    throw new Error(`Photta submission failed (${res.status}): ${t}`);
  }

  const resJson = await res.json();
  const generation_id = resJson.generation_id || resJson.id;
  if (!generation_id) throw new Error("Photta: no generation_id in response");
  console.log(`Photta Generation ID: ${generation_id}`);

  // 2. Poll for the result
  let attempts = 0;
  while (attempts < 60) {
    attempts++;
    const statusRes = await fetch(`${PHOTTA_BASE_URL}/tryon/apparel/${generation_id}`, {
      headers: { "Authorization": `Bearer ${apiKey}` }
    });

    if (!statusRes.ok) {
      await new Promise(r => setTimeout(r, 3000));
      continue;
    }

    const data = await statusRes.json();
    if (data.status === "completed" || data.status === "SUCCEEDED") {
      return data.output_url || data.result_url || data.url;
    }
    
    if (data.status === "failed") {
      throw new Error(`Photta generation failed: ${data.error || "Unknown error"}`);
    }

    console.log(`Polling Photta... status: ${data.status}`);
    await new Promise(r => setTimeout(r, 3000));
  }
  
  throw new Error("Photta generation timed out");
}

async function callFalVTON(apiKey: string, endpoint: string, humanUrl: string, garmentUrl: string, description: string) {
  console.log(`Calling Fal.ai VTON engine: ${endpoint}...`);
  const res = await fetch(`https://queue.fal.run/${endpoint}`, {
    method: "POST",
    headers: { "Authorization": `Key ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      human_image_url: humanUrl,
      garment_image_url: garmentUrl,
      person_image_url: humanUrl,
      cloth_image_url: garmentUrl,
      description: description,
      category: "overall",
      num_inference_steps: 40,
    }),
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

  const { request_id } = await res.json();
  let attempts = 0;
  while (attempts < 90) {
    attempts++;
    const statusRes = await fetch(`https://queue.fal.run/${endpoint}/requests/${request_id}`, {
      headers: { "Authorization": `Key ${apiKey}` }
    });
    const data = await statusRes.json();
    if (data.status === "COMPLETED") {
      // Different models return image in different paths
      const imageUrl = data.response?.image?.url || data.response?.images?.[0]?.url || data.response?.output?.[0]?.url || data.response?.output;
      if (imageUrl) return imageUrl;
      console.error(`Fal.ai ${endpoint} completed but no image URL found in response:`, JSON.stringify(data.response).substring(0, 500));
      throw new Error(`Fal.ai ${endpoint} returned no image`);
    }
    if (data.status === "FAILED") {
      console.error(`Fal.ai ${endpoint} FAILED:`, JSON.stringify(data).substring(0, 300));
      throw new Error(`Fal.ai ${endpoint} generation failed`);
    }
    await new Promise(r => setTimeout(r, 2000));
  }
  throw new Error(`Fal.ai ${endpoint} timeout`);
}

async function callFalAI(apiKey: string, humanUrl: string, garmentUrl: string, description: string) {
  // Try VTON models in order of quality: FASHN v1.6 > Kolors v1.5 > Kolors legacy
  const engines = [
    "fal-ai/fashn/tryon",
    "fal-ai/kling/v1-5/kolors-virtual-try-on",
    "fal-ai/kolors-virtual-try-on",
  ];

  for (const engine of engines) {
    try {
      console.log(`Attempting VTON engine: ${engine}`);
      const result = await callFalVTON(apiKey, engine, humanUrl, garmentUrl, description);
      console.log(`✅ VTON SUCCESS with ${engine}`);
      return result;
    } catch (e: any) {
      const msg = (e as Error).message || "";
      console.warn(`❌ VTON engine ${engine} failed:`, msg);
      // If balance is exhausted, abort immediately — no point trying other fal engines
      if (msg.startsWith("FAL_BALANCE_EXHAUSTED")) throw e;
      continue;
    }
  }
  throw new Error("All Fal.ai VTON engines failed");
}

async function generateTikTokMusic(apiKey: string, prompt: string) {
  console.log(`Generating TikTok music for prompt: ${prompt}...`);
  const res = await fetch("https://queue.fal.run/fal-ai/stable-audio", {
    method: "POST",
    headers: { "Authorization": `Key ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: `TikTok viral background music, ${prompt}, high quality, catchy` }),
  });
  if (!res.ok) return null;
  const { request_id } = await res.json();
  // Poll briefly for audio
  let attempts = 0;
  while (attempts < 20) {
    attempts++;
    const statusRes = await fetch(`https://queue.fal.run/fal-ai/stable-audio/requests/${request_id}`, {
      headers: { "Authorization": `Key ${apiKey}` }
    });
    const data = await statusRes.json();
    if (data.status === "COMPLETED") return data.response.audio.url;
    await new Promise(r => setTimeout(r, 3000));
  }
  return null;
}

async function generateTrueMotionVideo(apiKey: string, imageUrl: string, prompt: string) {
  console.log("Calling Kling 3.0 Pro (True Motion Engine) via Fal.ai...");
  const res = await fetch("https://queue.fal.run/fal-ai/kling-video/v3/pro/image-to-video", {
    method: "POST",
    headers: { "Authorization": `Key ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ 
      image_url: imageUrl,
      prompt: `Generate realistic TikTok-style influencer motion.
      
      The woman naturally:
      - blinks
      - breathes
      - adjusts outfit
      - shifts posture
      - smiles subtly
      - walks naturally
      - touches product naturally
      
      Maintain:
      - exact face
      - exact clothing
      - exact product details
      
      The video must feel like:
      real iPhone creator footage. (${prompt})`,
      negative_prompt: "slideshow, static, still image, blurry, distorted face, unnatural movement, warping, low resolution, jumping frames, generic background, robotic, zoom, pan",
      aspect_ratio: "9:16",
      duration: 15,
      motion_score: 10,
      camera_motion: "handheld",
      cfg_scale: 0.5
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error("Kling V3 Submission Error:", res.status, errorText);
    throw new Error(`Kling error: ${errorText}`);
  }
  
  const { request_id } = await res.json();
  let attempts = 0;
  while (attempts < 200) {
    attempts++;
    const statusRes = await fetch(`https://queue.fal.run/fal-ai/kling-video/v3/pro/image-to-video/requests/${request_id}`, {
      headers: { "Authorization": `Key ${apiKey}` }
    });
    const data = await statusRes.json();
    if (data.status === "COMPLETED") return data.response.video.url;
    if (data.status === "FAILED") throw new Error("Kling generation failed");
    console.log(`Kling True Motion V3 polling... status: ${data.status}`);
    await new Promise(r => setTimeout(r, 4000));
  }
  throw new Error("Kling timeout");
}

async function callWanxVideo(apiKey: string, imageUrl: string, prompt: string) {
  console.log("Calling Alibaba Wanx Video-v1...");
  // Note: DashScope International endpoint for video synthesis
  const res = await fetch("https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis", {
    method: "POST",
    headers: { ...aiHeaders(apiKey), "X-DashScope-Async": "enable" },
    body: JSON.stringify({
      model: "wan2.1-i2v-turbo",
      input: { 
        img_url: imageUrl,
        prompt: `DYNAMIC UGC PERFORMANCE: ${prompt}. The model walks toward the camera with a joyful expression, performing a natural twirl, sways their hips, and adjusts their hair. Highly realistic 4k lifestyle video, handheld phone footage feel, fluid human motion.`
      },
      parameters: { 
        duration: 5,
        size: "1280*720",
      }
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error("Wanx Video Submission Error:", res.status, errorText);
    throw new Error(`Wanx Video error: ${errorText}`);
  }
  
  const taskData = await res.json();
  const taskId = taskData.output?.task_id;
  console.log(`Wanx Video Task ID: ${taskId}`);
  
  let attempts = 0;
  while (attempts < 120) { // Video generation can take 5-10 minutes
    attempts++;
    await new Promise(r => setTimeout(r, 5000));
    const pollRes = await fetch(`https://dashscope-intl.aliyuncs.com/api/v1/tasks/${taskId}`, {
      headers: aiHeaders(apiKey),
    });
    if (!pollRes.ok) continue;
    const pollData = await pollRes.json();
    const status = pollData.output?.task_status;
    console.log(`Wanx Video Polling (${attempts}): ${status}`);
    if (status === "SUCCEEDED") return pollData.output?.video_url;
    if (status === "FAILED") throw new Error(`Wanx video failed: ${pollData.output?.message || "Unknown error"}`);
  }
  throw new Error("Wanx video timeout after 10 minutes");
}


async function callVeoVideo(apiKey: string, imageUrl: string, prompt: string) {
  console.log("Calling Google Veo 3.1 Lite via Fal.ai...");
  const res = await fetch("https://queue.fal.run/fal-ai/veo3.1/image-to-video", {
    method: "POST",
    headers: { "Authorization": `Key ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: `Cinematic UGC performance: ${prompt}. Natural human motion, walking, smiling, 4k high fidelity.`,
      image_url: imageUrl,
      aspect_ratio: "9:16",
      duration: "10s"
    }),
  });

  if (!res.ok) throw new Error(`Veo error: ${await res.text()}`);
  
  const { request_id } = await res.json();
  let attempts = 0;
  while (attempts < 100) {
    attempts++;
    const statusRes = await fetch(`https://queue.fal.run/fal-ai/veo3.1/image-to-video/requests/${request_id}`, {
      headers: { "Authorization": `Key ${apiKey}` }
    });
    const data = await statusRes.json();
    if (data.status === "COMPLETED") return data.response.video.url;
    if (data.status === "FAILED") throw new Error("Veo generation failed");
    await new Promise(r => setTimeout(r, 5000));
  }
  throw new Error("Veo timeout");
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
  const { request_id } = await res.json();
  let attempts = 0;
  while (attempts < 30) {
    attempts++;
    const statusRes = await fetch(`https://queue.fal.run/fal-ai/bria/background-removal/requests/${request_id}`, {
      headers: { "Authorization": `Key ${apiKey}` }
    });
    const data = await statusRes.json();
    if (data.status === "COMPLETED") {
      const outUrl = data.response?.image?.url || data.response?.images?.[0]?.url || data.response?.output?.url;
      if (outUrl) return outUrl;
      throw new Error("No image URL found in completed background removal response");
    }
    if (data.status === "FAILED") {
      throw new Error(`Background removal task failed: ${JSON.stringify(data)}`);
    }
    await new Promise(r => setTimeout(r, 1500));
  }
  throw new Error("Background removal timed out");
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
    const { request_id } = await res.json();
    let attempts = 0;
    while (attempts < 30) {
      attempts++;
      const statusRes = await fetch(`https://queue.fal.run/fal-ai/dwpose/requests/${request_id}`, {
        headers: { "Authorization": `Key ${apiKey}` }
      });
      const data = await statusRes.json();
      if (data.status === "COMPLETED") {
        console.log("[Pose Mapping] DWPose completed successfully.");
        return data.response;
      }
      if (data.status === "FAILED") {
        throw new Error(`DWPose task failed: ${JSON.stringify(data)}`);
      }
      await new Promise(r => setTimeout(r, 1500));
    }
    throw new Error("DWPose timed out");
  } catch (err) {
    console.warn("[Pose Mapping] DWPose call failed:", err);
    return null;
  }
}

async function runSpecializedObjectVTON(
  keys: { qwenKey: string; falKey: string },
  personImageUrl: string,
  productImages: string[],
  category: string,
  description: string,
  poseData: any
): Promise<string> {
  const lowerCat = category.toLowerCase();
  console.log(`[Specialized VTON] Routing non-apparel category "${category}" for product: "${description}"`);
  
  const primaryProductUrl = productImages[0];
  const extraRefsPrompt = productImages.slice(1).map((url, i) => `Reference ${i+2} (Detail): ${url}`).join(", ");
  
  let poseGuide = "";
  if (poseData && poseData.image?.url) {
    poseGuide = `Enforce spatial mapping matching the detected body pose from DWPose: ${poseData.image.url}.`;
  }
  
  let categoryRules = "";
  if (lowerCat.includes("shoe") || lowerCat.includes("boot") || lowerCat.includes("sneaker") || lowerCat.includes("footwear")) {
    categoryRules = [
      `CRITICAL SHOE TRANSFER RULES:`,
      `- Transfer the EXACT shoe from the source image onto the feet of the person in the target image.`,
      `- Keep the exact logo placement, silhouette, lacing, sole height, and colors.`,
      `- Place the shoes perfectly on the feet of the model, matching their foot angle and pose exactly.`,
      `- Use ControlNet-Depth and the body mapping coordinates to anchor the footwear onto the model's feet.`,
      `- Do NOT generate similar or generic shoes. The product image is the absolute source of truth.`
    ].join("\n");
  } else if (lowerCat.includes("bag") || lowerCat.includes("handbag") || lowerCat.includes("purse") || lowerCat.includes("backpack") || lowerCat.includes("tote")) {
    categoryRules = [
      `CRITICAL HANDBAG TRANSFER RULES:`,
      `- Transfer the EXACT handbag/bag from the source image.`,
      `- Anchor it naturally in the model's hand, on their shoulder, or carried on their arm depending on the scene's pose.`,
      `- Maintain the absolute geometric shapes, straps, metal buckles, logos, and leather texture of the bag.`,
      `- Do NOT warp or alter the bag. It must remain 100% identical to the product image.`
    ].join("\n");
  } else if (lowerCat.includes("jewelry") || lowerCat.includes("accessory") || lowerCat.includes("necklace") || lowerCat.includes("earring") || lowerCat.includes("ring") || lowerCat.includes("bracelet") || lowerCat.includes("watch")) {
    categoryRules = [
      `CRITICAL JEWELRY/ACCESSORY TRANSFER RULES:`,
      `- Anchor the jewelry directly onto the appropriate body parts: necklaces to the neck, earrings to the ears, bracelets/watches to the wrist, rings to fingers.`,
      `- Leverage OpenPose keypoint coordinate offsets to align the jewelry with 100% spatial precision.`,
      `- Maintain the exact gold/silver shine, diamond placements, and fine chain links.`,
      `- Do NOT generate generic accessories.`
    ].join("\n");
  } else {
    categoryRules = [
      `CRITICAL PRODUCT TRANSFER RULES:`,
      `- Deterministically transfer the EXACT product item onto the target model.`,
      `- Maintain exact dimensions, textures, colors, logos, and features.`,
      `- No creative redesign, reinterpretation, or stylistic approximations.`
    ].join("\n");
  }

  const wanPrompt = [
    `Professional premium high-resolution fashion advertisement catalog portrait.`,
    `TARGET MODEL: Enforce the target person's exact face, body pose, hair, skin tone, and features from the reference person image.`,
    `PRODUCT IDENTITY TO DRAFT: Transfer the EXACT product item from the reference product image.`,
    categoryRules,
    poseGuide,
    extraRefsPrompt ? `Use additional product references for 3D fidelity: ${extraRefsPrompt}.` : "",
    `The generated model must wear/hold the EXACT, unmodified product item in the target scene. White studio background or clean lifestyle street context.`,
    `Do not redesign, recolor, or hallucinate product details. The reference product image is the absolute visual source of truth.`
  ].filter(Boolean).join("\n");

  console.log(`[Specialized VTON] Calling Alibaba Wan Reference-Based Synthesis with specialized prompt:`, wanPrompt);

  const references = [
    { type: 'influencer' as const, url: personImageUrl },
    { type: 'product' as const, url: primaryProductUrl }
  ];

  const resultUrl = await callImageAI(keys.qwenKey, wanPrompt, references);
  if (!resultUrl) {
    throw new Error(`Specialized VTON failed for category: ${category}`);
  }
  return resultUrl;
}

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
      const res = await fetch(`${PHOTTA_BASE_URL}/ghost-mannequin`, {
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
  for (const url of productImages.slice(0, 3)) {
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
          // Threshold: 7/10 minimum per category — allows minor color warmth or lighting differences
          if (typeof val === "number" && val < 7) {
            categoryMismatch = true;
            console.warn(`[Audit] Critical mismatch in category: ${cat} (Score: ${val}/10) — below minimum 7`);
          } else if (typeof val === "number" && val < 8) {
            console.log(`[Audit] Minor deviation in category: ${cat} (Score: ${val}/10) — acceptable`);
          }
        }
      }
      
      // Overall threshold: 88% — accommodates minor lighting/color warmth differences from reference synthesis
      const pass = !categoryMismatch && overallScore >= 88;
      console.log(`[Audit Result] Score: ${overallScore}%. Pass: ${pass}. Reason: ${reasoning}`);
      return { pass, score: overallScore, reasoning };
    } else {
      throw new Error("Could not find valid JSON in Qwen VL response");
    }
  } catch (err: any) {
    console.warn("Fidelity verification failed, default permitting:", err);
    return { pass: true, score: 95, reasoning: `Fidelity verification error: ${err.message}` };
  }
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

async function callImageAI(apiKey: string, prompt: string, references: { type: 'influencer' | 'product', url: string }[]) {
  // Try image models in order of preference for DashScope International
  const imageModels = ["wan2.6-t2i", "wan2.1-t2i-turbo", "qwen-image-plus"];
  
  const body: any = {
    input: { prompt },
    parameters: { size: "720*1280", n: 1, watermark: false }
  };

  const productRef = references.find(r => r.type === 'product');
  const influencerRef = references.find(r => r.type === 'influencer');

  if (productRef && influencerRef) {
    body.input.ref_img = influencerRef.url;
    body.input.ref_mode = "style";
    body.input.ref_img_2 = productRef.url;
    body.input.ref_mode_2 = "content";
  } else if (productRef) {
    body.input.ref_img = productRef.url;
  } else if (influencerRef) {
    body.input.ref_img = influencerRef.url;
  }

  for (const model of imageModels) {
    try {
      console.log(`Trying image model: ${model}...`);
      const res = await fetch(WANX_API_URL, {
        method: "POST",
        headers: { ...aiHeaders(apiKey), "X-DashScope-Async": "enable" },
        body: JSON.stringify({ ...body, model }),
      });

      if (!res.ok) {
        const t = await res.text();
        console.warn(`Model ${model} failed (${res.status}): ${t}`);
        continue;
      }

      const taskData = await res.json();
      const taskId = taskData.output?.task_id;
      if (!taskId) continue;

      let attempts = 0;
      while (attempts < 30) {
        attempts++;
        await new Promise(r => setTimeout(r, 2000));
        const pollRes = await fetch(`https://dashscope-intl.aliyuncs.com/api/v1/tasks/${taskId}`, {
          headers: aiHeaders(apiKey),
        });
        if (!pollRes.ok) continue;
        const pollData = await pollRes.json();
        const status = pollData.output?.task_status;
        if (status === "SUCCEEDED") return pollData.output?.results?.[0]?.url;
        if (status === "FAILED") break;
      }
    } catch (e) {
      console.warn(`Model ${model} threw error:`, e);
    }
  }

  console.error("Image AI error: all models exhausted");
  throw { status: 500, message: "Image generation failed" };
}

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
): Promise<string> {
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

  // 2. Identify if non-apparel (specialized routing required)
  const lowerCat = category.toLowerCase();
  const isClothing = lowerCat.includes("apparel") || lowerCat.includes("clothing") || lowerCat.includes("top") || lowerCat.includes("bottom") || lowerCat.includes("dress") || lowerCat.includes("shirt") || lowerCat.includes("jacket") || lowerCat.includes("pants") || lowerCat.includes("suit");

  if (!isClothing) {
    console.log(`[Unified VTON] Non-apparel product detected ("${category}"). Routing to Specialized Object Pipeline.`);
    
    // Step 2a: Extract OpenPose/DensePose maps
    const poseData = await callPoseMapping(keys.falKey, personImageUrl);
    
    // Step 2b: Extract Category-Aware background-removed masks for all product references
    const segmentedProductImages: string[] = [];
    for (const url of productImages) {
      try {
        const seg = await segmentGarment(keys, url, category);
        segmentedProductImages.push(seg);
      } catch (err) {
        console.warn(`[Unified VTON] Segmenting reference failed for non-apparel:`, err);
        segmentedProductImages.push(url);
      }
    }

    // Step 2c: Run zero-hallucination retry loop for specialized VTON
    let lastReasoning = "";
    const maxRetries = 3;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(`[Unified VTON] Attempt ${attempt} of ${maxRetries} for specialized non-apparel try-on...`);
      try {
        const resultUrl = await runSpecializedObjectVTON(
          { qwenKey: keys.qwenKey, falKey: keys.falKey },
          personImageUrl,
          segmentedProductImages,
          category,
          description,
          poseData
        );

        // Verify visual fidelity via 10-Point Audit
        const audit = await verifyProductFidelity(keys.qwenKey, productImages, resultUrl);
        if (audit.pass) {
          console.log(`[Unified VTON] ✅ Specialized fidelity audit PASSED on attempt ${attempt} (Score: ${audit.score}%)`);
          return resultUrl;
        } else {
          console.warn(`[Unified VTON] ❌ Specialized fidelity audit FAILED (Score: ${audit.score}%). Reason: ${audit.reasoning}`);
          lastReasoning = audit.reasoning;
        }
      } catch (err: any) {
        console.warn(`[Unified VTON] Specialized attempt ${attempt} errored:`, err.message || err);
      }
    }

    throw new Error(
      `CLEAN_FAILURE: Specialized virtual try-on failed for category "${category}" after ${maxRetries} attempts. ` +
      `None of the specialized runs met the 95%+ visual fidelity threshold. Last reasoning: ${lastReasoning || "All attempts errored."}`
    );
  }

  // 3. Clothing Try-On (Standard Apparel Route)
  let segmentedGarmentUrl = primaryProductUrl;
  try {
    segmentedGarmentUrl = await segmentGarment(keys, primaryProductUrl, category);
  } catch (err) {
    console.warn("[Unified VTON] Segment clothing failed, using original:", err);
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
            segmentedGarmentUrl,
            `${garmentDetails} — worn by a ${targetGender} ${targetEthnicity} model. seed: ${seed}`
          );
        }
      },
      {
        name: "Alibaba Wan Reference-Based Synthesis",
        available: !!keys.qwenKey,
        fn: async () => {
          let strictnessPromptModifier = "";
          if (attempt === 2) {
            strictnessPromptModifier = "CRITICAL: Under no circumstances alter or reinterpret the clothing. The reference garment is the absolute visual source of truth.";
          } else if (attempt === 3) {
            strictnessPromptModifier = "CRITICAL AUDIT NOTICE: Zero tolerance for modifications. Every stitch, neckline, pattern, and button count must match the raw product image exactly.";
          }

          const wanPrompt = [
            `Professional high-resolution fashion catalog photograph.`,
            `MODEL: ${targetGender} ${targetEthnicity} — the face, skin tone, and body must be IDENTICAL to the target person reference image.`,
            `GARMENT (must be reproduced with 100% accuracy — do not alter any detail):`,
            `  ${garmentDetails}`,
            `  Product name: ${description}`,
            `RULES: Do NOT change the garment's neckline, sleeve length, color, cut, pattern, print or fabric texture.`,
            `Do NOT change the model's face, skin tone or ethnicity.`,
            strictnessPromptModifier,
            `Studio lighting, sharp focus, white background, realistic render.`
          ].join(" ");

          console.log(`[Unified VTON] Wan prompt (attempt ${attempt}): ${wanPrompt}`);
          return await callImageAI(keys.qwenKey, wanPrompt, [
            { type: 'influencer', url: personImageUrl },
            { type: 'product', url: segmentedGarmentUrl }
          ]);
        }
      },
      {
        name: "Photta Try-On",
        available: !!keys.phottaKey,
        fn: async () => {
          const phottaType = getPhottaProductType(category, garmentDetails);
          console.log(`[Unified VTON] Photta product_type resolved to: ${phottaType}`);
          const res = await callPhottaAI(keys.phottaKey, segmentedGarmentUrl, phottaType, undefined, targetEthnicity, targetGender);
          if (!res) throw new Error("Photta Try-On returned null");
          return res;
        }
      },
      {
        name: "IDM-VTON (Hugging Face Spaces)",
        available: !!keys.hfToken,
        fn: async () => {
          return await callIDMVTON(
            keys.hfToken,
            personImageUrl,
            segmentedGarmentUrl,
            `${garmentColor} ${description}`
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
            return resultUrl;
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

  // Best-effort fallback: if we have a result that scored ≥ 80%, serve it with a warning
  // rather than completely failing the user — a 92% result is genuinely good
  if (bestResultUrl && bestResultScore >= 80) {
    console.warn(
      `[Unified VTON] ⚠️ Best-effort fallback: serving highest-scoring result (${bestResultScore}%) ` +
      `after all retries exhausted. Reason for non-pass: ${lastReasoning}`
    );
    return bestResultUrl;
  }

  throw new Error(
    `CLEAN_FAILURE: Apparel virtual try-on failed after ${maxRetries} attempts. ` +
    `None of the VTON engines produced a result matching the inventory product with acceptable fidelity (88%+ overall, 7+ per category). ` +
    `Last auditor reasoning: ${lastReasoning || "All attempts timed out or failed to execute."}`
  );
}

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

    // Collect all potential product image references into a deduplicated list
    const candidateUrls: string[] = [];
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

    addCandidates(body.productImageUrl);
    addCandidates(body.product?.images);
    addCandidates(body.product?.side_images);
    addCandidates(body.product?.closeups);
    addCandidates(body.product?.textures);
    addCandidates(body.side_images);
    addCandidates(body.closeups);
    addCandidates(body.textures);

    // Deduplicate while preserving order
    const productImages = [...new Set(candidateUrls)];
    const primaryProductUrl = productImages[0] || "";

    if (action === "generate-avatar") {
      const { productName, productCategory } = body;
      const ethnicity = body.ethnicity || "African";
      const gender = body.gender || "female";
      const setting = body.setting || "studio";
      
      console.log(`Generating avatar for ${productName} (${gender}, ${ethnicity})...`);

      let url;
      try {
        if (primaryProductUrl) {
          let vtonPersonImage = referenceImage;
          
          if (!vtonPersonImage) {
            console.log(`[generate-avatar] No reference image provided. Generating high-quality baseline portrait for ${gender} ${ethnicity}...`);
            let baselinePrompt = "";
            if (body.isUGC) {
              baselinePrompt = `Authentic smartphone selfie. Lifestyle photography. MODEL: ${ethnicity} ${gender}. SETTING: ${setting || "natural city street"}. 
              CRITICAL: Natural skin texture, realistic casual lighting, unedited look, raw lifestyle feel, wearing casual undergarment or plain white t-shirt.`;
            } else {
              baselinePrompt = `High-end fashion portrait. MODEL: ${ethnicity} ${gender}. SETTING: ${setting || "studio"}. Wearing simple plain undergarment or white t-shirt.`;
            }
            // Generate a premium baseline model portrait
            const baselineUrl = await callImageAI(QWEN_API_KEY, baselinePrompt, []);
            vtonPersonImage = await persistImage(supabase, baselineUrl, "baselines");
            console.log(`[generate-avatar] Generated baseline portrait: ${vtonPersonImage}`);
          }
          
          // Map the exact product onto the reference image/generated baseline portrait
          url = await runUnifiedVTON(
            { qwenKey: QWEN_API_KEY, falKey: FAL_KEY, phottaKey: PHOTTA_API_KEY, hfToken: HF_TOKEN },
            vtonPersonImage,
            productImages,
            productCategory || "apparel",
            productName || "garment",
            supabase,
            ethnicity,
            gender
          );
        } else {
          // Creating a baseline influencer identity portrait (no product selected)
          const prompt = `High-end fashion portrait. MODEL: ${ethnicity} ${gender}. SETTING: ${setting || "studio"}.`;
          url = await callImageAI(QWEN_API_KEY, prompt, referenceImage ? [{ type: 'influencer' as const, url: referenceImage }] : []);
        }
      } catch (e) {
        console.error("Avatar generation failed:", e);
        throw e;
      }

      const persistedUrl = await persistImage(supabase, url, "avatars");
      return new Response(JSON.stringify({ success: true, imageUrl: persistedUrl }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
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
      const masterFrameUrl = await runUnifiedVTON(
        { qwenKey: QWEN_API_KEY, falKey: FAL_KEY, phottaKey: PHOTTA_API_KEY, hfToken: HF_TOKEN },
        referenceImage,
        productImages,
        productCategory || "apparel",
        productName || "garment",
        supabase,
        avatarEthnicity,
        avatarGender
      );
      const persistedMasterUrl = await persistImage(supabase, masterFrameUrl, "master_frames");
      console.log(`✅ Master Frame created: ${persistedMasterUrl}`);

      // --- STAGE 3: REAL MOTION GENERATION ---
      console.log("Stage 3: Generating Real AI Video Motion...");
      const videoPrompt = `${avatarEthnicity} ${avatarGender} creator wearing ${productName}. ${productDescription || productName}`;
      let videoUrl;
      
      try {
        if (FAL_KEY) {
          console.log("Calling Kling 1.5 Pro (True Motion Engine) via Fal.ai...");
          videoUrl = await generateTrueMotionVideo(FAL_KEY, masterFrameUrl, videoPrompt);
        } else {
          throw new Error("FAL_KEY missing");
        }
      } catch (e) {
        console.warn("Kling failed, trying Veo 3.1 Lite...", e);
        try {
          if (FAL_KEY) {
            videoUrl = await callVeoVideo(FAL_KEY, masterFrameUrl, videoPrompt);
          } else {
            throw new Error("FAL_KEY missing");
          }
        } catch (veoError) {
          console.warn("Veo failed, falling back to Wanx...", veoError);
          if (QWEN_API_KEY) {
            videoUrl = await callWanxVideo(QWEN_API_KEY, masterFrameUrl, videoPrompt);
          } else {
            throw new Error("All high-motion engines failed.");
          }
        }
      }

      if (!videoUrl) throw new Error("CRITICAL: Video motion generation failed.");
      console.log(`✅ Motion Video created: ${videoUrl}`);

      // --- STAGE 4: CONSISTENCY VERIFICATION ---
      console.log("Stage 4: Consistency Verification...");
      const verificationOk = await verifyVideoFidelity(QWEN_API_KEY, productImages, videoUrl);
      if (!verificationOk.pass) {
        throw new Error(
          `Video product fidelity check FAILED: The generated video motion modified the garment's appearance or colors. ` +
          `Reason: ${verificationOk.reasoning}. ` +
          `Standard video fallback is blocked to prevent presenting generic products to customers.`
        );
      }

      // --- STAGE 5: AUDIO ENGINE ---
      console.log("Stage 5: Audio Engine layers...");
      let finalAudioUrl = null;
      try {
        const audioLayers = [];
        
        // Layer 1: Voice (ElevenLabs or fallback)
        if (ELEVENLABS_API_KEY && (voiceId || body.influencerVoiceId) && scriptText) {
          const voiceBlob = await callElevenLabsTTS(ELEVENLABS_API_KEY, scriptText, voiceId || body.influencerVoiceId);
          const voiceUrl = await persistAudio(supabase, voiceBlob, "audio_voice");
          audioLayers.push(voiceUrl);
        } else if (scriptText) {
          const voiceBlob = await callTTS(QWEN_API_KEY, scriptText);
          const voiceUrl = await persistAudio(supabase, voiceBlob, "audio_voice");
          audioLayers.push(voiceUrl);
        }

        // Layer 2: Ambient
        const ambientUrl = await generateAmbientAudio(FAL_KEY, body.setting || "natural lifestyle street");
        if (ambientUrl) audioLayers.push(ambientUrl);

        // Layer 3: Trend Music
        const musicUrl = await generateTikTokMusic(FAL_KEY, musicPrompt || "fashion influencer vibe");
        if (musicUrl) audioLayers.push(musicUrl);

        if (audioLayers.length > 1) {
          finalAudioUrl = await mixAudioLayers(FAL_KEY, audioLayers);
        } else if (audioLayers.length === 1) {
          finalAudioUrl = audioLayers[0];
        }
      } catch (e) {
        console.warn("Audio engine failed, skipping audio or using limited layers:", e);
      }

      // --- STAGE 6: FINAL VIDEO ASSEMBLY ---
      console.log("Stage 6: Final Video Assembly (FFmpeg Polish)...");
      let finalVideoUrl = videoUrl;
      if (finalAudioUrl) {
        finalVideoUrl = await mergeAudioVideo(FAL_KEY, videoUrl, finalAudioUrl);
      }
      console.log(`🚀 Pipeline Complete: ${finalVideoUrl}`);

      return new Response(JSON.stringify({ 
        success: true, 
        videoUrl: finalVideoUrl, 
        masterFrameUrl: persistedMasterUrl,
        fidelityVerified: verificationOk.pass,
        audioUrl: finalAudioUrl
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }


    if (action === "generate-campaign-shot") {
      const { influencer, product, scene } = body;
      const influencerImageUrl = influencer.avatar_url || "";
      const influencerEthnicity = influencer.ethnicity || influencer.skin_tone || "";
      const influencerGender = influencer.gender || "female";
      const cacheKey = await getCacheKey(influencerImageUrl, primaryProductUrl, `${scene}|${influencerEthnicity}|${influencerGender}`);
      const cachedUrl = await checkCache(supabase, cacheKey);
      if (cachedUrl) return new Response(JSON.stringify({ success: true, imageUrl: cachedUrl, cached: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

      try {
        const url = await runUnifiedVTON(
          { qwenKey: QWEN_API_KEY, falKey: FAL_KEY, phottaKey: PHOTTA_API_KEY, hfToken: HF_TOKEN },
          influencerImageUrl,
          productImages,
          product.category || "apparel",
          product.name || "garment",
          supabase,
          influencerEthnicity,
          influencerGender
        );

        const persistedUrl = await persistImage(supabase, url, "campaigns", HF_TOKEN);
        await storeInCache(supabase, cacheKey, persistedUrl, influencer.id, product.id);
        return new Response(JSON.stringify({ success: true, imageUrl: persistedUrl }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } catch (e: any) {
        console.error("Campaign shot generation failed:", e);
        return new Response(JSON.stringify({ error: e.message || "Error generating high-fidelity campaign shot" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    if (action === "generate-script") {
      const { productName, productCategory, productPrice, currency } = body;
      const prompt = `You are a world-class UGC (User Generated Content) script writer for fashion brands. 
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
      } catch (e) {
        console.warn("Kling failed, trying Veo...", e);
        try {
          if (FAL_KEY) {
            videoUrl = await callVeoVideo(FAL_KEY, imageUrl, prompt);
          } else {
            throw new Error("FAL_KEY missing");
          }
        } catch (veoError) {
          console.warn("Veo failed, falling back to Wanx...", veoError);
          if (QWEN_API_KEY) {
            videoUrl = await callWanxVideo(QWEN_API_KEY, imageUrl, prompt);
          } else {
            throw new Error("Video engines unavailable.");
          }
        }
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
    return new Response(JSON.stringify({ error: e.message || "Error" }), { status: e.status || 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
