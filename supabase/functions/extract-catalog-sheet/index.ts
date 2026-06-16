import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.40.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const QWEN_API_KEY_NAME = "QWEN_API_KEY";
const QWEN_EXTRACT_MODEL = "qwen-vl-max";
const QWEN_CHAT_URL = "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions";

interface ExtractedProduct {
  name: string;
  description?: string;
  price?: number;
  category?: string;
  images?: string[];
  sizes?: string[];
  colors?: string[];
  sku?: string;
  stock_quantity?: number;
}

async function extractProductsFromDocument(qwenKey: string, documentUrl: string, mimeType: string): Promise<ExtractedProduct[]> {
  console.log(`[extract-catalog-sheet] Extracting products from ${mimeType} document: ${documentUrl}`);

  const systemPrompt = `You are a product catalog extraction AI. Your job is to analyze supplier catalog documents (images, PDFs, spreadsheets) and extract structured product data.

For each product found, extract:
- name (string, required)
- description (string, optional)
- price (number in local currency, optional)
- category (string, optional)
- images (array of image URLs if visible, optional)
- sizes (array of available sizes, optional)
- colors (array of available colors, optional)
- sku (string product code if visible, optional)
- stock_quantity (number if mentioned, optional)

Return ONLY valid JSON. The response MUST be a JSON array of product objects, with no extra text, markdown, or explanation.
Example: [{"name":"Product A","price":100,"category":"Apparel","sizes":["S","M","L"]}]
If no products are found, return an empty array: []`;

  const userMessage: any = {
    role: "user",
    content: [
      {
        type: "text",
        text: "Extract all products from this supplier catalog document. Return a JSON array of product objects."
      }
    ]
  };

  // Add the document as appropriate content type
  if (mimeType.startsWith("image/")) {
    userMessage.content.push({
      type: "image_url",
      image_url: { url: documentUrl }
    });
  } else {
    // For PDFs and other docs, pass URL in text prompt
    userMessage.content[0].text = `Extract all products from this supplier catalog document at URL: ${documentUrl}\n\nReturn a JSON array of product objects.`;
  }

  const res = await fetch(QWEN_CHAT_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${qwenKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: QWEN_EXTRACT_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        userMessage
      ],
      temperature: 0.1,
      max_tokens: 4096
    })
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Qwen VL extraction failed (${res.status}): ${err.substring(0, 300)}`);
  }

  const data = await res.json();
  const rawText: string = data.choices?.[0]?.message?.content || "[]";

  // Strip markdown fences if present
  const cleaned = rawText.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();

  let products: ExtractedProduct[];
  try {
    products = JSON.parse(cleaned);
    if (!Array.isArray(products)) products = [];
  } catch (e) {
    console.warn("[extract-catalog-sheet] Failed to parse JSON, attempting substring extraction", e);
    const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      try {
        products = JSON.parse(jsonMatch[0]);
      } catch {
        products = [];
      }
    } else {
      products = [];
    }
  }

  console.log(`[extract-catalog-sheet] Extracted ${products.length} products`);
  return products;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const qwenKey = Deno.env.get(QWEN_API_KEY_NAME);

    if (!qwenKey) {
      return new Response(JSON.stringify({ error: "QWEN_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const body = await req.json();

    const { documentUrl, mimeType = "image/png", saveToDb = false, supplierId } = body;

    if (!documentUrl) {
      return new Response(JSON.stringify({ error: "Missing documentUrl" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Extract products using Qwen VL Max
    const products = await extractProductsFromDocument(qwenKey, documentUrl, mimeType);

    if (products.length === 0) {
      return new Response(JSON.stringify({ success: true, products: [], message: "No products extracted" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    let savedCount = 0;
    const savedIds: string[] = [];

    // Optionally persist extracted products to DB
    if (saveToDb) {
      console.log(`[extract-catalog-sheet] Saving ${products.length} products to DB...`);
      for (const p of products) {
        if (!p.name?.trim()) continue;

        const row = {
          name: p.name.trim(),
          description: p.description || null,
          price: p.price || null,
          category: p.category || "General",
          images: Array.isArray(p.images) ? p.images : [],
          sizes: Array.isArray(p.sizes) ? p.sizes : [],
          colors: Array.isArray(p.colors) ? p.colors : [],
          stock_quantity: p.stock_quantity || 0,
          stock_status: (p.stock_quantity && p.stock_quantity > 0) ? 'available' : 'out_of_stock',
          status: 'active',
          source_url: documentUrl,
          ...(supplierId ? { supplier_id: supplierId } : {})
        };

        // Upsert by name to avoid duplicates
        const { data: upserted, error: upsertErr } = await supabase
          .from('products')
          .upsert(row, { onConflict: 'name' })
          .select('id')
          .maybeSingle();

        if (upsertErr) {
          console.warn(`[extract-catalog-sheet] Failed to save product "${p.name}":`, upsertErr.message);
        } else if (upserted) {
          savedIds.push(upserted.id);
          savedCount++;
        }
      }
      console.log(`[extract-catalog-sheet] Saved ${savedCount}/${products.length} products`);
    }

    return new Response(JSON.stringify({
      success: true,
      products,
      extracted: products.length,
      saved: savedCount,
      savedIds
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err: any) {
    console.error("[extract-catalog-sheet] Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
