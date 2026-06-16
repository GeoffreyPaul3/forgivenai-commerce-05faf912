import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.40.0";
import { Image } from "https://deno.land/x/imagescript@1.2.15/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const FSC_WATERMARK_STORAGE_URL = "https://wzncegnkhybtmybqftbv.supabase.co/storage/v1/object/public/ugc-assets/brand/fsc-logo.png";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const { imageUrls, campaignName } = body;

    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      return new Response(JSON.stringify({ error: "Missing imageUrls array" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    console.log(`Generating campaign composition for ${campaignName || "Untitled"} with ${imageUrls.length} images`);

    // 1. Download all images
    const images = [];
    for (const url of imageUrls) {
      if (!url) continue;
      try {
        const res = await fetch(url);
        if (!res.ok) continue;
        const buf = await res.arrayBuffer();
        const img = await Image.decode(new Uint8Array(buf));
        images.push(img);
      } catch (e) {
        console.warn(`Failed to process image ${url}`, e);
      }
    }

    if (images.length === 0) {
       return new Response(JSON.stringify({ error: "No valid images could be fetched" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 2. Determine canvas size
    const TARGET_HEIGHT = 1024;
    const padding = 20;

    for (let i = 0; i < images.length; i++) {
        images[i] = images[i].resize(Math.round(images[i].width * (TARGET_HEIGHT / images[i].height)), TARGET_HEIGHT);
    }

    const canvasHeight = TARGET_HEIGHT + padding * 2;
    const canvasWidth = images.reduce((acc, img) => acc + img.width, 0) + padding * (images.length + 1);

    const canvas = new Image(canvasWidth, canvasHeight);
    canvas.fill(0xFFFFFFFF); // White background

    let currentX = padding;
    for (const img of images) {
        canvas.composite(img, currentX, padding);
        currentX += img.width + padding;
    }

    // 3. Apply Watermark from Supabase Storage
    try {
      const wmRes = await fetch(FSC_WATERMARK_STORAGE_URL);
      if (wmRes.ok) {
        const wmBuf = await wmRes.arrayBuffer();
        const watermark = await Image.decode(new Uint8Array(wmBuf));
        const scaledWatermark = watermark.resize(200, Image.RESIZE_AUTO);
        canvas.composite(scaledWatermark, canvasWidth - 200 - padding, canvasHeight - scaledWatermark.height - padding);
        console.log("✅ Watermark applied");
      } else {
        console.warn("Watermark fetch failed, skipping");
      }
    } catch (e) {
      console.warn("Failed to apply watermark", e);
    }

    // 4. Encode and upload
    const outputBuffer = await canvas.encode(3);
    
    const fileName = `campaigns/${Date.now()}-${Math.random().toString(36).substring(7)}.png`;
    
    const { data: uploadData, error: uploadErr } = await supabase.storage
      .from("media")
      .upload(fileName, outputBuffer, { contentType: "image/png" });

    if (uploadErr) throw uploadErr;

    const { data: publicUrlData } = supabase.storage.from("media").getPublicUrl(fileName);
    const finalUrl = publicUrlData.publicUrl;

    console.log("Successfully generated campaign collage:", finalUrl);

    return new Response(JSON.stringify({ success: true, imageUrl: finalUrl }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err: any) {
    console.error("Campaign generation error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
