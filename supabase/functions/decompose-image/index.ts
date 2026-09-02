import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { imageUrl, productId, forceRegenerate = false } = await req.json();
    if (!imageUrl) throw { status: 400, message: "imageUrl is required" };

    const QWEN_API_KEY = Deno.env.get("QWEN_API_KEY") || "";
    if (!QWEN_API_KEY) throw { status: 500, message: "Missing QWEN_API_KEY" };

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    );

    // 1. Cache Check
    const hashData = new TextEncoder().encode(`${productId || 'no-id'}_${imageUrl}`);
    const hashBuffer = await crypto.subtle.digest("SHA-256", hashData);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const cacheKey = "decompose_" + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    console.log(`Starting image decomposition for: ${imageUrl}. Cache key: ${cacheKey}`);

    if (!forceRegenerate) {
      const { data: cached } = await supabase.from("ugc_cache").select("metadata").eq("cache_key", cacheKey).maybeSingle();
      if (cached && cached.metadata && cached.metadata.variants && cached.metadata.variants.length > 0) {
        console.log("Cache hit for decomposed image variants!");
        return new Response(JSON.stringify({ 
          success: true, 
          analysis: cached.metadata.analysis,
          variants: cached.metadata.variants,
          cached: true
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // 2. Call Qwen VL to analyze the image
    const prompt = `You are an elite fashion catalog analyst. Analyze this product photo to detect all physical garment/color variations shown.

YOUR GOAL: Identify every physical garment or mannequin variation shown and provide its exact color name, layout arrangement, and normalized 2D bounding box [ymin, xmin, ymax, xmax] (0 to 1000 scale).

RULES:
- Count EVERY distinct physical garment or mannequin shown in the photo. If there are 6 mannequins/garments shown, totalPhysicalCount is 6.
- Use specific real color names: "Sky Blue", "Jet Black", "Ivory White", "Camel Brown", "Olive Green", "Dusty Pink", "Navy Blue", "Burgundy Wine", "Cream Beige", "Cognac Rust", etc.
- For arrangement: 
  * "single": 1 garment
  * "horizontal_N": N garments in a single horizontal row
  * "vertical_N": N garments stacked in a single column
  * "grid_RxC": Garments in R rows and C columns (e.g. grid_2x2 for 4 items, grid_2x3 for 6 items in 2 rows of 3, grid_3x2 for 6 items in 3 rows of 2)
  * "front_back_N": N garments shown with front and back views
- Order items strictly from LEFT to RIGHT, and TOP to BOTTOM.

Return ONLY valid JSON (no markdown formatting, no other text):
{
  "totalPhysicalCount": 6,
  "arrangement": "grid_2x3",
  "items": [
    { "position": 1, "name": "Sky Blue", "garmentType": "Garment", "box_2d": [0, 0, 500, 333], "confidence": 98 },
    { "position": 2, "name": "Jet Black", "garmentType": "Garment", "box_2d": [0, 333, 500, 666], "confidence": 96 },
    { "position": 3, "name": "Ivory White", "garmentType": "Garment", "box_2d": [0, 666, 500, 1000], "confidence": 95 },
    { "position": 4, "name": "Olive Green", "garmentType": "Garment", "box_2d": [500, 0, 1000, 333], "confidence": 94 },
    { "position": 5, "name": "Dusty Pink", "garmentType": "Garment", "box_2d": [500, 333, 1000, 666], "confidence": 93 },
    { "position": 6, "name": "Camel Brown", "garmentType": "Garment", "box_2d": [500, 666, 1000, 1000], "confidence": 92 }
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
    const arrangement: string = analysisResult.arrangement || (detectedItems.length >= 6 ? "grid_2x3" : detectedItems.length >= 4 ? "grid_2x2" : "horizontal_" + (detectedItems.length || 1));
    const physicalCount = Math.max(1, analysisResult.totalPhysicalCount || detectedItems.length || 1);

    console.log(`Detected ${physicalCount} physical items, arrangement: ${arrangement}. Items: ${detectedItems.map((c:any)=>c.name).join(', ')}`);

    let variants: any[] = [];

    try {
      const { Image } = await import("https://deno.land/x/imagescript@1.2.15/mod.ts");

      const imgRes = await fetch(imageUrl);
      if (!imgRes.ok) throw new Error("Failed to fetch source image for cropping");
      const imgBuffer = new Uint8Array(await imgRes.arrayBuffer());

      const decodedImage = await Image.decode(imgBuffer);
      const W = decodedImage.width;
      const H = decodedImage.height;

      console.log(`Image dimensions: ${W}x${H}, cropping ${physicalCount} sections from arrangement: ${arrangement}`);

      type CropBox = { x: number; y: number; w: number; h: number };

      function getCropSections(arr: string, count: number, w: number, h: number): CropBox[] {
        const n = Math.max(1, count);
        
        if (arr.startsWith("front_back_")) {
          const cols = Math.max(1, Math.floor(n / 2));
          const topH = Math.floor(h / 2);
          const colW = Math.floor(w / cols);
          return Array.from({ length: cols }, (_, i) => ({
            x: i * colW,
            y: 0,
            w: i === cols - 1 ? w - i * colW : colW,
            h: topH,
          }));
        }
        
        if (arr.startsWith("horizontal_") || arr === "horizontal") {
          const colW = Math.floor(w / n);
          return Array.from({ length: n }, (_, i) => ({
            x: i * colW,
            y: 0,
            w: i === n - 1 ? w - i * colW : colW,
            h: h,
          }));
        }

        if (arr.startsWith("vertical_") || arr === "vertical") {
          const rowH = Math.floor(h / n);
          return Array.from({ length: n }, (_, i) => ({
            x: 0,
            y: i * rowH,
            w: w,
            h: i === n - 1 ? h - i * rowH : rowH,
          }));
        }

        if (arr.startsWith("grid_")) {
          const parts = arr.split('_')[1].split('x');
          const rows = parseInt(parts[0]) || 2;
          const cols = parseInt(parts[1]) || 2;
          const rowH = Math.floor(h / rows);
          const colW = Math.floor(w / cols);
          const grids = [];
          for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
              grids.push({
                x: c * colW,
                y: r * rowH,
                w: c === cols - 1 ? w - c * colW : colW,
                h: r === rows - 1 ? h - r * rowH : rowH,
              });
            }
          }
          return grids.slice(0, n);
        }

        return [{ x: 0, y: 0, w: w, h: h }];
      }

      const sections = getCropSections(arrangement, physicalCount, W, H);
      const countToProcess = Math.max(detectedItems.length, sections.length);
      console.log(`Generated ${sections.length} crop sections, processing ${countToProcess} variations`);

      for (let i = 0; i < countToProcess; i++) {
        const itemMeta = detectedItems[i] || { name: `Color ${i + 1}`, garmentType: "Garment", confidence: 90 };
        let section: CropBox;

        if (Array.isArray(itemMeta.box_2d) && itemMeta.box_2d.length === 4) {
          const [ymin, xmin, ymax, xmax] = itemMeta.box_2d;
          const x = Math.max(0, Math.min(W - 1, Math.round((xmin / 1000) * W)));
          const y = Math.max(0, Math.min(H - 1, Math.round((ymin / 1000) * H)));
          const w = Math.max(20, Math.min(W - x, Math.round(((xmax - xmin) / 1000) * W)));
          const h = Math.max(20, Math.min(H - y, Math.round(((ymax - ymin) / 1000) * H)));
          section = { x, y, w, h };
          console.log(`Using vision box_2d for item ${i + 1} (${itemMeta.name}): [${ymin}, ${xmin}, ${ymax}, ${xmax}] → x:${x}, y:${y}, w:${w}, h:${h}`);
        } else {
          section = sections[i] || sections[0] || { x: 0, y: 0, w: W, h: H };
        }

        let croppedUrl = imageUrl;

        if (section.w > 20 && section.h > 20) {
          try {
            const cropX = Math.max(0, Math.min(W - 1, section.x));
            const cropY = Math.max(0, Math.min(H - 1, section.y));
            const cropW = Math.max(1, Math.min(W - cropX, section.w));
            const cropH = Math.max(1, Math.min(H - cropY, section.h));

            const cropped = decodedImage.clone().crop(cropX, cropY, cropW, cropH);
            
            if (cropped.width < 256 || cropped.height < 256) {
              const scale = Math.max(256 / cropped.width, 256 / cropped.height);
              const targetW = Math.max(256, Math.round(cropped.width * scale));
              const targetH = Math.max(256, Math.round(cropped.height * scale));
              cropped.resize(targetW, targetH);
            }

            const pngBuffer = await cropped.encode(1);

            const fileName = `decomposed/${crypto.randomUUID()}.png`;
            const { error: uploadError } = await supabase.storage
              .from("ugc-assets")
              .upload(fileName, pngBuffer, { contentType: "image/png" });

            if (!uploadError) {
              croppedUrl = supabase.storage.from("ugc-assets").getPublicUrl(fileName).data.publicUrl;
              console.log(`Cropped variation ${i + 1} (${itemMeta.name}): x=${section.x} y=${section.y} w=${section.w} h=${section.h} → ${croppedUrl}`);
            }
          } catch (cropErr) {
            console.warn(`Crop failed for section ${i + 1}:`, cropErr);
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
      console.error("Cropping engine fallback:", e);
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

    // Save to Cache
    await supabase.from("ugc_cache").upsert({
      cache_key: cacheKey,
      metadata: {
        analysis: analysisResult,
        variants: variants,
        timestamp: new Date().toISOString()
      }
    });

    return new Response(JSON.stringify({
      success: true,
      analysis: analysisResult,
      variants: variants
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error: any) {
    console.error("Decomposition error:", error);
    return new Response(JSON.stringify({ 
      error: error.message || "Failed to decompose image",
      status: error.status || 500
    }), {
      status: error.status || 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
