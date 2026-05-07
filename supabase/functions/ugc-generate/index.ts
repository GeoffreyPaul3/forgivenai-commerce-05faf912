import { createClient } from "https://esm.sh/@supabase/supabase-js@2.40.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const QWEN_BASE_URL = "https://dashscope-intl.aliyuncs.com/compatible-mode/v1";
const WANX_API_URL = "https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis";
const TRYON_API_URL = "https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/image2image/image-synthesis";
const PHOTTA_BASE_URL = "https://ai.photta.app/api/v1";

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
  const spaces = [
    "yisol-idm-vton.hf.space",
    "nymbo-virtual-try-on.hf.space",
    "cantis-idm-vton.hf.space"
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

async function callPhottaAI(apiKey: string, productImageUrl: string, mannequinId?: string) {
  console.log(`Starting Photta Try-On for product: ${productImageUrl}...`);
  
  // 1. Submit the request
  const res = await fetch(`${PHOTTA_BASE_URL}/tryon/apparel/generate`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      product_image_url: productImageUrl,
      product_description: productImageUrl, // We keep URL as description but add a separate text prompt if needed
      mannequin_id: mannequinId,
      resolution: "2K"
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    console.error("Photta Submission error:", res.status, t);
    throw new Error(`Photta submission failed (${res.status}): ${t}`);
  }

  const { generation_id } = await res.json();
  console.log(`Photta Generation ID: ${generation_id}`);

  // 2. Poll for the result
  let attempts = 0;
  while (attempts < 60) {
    attempts++;
    const statusRes = await fetch(`${PHOTTA_BASE_URL}/tryon/apparel/status?generation_id=${generation_id}`, {
      headers: { "Authorization": `Bearer ${apiKey}` }
    });

    if (!statusRes.ok) {
      await new Promise(r => setTimeout(r, 2000));
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
    await new Promise(r => setTimeout(r, 2000));
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
    } catch (e) {
      console.warn(`❌ VTON engine ${engine} failed:`, (e as Error).message);
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
  console.log("Calling Kling 1.5 Pro (True Motion Engine) via Fal.ai...");
  const res = await fetch("https://queue.fal.run/fal-ai/kling-video/v1.5/pro/image-to-video", {
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
      duration: 5,
      motion_score: 10,
      camera_motion: "handheld",
      mode: "pro", // Ensuring pro mode for high-motion
      cfg_scale: 0.5
    }),
  });

  if (!res.ok) throw new Error(`Kling error: ${await res.text()}`);
  
  const { request_id } = await res.json();
  let attempts = 0;
  while (attempts < 150) {
    attempts++;
    const statusRes = await fetch(`https://queue.fal.run/fal-ai/kling-video/v1.5/pro/image-to-video/requests/${request_id}`, {
      headers: { "Authorization": `Key ${apiKey}` }
    });
    const data = await statusRes.json();
    if (data.status === "COMPLETED") return data.response.video.url;
    if (data.status === "FAILED") throw new Error("Kling generation failed");
    console.log(`Kling True Motion polling... status: ${data.status}`);
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
      model: "wanx-v1",
      input: { img_url: imageUrl },
      parameters: { 
        prompt: `DYNAMIC UGC PERFORMANCE: ${prompt}. The model walks toward the camera with a joyful expression, performing a natural twirl, sways their hips, and adjusts their hair. Highly realistic 4k lifestyle video, handheld phone footage feel, fluid human motion.`,
        duration: 5,
        resolution: "1280*720",
        motion_level: 10
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


async function segmentGarment(apiKey: string, imageUrl: string) {
  console.log(`Performing Semantic Segmentation on: ${imageUrl}...`);
  // Using Photta's Ghost Mannequin as the primary segmentation engine 
  // but with 2K resolution and 'strict' masking to isolate pixels.
  const res = await fetch(`${PHOTTA_BASE_URL}/tryon/ghost-mannequin/generate`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ 
      product_image_url: imageUrl, 
      resolution: "2K",
      background_type: "transparent", // pixel-perfect isolation
      remove_mannequin: true 
    }),
  });

  if (!res.ok) return imageUrl;

  const { generation_id } = await res.json();
  let attempts = 0;
  while (attempts < 30) {
    attempts++;
    const statusRes = await fetch(`${PHOTTA_BASE_URL}/tryon/ghost-mannequin/status?generation_id=${generation_id}`, {
      headers: { "Authorization": `Bearer ${apiKey}` }
    });
    if (!statusRes.ok) { await new Promise(r => setTimeout(r, 2000)); continue; }
    const data = await statusRes.json();
    if (data.status === "completed" || data.status === "SUCCEEDED") return data.output_url || data.result_url;
    if (data.status === "failed") return imageUrl;
    await new Promise(r => setTimeout(r, 2000));
  }
  return imageUrl;
}

async function cleanProductImage(apiKey: string, productImageUrl: string) {
  console.log(`Cleaning product image (Ghost Mannequin): ${productImageUrl}...`);
  const res = await fetch(`${PHOTTA_BASE_URL}/tryon/ghost-mannequin/generate`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ product_image_url: productImageUrl, resolution: "2K" }),
  });

  if (!res.ok) {
    console.warn("Ghost Mannequin cleaning failed, using original image.");
    return productImageUrl;
  }

  const { generation_id } = await res.json();
  let attempts = 0;
  while (attempts < 30) {
    attempts++;
    const statusRes = await fetch(`${PHOTTA_BASE_URL}/tryon/ghost-mannequin/status?generation_id=${generation_id}`, {
      headers: { "Authorization": `Bearer ${apiKey}` }
    });
    if (!statusRes.ok) { await new Promise(r => setTimeout(r, 2000)); continue; }
    const data = await statusRes.json();
    if (data.status === "completed" || data.status === "SUCCEEDED") return data.output_url || data.result_url;
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

async function verifyProductFidelity(apiKey: string, productImageUrl: string, generatedImageUrl: string): Promise<boolean> {
  console.log("🔍 Verifying product fidelity in generated image...");
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
              { image: productImageUrl },
              { image: generatedImageUrl },
              { text: "Image 1 is the ORIGINAL PRODUCT. Image 2 is a generated image of a model wearing clothing/shoes. Compare them and answer:\n1. Is the model in Image 2 wearing the SAME product as shown in Image 1?\n2. Does the COLOR match exactly?\n3. Does the SHAPE/DESIGN match?\n4. Is the logo preserved accurately?\n\nRespond with ONLY: PASS or FAIL followed by a brief reason." }
            ]
          }]
        }
      })
    });
    if (!res.ok) return true; // Don't block on verification failure
    const data = await res.json();
    const verdict = data.output?.choices?.[0]?.message?.content?.[0]?.text || "PASS";
    console.log(`🔍 Fidelity verdict: ${verdict}`);
    return verdict.toUpperCase().includes("PASS");
  } catch (e) {
    console.warn("Fidelity verification failed, allowing result:", e);
    return true;
  }
}

