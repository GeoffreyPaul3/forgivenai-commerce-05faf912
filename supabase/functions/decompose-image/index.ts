import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import jpeg from "https://esm.sh/jpeg-js@0.4.4";
import { PNG } from "https://esm.sh/pngjs@6.0.0/browser";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

async function decodeImageToRGBA(imgBuffer: Uint8Array): Promise<{ width: number; height: number; data: Uint8Array }> {
  // Check magic bytes for format identification
  const isPng = imgBuffer[0] === 0x89 && imgBuffer[1] === 0x50;
  const isJpeg = imgBuffer[0] === 0xFF && imgBuffer[1] === 0xD8;

  if (isPng) {
    try {
      const png = PNG.sync.read(imgBuffer);
      return { width: png.width, height: png.height, data: new Uint8Array(png.data) };
    } catch (e) {
      console.warn("PNG decode failed, trying JPEG/WebP fallbacks:", e);
    }
  }
  
  if (isJpeg) {
    try {
      const raw = jpeg.decode(imgBuffer, { useTArray: true, maxMemoryUsageInMB: 512 });
      if (raw && raw.data && raw.width && raw.height) {
        return { width: raw.width, height: raw.height, data: new Uint8Array(raw.data) };
      }
    } catch (e) {
      console.warn("JPEG decode failed, trying PNG/WebP fallbacks:", e);
    }
  }

  // WebP decode via @jsquash/webp or fallback PNG/JPEG sync
  try {
    const decodeWebpModule = await import("https://esm.sh/@jsquash/webp@1.2.0/decode.js");
    const decodeWebp = decodeWebpModule.default || decodeWebpModule;
    const raw = await decodeWebp(imgBuffer);
    if (raw && raw.data && raw.width && raw.height) {
      return { width: raw.width, height: raw.height, data: new Uint8Array(raw.data) };
    }
  } catch (webpErr) {
    console.warn("WebP decode attempt failed:", webpErr);
  }

  // Generic fallbacks
  try {
    const png = PNG.sync.read(imgBuffer);
    return { width: png.width, height: png.height, data: new Uint8Array(png.data) };
  } catch {}

  try {
    const raw = jpeg.decode(imgBuffer, { useTArray: true, maxMemoryUsageInMB: 512 });
    if (raw && raw.data && raw.width && raw.height) {
      return { width: raw.width, height: raw.height, data: new Uint8Array(raw.data) };
    }
  } catch {}

  throw new Error("Could not decode image pixels (unsupported format or corrupted file)");
}

function cropRGBA(srcData: Uint8Array, srcW: number, srcH: number, x: number, y: number, w: number, h: number): { data: Uint8Array; width: number; height: number } {
  const startX = Math.max(0, Math.min(Math.floor(x), srcW - 1));
  const startY = Math.max(0, Math.min(Math.floor(y), srcH - 1));
  const cropW = Math.max(1, Math.min(Math.floor(w), srcW - startX));
  const cropH = Math.max(1, Math.min(Math.floor(h), srcH - startY));

  const dstData = new Uint8Array(cropW * cropH * 4);
  for (let row = 0; row < cropH; row++) {
    const srcOffset = ((startY + row) * srcW + startX) * 4;
    const dstOffset = (row * cropW) * 4;
    dstData.set(srcData.subarray(srcOffset, srcOffset + cropW * 4), dstOffset);
  }
  return { data: dstData, width: cropW, height: cropH };
}

function resizeRGBA(srcData: Uint8Array, srcW: number, srcH: number, dstW: number, dstH: number): Uint8Array {
  const dstData = new Uint8Array(dstW * dstH * 4);
  const xRatio = srcW / dstW;
  const yRatio = srcH / dstH;

  for (let y = 0; y < dstH; y++) {
    for (let x = 0; x < dstW; x++) {
      const px = Math.floor(x * xRatio);
      const py = Math.floor(y * yRatio);
      const srcIdx = (py * srcW + px) * 4;
      const dstIdx = (y * dstW + x) * 4;
      dstData[dstIdx] = srcData[srcIdx];         // R
      dstData[dstIdx + 1] = srcData[srcIdx + 1]; // G
      dstData[dstIdx + 2] = srcData[srcIdx + 2]; // B
      dstData[dstIdx + 3] = srcData[srcIdx + 3]; // A
    }
  }
  return dstData;
}

function encodeRGBAToPNG(data: Uint8Array, width: number, height: number): Uint8Array {
  const png = new PNG({ width, height });
  png.data = data;
  return new Uint8Array(PNG.sync.write(png));
}

