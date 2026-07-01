import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

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
    // Generate a SHA-256 hash of the productId + imageUrl combination
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
    const prompt = `You are an expert fashion catalog segmenter specializing in deduplication.

THE MOST IMPORTANT RULE:
A catalog image that shows the FRONT and BACK of the same garment in the SAME COLOR = ONE (1) entry, not two.
COUNT colors, not views. 3 colors = 3 entries. Period.

STEP 1 — COUNT THE DISTINCT COLORS:
Look at the image and count how many DIFFERENT colors of the garment are shown.
Ignore whether they are shown from the front, back, or both.

STEP 2 — CREATE ONE ENTRY PER COLOR:
For each color, create exactly ONE entry. Choose the best front-facing view bounding box.

STEP 3 — NAME COLORS PRECISELY:
Use exact color names. Examples: "Olive Green", "Burgundy Wine", "Ivory White", "Jet Black", "Dusty Rose", "Cobalt Blue", "Camel Brown".
Never say "Multicolor" unless the garment has a print/pattern that is inherently multicolored.

EXAMPLES:
- Image shows Olive Green dress (front) + Olive Green dress (back) + Black dress (front) + Black dress (back) = 2 entries: Olive Green, Black
- Image shows Red blazer + Blue blazer + White blazer (all front-facing, grid layout) = 3 entries: Red, Blue, White  
- Image shows a single garment = 1 entry

Return ONLY a valid JSON object, no markdown, no explanation.

{
  "layout_type": "single | grid | collage | front_and_back",
  "distinct_color_count": 3,
  "garments": [
    {
      "variationId": 1,
      "name": "Olive Green 2-Piece Set",
      "primaryColor": "Olive Green",
      "secondaryColor": null,
      "garmentType": "Two-Piece Set",
      "fit": "Regular",
      "sleeve": "Long Sleeve",
      "neckline": "V-Neck",
      "pattern": "Solid",
      "season": "All-Season",
      "confidence": 97,
      "view": "Front",
      "box_2d": [0, 0, 1000, 333]
    },
    {
      "variationId": 2,
      "name": "Black 2-Piece Set",
      "primaryColor": "Jet Black",
      "secondaryColor": null,
      "garmentType": "Two-Piece Set",
      "fit": "Regular",
      "sleeve": "Long Sleeve",
      "neckline": "V-Neck",
      "pattern": "Solid",
      "season": "All-Season",
      "confidence": 97,
      "view": "Front",
      "box_2d": [0, 334, 1000, 666]
    },
    {
      "variationId": 3,
      "name": "Burgundy 2-Piece Set",
      "primaryColor": "Burgundy Wine",
      "secondaryColor": null,
      "garmentType": "Two-Piece Set",
      "fit": "Regular",
      "sleeve": "Long Sleeve",
      "neckline": "V-Neck",
      "pattern": "Solid",
      "season": "All-Season",
      "confidence": 97,
      "view": "Front",
      "box_2d": [0, 667, 1000, 1000]
    }
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
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    let analysisResult;
    try {
      analysisResult = JSON.parse(jsonMatch ? jsonMatch[0] : "{}");
    } catch (e) {
      analysisResult = { garment_count: 1, garments: [{ type: "unknown", color: "unknown" }] };
    }

    let variants = [];
    
    try {
      // Dynamic import ImageScript
      const { Image } = await import("https://deno.land/x/imagescript@1.2.15/mod.ts");
      
      const imgRes = await fetch(imageUrl);
      if (!imgRes.ok) throw new Error("Failed to fetch source image for cropping");
      const imgBuffer = new Uint8Array(await imgRes.arrayBuffer());
      const baseImage = await Image.decode(imgBuffer);
      const width = baseImage.width;
      const height = baseImage.height;

      // ── Server-Side Color Deduplication ──────────────────────────────────────────
      // Safety net: Qwen sometimes returns front+back pairs as separate entries with the
      // same primaryColor. We collapse these to one entry per unique color, keeping
      // the highest-confidence one. This guarantees 3 colors = 3 entries always.
      const rawGarments: any[] = analysisResult.garments || [];
      const colorMap = new Map<string, any>();
      for (const g of rawGarments) {
        const colorKey = (g.primaryColor || "unknown").toLowerCase().trim();
        const existing = colorMap.get(colorKey);
        // Keep the one with the higher confidence, or prefer "Front" view
        if (!existing) {
          colorMap.set(colorKey, g);
        } else {
          const existingConf = existing.confidence || 0;
          const newConf = g.confidence || 0;
          const existingIsFront = (existing.view || "").toLowerCase().includes("front");
          const newIsFront = (g.view || "").toLowerCase().includes("front");
          if ((!existingIsFront && newIsFront) || (existingIsFront === newIsFront && newConf > existingConf)) {
            colorMap.set(colorKey, g);
          }
        }
      }
      const garments = Array.from(colorMap.values());
      console.log(`Qwen returned ${rawGarments.length} garments → deduplicated to ${garments.length} unique colors.`);
      // Update analysisResult so the stored metadata reflects deduplicated result
      analysisResult.garments = garments;
      // ─────────────────────────────────────────────────────────────────────────────

      for (let i = 0; i < garments.length; i++) {
        const g = garments[i];
        let croppedUrl = imageUrl;
        
        if (g.box_2d && Array.isArray(g.box_2d) && g.box_2d.length === 4) {
          const [ymin, xmin, ymax, xmax] = g.box_2d;
          
          const yPx = Math.max(0, Math.round((ymin / 1000) * height));
          const xPx = Math.max(0, Math.round((xmin / 1000) * width));
          const hPx = Math.min(height - yPx, Math.round(((ymax - ymin) / 1000) * height));
          const wPx = Math.min(width - xPx, Math.round(((xmax - xmin) / 1000) * width));

          if (wPx > 10 && hPx > 10) {
            // Clone base image and crop
            const clone = baseImage.clone();
            const cropped = clone.crop(xPx, yPx, wPx, hPx);
            const croppedBuffer = await cropped.encode(1); // PNG
            
            const fileName = `decomposed/${crypto.randomUUID()}.png`;
            const { error: uploadError } = await supabase.storage.from("ugc-assets").upload(fileName, croppedBuffer, { contentType: "image/png" });
            
            if (!uploadError) {
              croppedUrl = supabase.storage.from("ugc-assets").getPublicUrl(fileName).data.publicUrl;
            }
          }
        }

        // Apply background removal to isolate the garment perfectly if Fal is available (optional downstream enhancement)
        if (FAL_KEY) {
          try {
            // Note: We already have a clean crop. We run background removal on the crop, ensuring no partial limbs from the original image.
            const bgRemoved = await removeBackground(FAL_KEY, croppedUrl);
            croppedUrl = await persistMedia(supabase, bgRemoved, "decomposed") || croppedUrl;
          } catch (e) {
            console.warn("Background removal failed for crop, falling back to clean crop:", e);
          }
        }

        variants.push({
          url: croppedUrl,
          details: g
        });
      }
    } catch (e) {
      console.error("ImageScript cropping failed:", e);
      // Fallback: just use original image if cropping entirely crashes
      variants.push({ url: imageUrl, details: analysisResult.garments?.[0] || {} });
    }

    // Update DB if productId provided - only update decomposition_data to not break existing schema, cache the variations for AI layer.
    if (productId && !productId.toString().startsWith('live_')) {
      await supabase.from("products").update({
        is_composite: variants.length > 1,
        decomposition_data: analysisResult,
        variant_images: variants.map(v => v.url)
      }).eq("id", productId);
    }

    // Cache the detection result in ugc_cache for runtime AI orchestration
    await supabase.from("ugc_cache").upsert({
      cache_key: cacheKey,
      image_url: imageUrl,
      metadata: { analysis: analysisResult, variants },
      expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString() // Cache for 30 days
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
