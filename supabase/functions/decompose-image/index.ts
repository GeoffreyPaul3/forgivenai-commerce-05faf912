import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Jimp from "npm:jimp@0.22.10";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

async function callQwenVL(apiKey: string, prompt: string, imageUrl: string) {
  const res = await fetch("https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "qwen-vl-max",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: imageUrl } }
          ]
        }
      ],
      response_format: { type: "json_object" }
    })
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Qwen VL error: ${res.status} ${errorText}`);
  }

  const data = await res.json();
  const content = data.choices[0].message.content;
  try {
    return JSON.parse(content);
  } catch (e) {
    // try to extract json block
    const match = content.match(/```json\n([\s\S]*?)\n```/);
    if (match) return JSON.parse(match[1]);
    throw new Error("Failed to parse Qwen VL JSON: " + content);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { product_id, image_url } = await req.json();
    if (!product_id || !image_url) {
      throw new Error("product_id and image_url are required");
    }

    const qwenKey = Deno.env.get("QWEN_API_KEY");
    if (!qwenKey) throw new Error("Missing QWEN_API_KEY");

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`Analyzing image for decomposition: ${image_url}`);

    const prompt = `Analyze this product image. Is it a composite image (e.g., a grid showing multiple variations or colors of the same clothing item, or multiple different items)?
If NO (it's just one main item or one person wearing the item), return:
{ "is_composite": false, "items": [] }

If YES (it contains multiple separate clothing items or variants), return:
{
  "is_composite": true,
  "items": [
    {
      "color": "blue",
      "box_2d": [ymin, xmin, ymax, xmax] 
    }
  ]
}
Note: box_2d coordinates must be integers between 0 and 1000 representing the bounding box of the item, where [0,0] is top-left and [1000,1000] is bottom-right. Only return the individual garments. Ensure valid JSON.`;

    const analysis = await callQwenVL(qwenKey, prompt, image_url);
    console.log("Qwen Analysis:", analysis);

    if (!analysis.is_composite || !analysis.items || analysis.items.length <= 1) {
      return new Response(JSON.stringify({ success: true, decomposed: false }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log(`Found ${analysis.items.length} items. Cropping...`);

    // Load image via Jimp
    const img = await Jimp.read(image_url);
    const origW = img.getWidth();
    const origH = img.getHeight();

    const newImageUrls = [];
    let variantCount = 1;

    for (const item of analysis.items) {
      if (!item.box_2d || item.box_2d.length !== 4) continue;
      
      const [ymin, xmin, ymax, xmax] = item.box_2d;
      
      // Convert 0-1000 scale to actual pixels
      let px = Math.floor((xmin / 1000) * origW);
      let py = Math.floor((ymin / 1000) * origH);
      let pw = Math.floor(((xmax - xmin) / 1000) * origW);
      let ph = Math.floor(((ymax - ymin) / 1000) * origH);

      // Clamp
      px = Math.max(0, px);
      py = Math.max(0, py);
      pw = Math.min(pw, origW - px);
      ph = Math.min(ph, origH - py);

      if (pw <= 0 || ph <= 0) continue;

      const clone = img.clone();
      clone.crop(px, py, pw, ph);

      const buffer = await clone.getBufferAsync(Jimp.MIME_JPEG);
      
      const fileName = `${product_id}_variant_${variantCount}_${Date.now()}.jpg`;
      const filePath = `product_images/decomposed/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('vendor-products')
        .upload(filePath, buffer, { contentType: 'image/jpeg' });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('vendor-products')
        .getPublicUrl(filePath);

      newImageUrls.push({ url: publicUrl, color: item.color || `Variant ${variantCount}` });
      variantCount++;
    }

    if (newImageUrls.length > 0) {
      // Update the product record to add the new images and variants metadata
      const { data: product } = await supabase.from('products').select('*').eq('id', product_id).single();
      if (product) {
        const metadata = product.metadata || {};
        metadata.decomposed = true;
        metadata.decomposed_variants = newImageUrls;
        
        // Push the new image URLs to the front of the images array so they are used first
        const urlsOnly = newImageUrls.map(u => u.url);
        const mergedImages = [...urlsOnly, ...(product.images || [])];

        await supabase.from('products').update({
          images: mergedImages,
          metadata: metadata
        }).eq('id', product_id);
      }
    }

    return new Response(JSON.stringify({ success: true, decomposed: true, variants: newImageUrls }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Decompose Error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