async function persistMedia(supabaseClient: any, mediaUrl: string, folder: string) {
  try {
    if (!mediaUrl) return null;
    console.log(`Persisting media from: ${mediaUrl.substring(0, 100)}...`);
    const response = await fetch(mediaUrl);
    if (!response.ok) return mediaUrl;
    const contentType = response.headers.get("content-type") || "image/png";
    const blob = await response.blob();
    
    let extension = "png";
    if (contentType.includes("jpeg") || contentType.includes("jpg")) extension = "jpg";
    else if (contentType.includes("webp")) extension = "webp";
    
    const fileName = `${folder}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabaseClient.storage.from("ugc-assets").upload(fileName, blob, { contentType, upsert: true });
    
    if (uploadError) return mediaUrl;
    const { data: { publicUrl } } = supabaseClient.storage.from("ugc-assets").getPublicUrl(fileName);
    return publicUrl;
  } catch (err) {
    return mediaUrl;
  }
}

async function removeBackground(falKey: string, imageUrl: string) {
  console.log(`Calling fal-ai/bria/background-removal for variant extraction: ${imageUrl.substring(0, 80)}...`);
  const res = await fetch("https://queue.fal.run/fal-ai/bria/background-removal", {
    method: "POST",
    headers: { "Authorization": `Key ${falKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ image_url: imageUrl, return_mask: false }),
  });
  if (!res.ok) throw new Error(`Fal Bria error: ${await res.text()}`);
  
  const { request_id } = await res.json();
  let attempts = 0;
  while (attempts < 30) {
    attempts++;
    const statusRes = await fetch(`https://queue.fal.run/fal-ai/bria/background-removal/requests/${request_id}`, {
      headers: { "Authorization": `Key ${falKey}` }
    });
    const data = await statusRes.json();
    if (data.status === "COMPLETED") {
      return data.response?.image?.url || data.response?.images?.[0]?.url || data.response?.output?.url;
    }
    if (data.status === "FAILED") throw new Error(`Background removal failed: ${JSON.stringify(data)}`);
    await new Promise(r => setTimeout(r, 1500));
  }
  throw new Error("Background removal timed out");
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { imageUrl, productId, forceRegenerate = false } = await req.json();
    if (!imageUrl) throw { status: 400, message: "imageUrl is required" };

    const QWEN_API_KEY = Deno.env.get("QWEN_API_KEY") || "";
    const FAL_KEY = Deno.env.get("FAL_KEY") || "";
    if (!QWEN_API_KEY) throw { status: 500, message: "Missing QWEN_API_KEY" };

    const supabase = createClient(Deno.env.get("SUPABASE_URL") || "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "");

    // 1. Robust Cache Invalidation
    const hashData = new TextEncoder().encode(`${productId || 'no-id'}_${imageUrl}`);
    const hashBuffer = await crypto.subtle.digest("SHA-256", hashData);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const cacheKey = "decompose_" + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    console.log(`Starting image decomposition for: ${imageUrl}. Cache key: ${cacheKey}`);

    if (!forceRegenerate) {
      const { data: cached } = await supabase.from("ugc_cache").select("metadata").eq("cache_key", cacheKey).maybeSingle();
      if (cached && cached.metadata && cached.metadata.variants) {
        console.log("Cache hit for decomposed image variants!");
        return new Response(JSON.stringify({ 
          success: true, 
          analysis: cached.metadata.analysis,
          variants: cached.metadata.variants,
          cached: true
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // Call Qwen VL to analyze the image
    const prompt = `You are a fashion catalog analyst. Analyze this product image and identify the physical garment layout.

YOUR ONLY JOB: Tell me the total number of physical garments/mannequins shown, how they are arranged, and the color of each one.

RULES:
- Count EVERY physical garment/mannequin shown, even if they are the exact same color. (e.g., if there are 5 mannequins total, totalPhysicalCount is 5).
- Use specific color names: "Sky Blue", "Jet Black", "Ivory White", "Olive Green", "Burgundy Wine", "Camel Brown"
- For arrangement: look at how the garments are physically laid out in the photo
- CRITICAL SPATIAL ORDERING: You MUST list the items in the EXACT SPATIAL ORDER they appear in the image, strictly reading from LEFT to RIGHT, and TOP to BOTTOM. Your array index will be mapped directly to geometric crops of the image, so if you list them out of order, the crops will have the wrong labels and colors!

ARRANGEMENT OPTIONS:
- "single": one garment
- "horizontal_N": N garments side by side in a single horizontal row (e.g. horizontal_5 = 5 garments in a row)
- "vertical_N": N garments stacked in a single vertical column
- "grid_RxC": Garments arranged in R rows and C columns (e.g. grid_2x2 = 4 garments total, grid_3x2 = 6 garments total)
- "front_back_N": N distinct garments shown with BOTH front and back view (2 rows × N columns grid). The total physical count in this case is 2*N, but we will extract the top row.

Return ONLY valid JSON, no markdown, no explanation:
{
  "totalPhysicalCount": 5,
  "arrangement": "horizontal_5",
  "items": [
    { "position": 1, "name": "Sky Blue", "garmentType": "2-Piece Set", "confidence": 96 },
    { "position": 2, "name": "Sky Blue", "garmentType": "2-Piece Set", "confidence": 94 },
    { "position": 3, "name": "Jet Black", "garmentType": "2-Piece Set", "confidence": 97 },
    { "position": 4, "name": "Ivory White", "garmentType": "2-Piece Set", "confidence": 92 },
    { "position": 5, "name": "Olive Green", "garmentType": "2-Piece Set", "confidence": 95 }
  ]
}`;

    const res = await fetch("https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation", {
      method: "POST",
      headers: { "Authorization": `Bearer ${QWEN_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "qwen-vl-plus",
        input: {
          messages: [{
            role: "user",
            content: [{ image: imageUrl }, { text: prompt }]
          }]
        }
      })
    });

    if (!res.ok) throw new Error(`Qwen VL error: ${await res.text()}`);

    const data = await res.json();
    const rawContent = data.output?.choices?.[0]?.message?.content?.[0]?.text || "{}";
    console.log("Qwen raw response:", rawContent.substring(0, 500));
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    let analysisResult: any = {};
    try {
      analysisResult = JSON.parse(jsonMatch ? jsonMatch[0] : "{}");
    } catch (e) {
      analysisResult = { totalPhysicalCount: 1, items: [], arrangement: "single" };
    }

    const detectedItems: any[] = analysisResult.items || [];
    const arrangement: string = analysisResult.arrangement || "single";
    const physicalCount = Math.max(1, analysisResult.totalPhysicalCount || detectedItems.length || 1);

    console.log(`Detected ${physicalCount} physical items, arrangement: ${arrangement}. Items: ${detectedItems.map((c:any)=>c.name).join(', ')}`);

    let variants: any[] = [];

    try {
      const imgRes = await fetch(imageUrl);
      if (!imgRes.ok) throw new Error("Failed to fetch source image for cropping");
      const imgBuffer = new Uint8Array(await imgRes.arrayBuffer());

      const rawImage = await decodeImageToRGBA(imgBuffer);
      const W = rawImage.width;
      const H = rawImage.height;

      console.log(`Image dimensions: ${W}x${H}, cropping ${physicalCount} sections from arrangement: ${arrangement}`);

      type CropBox = { x: number; y: number; w: number; h: number };

      function getCropSections(arrangement: string, count: number, W: number, H: number): CropBox[] {
        const n = Math.max(1, count);
        
        if (arrangement.startsWith("front_back_")) {
          const cols = Math.max(1, Math.floor(n / 2));
          const topH = Math.floor(H / 2);
          const colW = Math.floor(W / cols);
          return Array.from({ length: cols }, (_, i) => ({
            x: i * colW,
            y: 0,
            w: i === cols - 1 ? W - i * colW : colW,
            h: topH,
          }));
        }
        
        if (arrangement.startsWith("horizontal_") || arrangement === "horizontal") {
          const colW = Math.floor(W / n);
          return Array.from({ length: n }, (_, i) => ({
            x: i * colW,
            y: 0,
            w: i === n - 1 ? W - i * colW : colW,
            h: H,
          }));
        }

        if (arrangement.startsWith("vertical_") || arrangement === "vertical") {
          const rowH = Math.floor(H / n);
          return Array.from({ length: n }, (_, i) => ({
            x: 0,
            y: i * rowH,
            w: W,
            h: i === n - 1 ? H - i * rowH : rowH,
          }));
        }

        if (arrangement.startsWith("grid_")) {
          const parts = arrangement.split('_')[1].split('x');
          const rows = parseInt(parts[0]) || 2;
          const cols = parseInt(parts[1]) || 2;
          const rowH = Math.floor(H / rows);
          const colW = Math.floor(W / cols);
          const grids = [];
          for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
              grids.push({
                x: c * colW,
                y: r * rowH,
                w: c === cols - 1 ? W - c * colW : colW,
                h: r === rows - 1 ? H - r * rowH : rowH,
              });
            }
          }
          return grids.slice(0, n);
        }

        return [{ x: 0, y: 0, w: W, h: H }];
      }

      const sections = getCropSections(arrangement, physicalCount, W, H);
      console.log(`Generated ${sections.length} crop sections`);

      for (let i = 0; i < sections.length; i++) {
        const section = sections[i];
        const itemMeta = detectedItems[i] || { name: `Color ${i + 1}`, garmentType: "Garment", confidence: 90 };

        let croppedUrl = imageUrl;

        if (section.w > 20 && section.h > 20) {
          try {
            let cropped = cropRGBA(rawImage.data, rawImage.width, rawImage.height, section.x, section.y, section.w, section.h);
            
            if (cropped.width < 256 || cropped.height < 256) {
              const scale = Math.max(256 / cropped.width, 256 / cropped.height);
              const targetW = Math.max(256, Math.round(cropped.width * scale));
              const targetH = Math.max(256, Math.round(cropped.height * scale));
              const resizedData = resizeRGBA(cropped.data, cropped.width, cropped.height, targetW, targetH);
              cropped = { data: resizedData, width: targetW, height: targetH };
            }

            const croppedBuffer = encodeRGBAToPNG(cropped.data, cropped.width, cropped.height);

            const fileName = `decomposed/${crypto.randomUUID()}.png`;
            const { error: uploadError } = await supabase.storage
              .from("ugc-assets")
              .upload(fileName, croppedBuffer, { contentType: "image/png" });

            if (!uploadError) {
              croppedUrl = supabase.storage.from("ugc-assets").getPublicUrl(fileName).data.publicUrl;
              console.log(`Cropped variation ${i + 1} (${itemMeta.name}): x=${section.x} y=${section.y} w=${section.w} h=${section.h} → ${croppedUrl}`);
            }
          } catch (cropErr) {
            console.warn(`Crop failed for section ${i + 1}:`, cropErr);
          }
        }

        // Apply background removal to the clean crop (not the original image)
        if (FAL_KEY && croppedUrl !== imageUrl) {
          try {
            const bgRemoved = await removeBackground(FAL_KEY, croppedUrl);
            croppedUrl = await persistMedia(supabase, bgRemoved, "decomposed") || croppedUrl;
          } catch (e) {
            console.warn(`BG removal failed for crop ${i + 1}, using clean crop:`, e);
          }
        }

        variants.push({
          url: croppedUrl,
          details: {
            variationId: variants.length + 1,
            name: `${itemMeta.name} ${itemMeta.garmentType || "Garment"}`,
            primaryColor: itemMeta.name,
            garmentType: itemMeta.garmentType || "Garment",
            confidence: itemMeta.confidence || 95,
            view: "Front",
            section: { x: section.x, y: section.y, w: section.w, h: section.h },
          }
        });
      }

      analysisResult.distinctColorCount = variants.length;
      analysisResult.garments = variants.map(v => v.details);

    } catch (e) {
      console.error("Pure JS cropping engine failed — falling back to Qwen-analysis-only variants:", e);
      if (detectedItems.length > 0) {
        variants = detectedItems.map((item: any, i: number) => ({
          url: imageUrl,
          details: {
            variationId: i + 1,
            name: `${item.name} ${item.garmentType || "Garment"}`,
            primaryColor: item.name,
            garmentType: item.garmentType || "Garment",
            confidence: item.confidence || 90,
            view: "Front",
          }
        }));
        analysisResult.distinctColorCount = variants.length;
        analysisResult.garments = variants.map((v: any) => v.details);
      } else {
        variants.push({ url: imageUrl, details: analysisResult.garments?.[0] || {} });
      }
    }

    // Update product metadata (non-breaking — only sets is_composite and variant_images)
    if (productId && !productId.toString().startsWith('live_')) {
      await supabase.from("products").update({
        is_composite: variants.length > 1,
        decomposition_data: analysisResult,
        variant_images: variants.map(v => v.url)
      }).eq("id", productId);
    }

    // Cache the result
    await supabase.from("ugc_cache").upsert({
      cache_key: cacheKey,
      image_url: imageUrl,
      metadata: { analysis: analysisResult, variants },
      expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString()
    }, { onConflict: "cache_key" });

    return new Response(JSON.stringify({ 
      success: true, 
      analysis: analysisResult,
      variants
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: any) {
    console.error("Decompose error:", error);
    return new Response(JSON.stringify({ error: error.message || "Failed to decompose image" }), { 
      status: error.status || 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
});