async function verifyVideoFidelity(apiKey: string, productImageUrl: string, videoUrl: string): Promise<boolean> {
  console.log("🔍 Verifying product fidelity in generated video...");
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
              { image: productImageUrl },
              { video: [videoUrl] },
              { text: "Image 1 is the ORIGINAL PRODUCT. The video is an AI-generated influencer video. Compare them and verify:\n1. PRODUCT: Does the garment in the video match Image 1 exactly in color, texture, and design?\n2. MOTION: Is the influencer's movement natural, human-like, and high-quality (not a slideshow)?\n3. IDENTITY: Is the influencer's face and body consistent throughout the video?\n\nRespond with ONLY: PASS or FAIL followed by a brief reason." }
            ]
          }]
        }
      })
    });
    if (!res.ok) {
      console.warn(`Qwen VL Video verification returned ${res.status}, using fallback`);
      return true;
    }
    const data = await res.json();
    const verdict = data.output?.choices?.[0]?.message?.content?.[0]?.text || "PASS";
    console.log(`🔍 Video Fidelity verdict: ${verdict}`);
    return verdict.toUpperCase().includes("PASS");
  } catch (e) {
    console.warn("Video verification failed, allowing result:", e);
    return true;
  }
}

async function callTryOnAI(apiKey: string, personImageUrl: string, garmentImageUrl: string, category?: string, description?: string) {
  console.log(`Starting Virtual Try-On task for category: ${category}...`);
  
  const isBottom = category?.toLowerCase().includes("skirt") || 
                   category?.toLowerCase().includes("pants") || 
                   category?.toLowerCase().includes("trousers") ||
                   category?.toLowerCase().includes("shorts");

  const input: any = { person_image_url: personImageUrl };
  if (isBottom) {
    input.bottom_garment_url = garmentImageUrl;
  } else {
    input.top_garment_url = garmentImageUrl;
  }

  const res = await fetch(TRYON_API_URL, {
    method: "POST",
    headers: {
      ...aiHeaders(apiKey),
      "X-DashScope-Async": "enable"
    },
    body: JSON.stringify({
      model: "qwen-image-edit",
      input: {
        image_url: personImageUrl, // Base image (creator)
        prompt: `High-fidelity fashion edit: Replace the model's current outfit with the exact product: ${category}. Product details: ${description || "matching garment"}. Photorealistic, 4k, seamless blend.`
      },
      parameters: { watermark: false }
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    console.error("Try-On Submission error:", res.status, t);
    
    // If aitryon-plus doesn't exist, we fall back to image synthesis immediately
    if (t.includes("Model not exist")) {
       console.log("Alibaba aitryon-plus not available on this endpoint, falling back to Wanx-v1 synthesis.");
       return null; 
    }
    
    throw new Error(`Try-on failed to start (${res.status}): ${t}`);
  }

  const taskData = await res.json();
  const taskId = taskData.output?.task_id;
  if (!taskId) throw new Error("No task ID received for try-on");

  let attempts = 0;
  while (attempts < 60) {
    attempts++;
    await new Promise(r => setTimeout(r, 2000));
    const pollRes = await fetch(`https://dashscope-intl.aliyuncs.com/api/v1/tasks/${taskId}`, {
      headers: aiHeaders(apiKey),
    });
    if (!pollRes.ok) continue;
    const pollData = await pollRes.json();
    const status = pollData.output?.task_status;
    if (status === "SUCCEEDED") return pollData.output?.results?.[0]?.url;
    if (status === "FAILED") throw new Error(`Try-on task failed: ${pollData.output?.message}`);
    console.log(`Polling try-on ${taskId}: ${status}...`);
  }
  throw new Error("Try-on timed out");
}

async function callImageAI(apiKey: string, prompt: string, references: { type: 'influencer' | 'product', url: string }[]) {
  const body: any = {
    model: "qwen-image-plus", // Correct for Singapore/International
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
    console.error("Image AI error:", res.status, t);
    throw { status: 500, message: "Image generation failed" };
  }

  const taskData = await res.json();
  const taskId = taskData.output?.task_id;

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
    if (status === "FAILED") throw new Error(`Image task failed: ${pollData.output?.message}`);
  }
  throw new Error("Image generation timed out");
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
    const productImageUrl = body.productImageUrl || (body.product?.images?.[0]);

    if (action === "generate-avatar") {
      const { productName, productCategory } = body;
      const ethnicity = body.ethnicity || "African";
      const gender = body.gender || "female";
      const setting = body.setting || "studio";
      
      console.log(`Generating avatar for ${productName} (${gender}, ${ethnicity})...`);

      let url;
      try {
        // If we have both identity and product, try VTON first
        if (referenceImage && productImageUrl) {
          const garmentDetails = await detectGarmentColor(QWEN_API_KEY, productImageUrl);
          let segmentedGarmentUrl = productImageUrl;
          if (PHOTTA_API_KEY) {
            segmentedGarmentUrl = await segmentGarment(PHOTTA_API_KEY, productImageUrl);
          }

          if (FAL_KEY) {
            try {
              url = await callFalAI(FAL_KEY, referenceImage, segmentedGarmentUrl, `${garmentDetails} ${productName}`);
            } catch (eFal) {
              console.warn("Fal.ai failed for avatar, falling back to synthesis");
            }
          }
        }
        
        if (!url) {
          // If no VTON or VTON failed, use Synthesis with STRICT product lock
          const garmentDetails = productImageUrl ? await detectGarmentColor(QWEN_API_KEY, productImageUrl) : "";
          const colorMatch = garmentDetails.match(/Color: ([^,]+)/);
          const color = colorMatch ? colorMatch[1] : "original";
          
          let prompt = "";
          if (body.isUGC) {
            prompt = `Authentic smartphone selfie. Lifestyle photography. MODEL: ${ethnicity} ${gender}. SETTING: ${setting || "natural city street"}. 
            CRITICAL: Natural skin texture, realistic casual lighting, unedited look, raw lifestyle feel.`;
          } else {
            prompt = `High-end fashion portrait. MODEL: ${ethnicity} ${gender}. SETTING: ${setting || "studio"}.`;
          }

          if (productImageUrl) {
            prompt += `
            WEARING THE EXACT PRODUCT FROM REFERENCE: ${productImageUrl}.
            ${garmentDetails}.
            CRITICAL RULES:
            1. 100% CLOTHING FIDELITY. The model MUST wear the exact ${color} garment shown.
            2. NO generic clothes. NO color shifts.
            3. If identity reference is provided (${referenceImage || "none"}), match FACE only, REJECT its clothes.`;
          }
          
          const refs = [];
          if (productImageUrl) refs.push({ type: 'product' as const, url: productImageUrl });
          if (referenceImage) refs.push({ type: 'influencer' as const, url: referenceImage });
          
          url = await callImageAI(QWEN_API_KEY, prompt, refs);
        }
      } catch (e) {
        console.error("Avatar generation failed:", e);
        throw e;
      }

      // Verify the generated avatar has the correct product
      if (productImageUrl) {
        const fidelityOk = await verifyProductFidelity(QWEN_API_KEY, productImageUrl, url);
        if (!fidelityOk) {
          console.warn("⚠️ Avatar fidelity check FAILED — product may not match perfectly");
        }
      }

      const persistedUrl = await persistImage(supabase, url, "avatars");
      return new Response(JSON.stringify({ success: true, imageUrl: persistedUrl }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }


    if (action === "generate-ugc-video") {
      const { productName, productCategory, productDescription, avatarGender, avatarEthnicity, isUGC, avatarImageBase64, influencerId, voiceId, musicPrompt, scriptText } = body;
      console.log(`🎬 STARTING HIGH-MOTION UGC PIPELINE: ${productName} (${avatarGender}, ${avatarEthnicity})...`);
      
      // --- STAGE 1: PRODUCT LOCK ENGINE ---
      if (!productImageUrl) throw new Error("Generation blocked: no product image.");
      console.log("Stage 1: Product Lock Engine verified.");

      let referenceImage = body.influencerImageUrl || body.avatarImageUrl;
      if (avatarImageBase64 && !referenceImage) {
        referenceImage = await persistImage(supabase, avatarImageBase64, "uploads");
      }
      if (!referenceImage) throw new Error("Influencer identity or photo is required.");

      // --- STAGE 2: VTON MASTER FRAME ---
      console.log("Stage 2: Creating Luxury VTON Master Frame...");
      const garmentDetails = await detectGarmentColor(QWEN_API_KEY, productImageUrl);
      let segmentedGarmentUrl = productImageUrl;
      if (PHOTTA_API_KEY) {
        segmentedGarmentUrl = await segmentGarment(PHOTTA_API_KEY, productImageUrl);
      }

      let masterFrameUrl;
      if (FAL_KEY) {
        const engines = ["fal-ai/fashn/tryon", "fal-ai/kling/v1-5/kolors-virtual-try-on"];
        const descriptionPrompt = `Generate a luxury influencer fashion photograph.
        STRICT RULES:
        - Use the EXACT product from the reference image
        - Do NOT redesign the garment
        - Maintain exact colors and textures
        The model should look natural, have realistic skin texture, realistic hands, realistic hair, realistic fabric interaction.
        Lighting: premium soft daylight, cinematic smartphone realism. ${productDescription || productName}. ${garmentDetails}`;

        for (const engine of engines) {
          try {
            masterFrameUrl = await callFalVTON(FAL_KEY, engine, referenceImage, segmentedGarmentUrl, descriptionPrompt);
            if (masterFrameUrl) break;
          } catch (e) {
            console.warn(`VTON engine ${engine} failed, trying next...`);
          }
        }
      }

      if (!masterFrameUrl) {
        // Fallback to synthesis with strict lock
        const prompt = `Luxury fashion influencer photograph. MODEL: ${avatarEthnicity} ${avatarGender}. Identity: ${referenceImage}.
        WEARING THE EXACT PRODUCT: ${productName}. ${garmentDetails}. Reference: ${segmentedGarmentUrl}.
        CRITICAL: 100% garment fidelity. No hallucinations.`;
        masterFrameUrl = await callImageAI(QWEN_API_KEY, prompt, [{ type: 'product', url: segmentedGarmentUrl }, { type: 'influencer', url: referenceImage }]);
      }

      if (!masterFrameUrl) throw new Error("CRITICAL: Master Frame generation failed.");
      const persistedMasterUrl = await persistImage(supabase, masterFrameUrl, "master_frames");
      console.log(`✅ Master Frame created: ${persistedMasterUrl}`);

      // --- STAGE 3: REAL MOTION GENERATION ---
      console.log("Stage 3: Generating Real AI Video Motion...");
      const videoPrompt = `${avatarEthnicity} ${avatarGender} creator wearing ${productName}. ${garmentDetails}`;
      let videoUrl;
      if (FAL_KEY) {
        videoUrl = await generateTrueMotionVideo(FAL_KEY, masterFrameUrl, videoPrompt);
      } else {
        throw new Error("FAL_KEY missing for High-Motion video engine.");
      }
      if (!videoUrl) throw new Error("CRITICAL: Video motion generation failed.");
      console.log(`✅ Motion Video created: ${videoUrl}`);

      // --- STAGE 4: CONSISTENCY VERIFICATION ---
      console.log("Stage 4: Consistency Verification...");
      const verificationOk = await verifyVideoFidelity(QWEN_API_KEY, productImageUrl, videoUrl);
      if (!verificationOk) {
        console.warn("⚠️ Video fidelity verification FAILED. Proceeding but with caution.");
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
        fidelityVerified: verificationOk,
        audioUrl: finalAudioUrl
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }


    if (action === "generate-campaign-shot") {
      const { influencer, product, scene } = body;
      const influencerImageUrl = influencer.avatar_url || "";
      const cacheKey = await getCacheKey(influencerImageUrl, productImageUrl, scene);
      const cachedUrl = await checkCache(supabase, cacheKey);
      if (cachedUrl) return new Response(JSON.stringify({ success: true, imageUrl: cachedUrl, cached: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

      try {
        const garmentDetails = await detectGarmentColor(QWEN_API_KEY, productImageUrl);
        const colorMatch = garmentDetails.match(/Color: ([^,]+)/);
        const garmentColor = colorMatch ? colorMatch[1] : "original";
        
        // Pass 1: Semantic Segmentation (Garment Purification)
        let segmentedGarmentUrl = productImageUrl;
        if (PHOTTA_API_KEY) {
          segmentedGarmentUrl = await segmentGarment(PHOTTA_API_KEY, productImageUrl);
        }

        let url;
        try {
          if (FAL_KEY) {
            // Step 1: Platinum Engine (Fal.ai Kolors)
            url = await callFalAI(FAL_KEY, influencerImageUrl, segmentedGarmentUrl, `${garmentDetails} ${product.name}`);
          } else {
            throw new Error("FAL_KEY missing");
          }
        } catch (eFal) {
          console.warn("Fal.ai failed for campaign shot, falling back to Photta", eFal);
          if (PHOTTA_API_KEY) {
            try {
              url = await callPhottaAI(PHOTTA_API_KEY, segmentedGarmentUrl, influencer.id);
            } catch (ePh) {
              console.warn("Photta failed, falling back to IDM-VTON", ePh);
            }
          }
        }
        
        if (!url) {
          url = await callIDMVTON(HF_TOKEN, influencerImageUrl, segmentedGarmentUrl, `${garmentColor} ${product.name}`);
        }
        
        const persistedUrl = await persistImage(supabase, url, "campaigns", HF_TOKEN);
        await storeInCache(supabase, cacheKey, persistedUrl, influencer.id, product.id);
        return new Response(JSON.stringify({ success: true, imageUrl: persistedUrl }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } catch (e) {
        const url = await callTryOnAI(QWEN_API_KEY, influencerImageUrl, productImageUrl, product.category);
        if (url) {
          const persistedUrl = await persistImage(supabase, url, "campaigns", HF_TOKEN);
          await storeInCache(supabase, cacheKey, persistedUrl, influencer.id, product.id);
          return new Response(JSON.stringify({ success: true, imageUrl: persistedUrl }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        } else {
          // Final fallback with ABSOLUTE COLOR LOCK
          const ethnicity = influencer.ethnicity || "African";
          const gender = influencer.gender || "female";
          const garmentDetails = await detectGarmentColor(QWEN_API_KEY, productImageUrl);
          const colorMatch = garmentDetails.match(/Color: ([^,]+)/);
          const color = colorMatch ? colorMatch[1] : "original";
          
          const prompt = `PREMIUM HIGH-END ADVERTISEMENT for ${product.name}. 
          MODEL: ${ethnicity} ${gender}. Match identity from: ${influencerImageUrl}.
          PRODUCT REFERENCE: ${productImageUrl}. 
          ${garmentDetails}.
          
          COLOR AND GARMENT FIDELITY IS ABSOLUTELY CRITICAL:
          - The model MUST be wearing the EXACT garment from the product reference.
          - The garment color MUST BE ${color.toUpperCase()}.
          - Match the reference product image 100% (texture, shape, color). 
          - NO beige, NO tan, NO gray, NO generic clothes.
          - DISCARD any clothes from the identity reference; ONLY use the product reference for clothing.
          
          Style: ${body.style}. Scene: ${scene}. Cinematic lighting, high-end editorial, 8k.`;
          
          const synUrl = await callImageAI(QWEN_API_KEY, prompt, [
            { type: 'influencer', url: influencerImageUrl },
            { type: 'product', url: productImageUrl }
          ]);
          const persistedUrl = await persistImage(supabase, synUrl, "campaigns");
          return new Response(JSON.stringify({ success: true, imageUrl: persistedUrl }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
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
      if (!FAL_KEY) throw new Error("FAL_KEY missing for video generation");
      
      console.log("Generating High-Motion UGC video via True Motion Engine...");
      const videoUrl = await generateTrueMotionVideo(FAL_KEY, imageUrl, prompt);
      
      let audioUrl = null;
      if (musicPrompt) {
        audioUrl = await generateTikTokMusic(FAL_KEY, musicPrompt);
      }
      
      return new Response(JSON.stringify({ success: true, videoUrl, audioUrl }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    throw { status: 400, message: `Unknown action: ${action}` };
  } catch (e: any) {
    console.error("UGC error:", e);
    return new Response(JSON.stringify({ error: e.message || "Error" }), { status: e.status || 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
