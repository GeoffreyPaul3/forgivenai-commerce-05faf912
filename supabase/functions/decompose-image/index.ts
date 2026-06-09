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
    const { imageUrl, productId } = await req.json();
    if (!imageUrl) throw { status: 400, message: "imageUrl is required" };

    const QWEN_API_KEY = Deno.env.get("QWEN_API_KEY") || "";
    const FAL_KEY = Deno.env.get("FAL_KEY") || "";
    if (!QWEN_API_KEY) throw { status: 500, message: "Missing QWEN_API_KEY" };

    const supabase = createClient(Deno.env.get("SUPABASE_URL") || "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "");

    console.log(`Starting image decomposition for: ${imageUrl}`);

    // Call Qwen VL to analyze the image
    const prompt = `You are a strict fashion catalog segmenter. 
Analyze the image and detect EVERY INDIVIDUAL garment/product (e.g., in a grid, collage, or multi-item photo).
Return ONLY a valid JSON object. Do not include markdown blocks.
For each garment, you MUST provide its precise 2D bounding box as [ymin, xmin, ymax, xmax] where coordinates are normalized from 0 to 1000 (e.g., [0, 0, 500, 500] is the top-left quarter).
Format:
{
  "garment_count": 2,
  "layout_type": "grid",
  "garments": [
    {
      "color": "Red",
      "type": "Dress",
      "description": "Red floral summer dress",
      "box_2d": [100, 100, 900, 450]
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

      const garments = analysisResult.garments || [];
      console.log(`Extracting ${garments.length} garments via ImageScript crops...`);

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

        // Apply background removal to isolate the garment perfectly if Fal is available
        if (FAL_KEY) {
          try {
            const bgRemoved = await removeBackground(FAL_KEY, croppedUrl);
            croppedUrl = await persistMedia(supabase, bgRemoved, "decomposed") || croppedUrl;
          } catch (e) {
            console.warn("Background removal failed for crop:", e);
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

    // Update DB if productId provided
    if (productId && !productId.toString().startsWith('live_')) {
      await supabase.from("products").update({
        is_composite: true,
        decomposition_data: analysisResult,
        variant_images: variants.map(v => v.url)
      }).eq("id", productId);
    }

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
