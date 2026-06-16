import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting high-speed API catalog sync...');

    const apiRes = await fetch("https://www.forgivenshoppingcentre.com/api/products/all");
    const apiData = await apiRes.json();

    if (!apiData.success || !Array.isArray(apiData.data)) {
      throw new Error("Failed to fetch products from live API");
    }

    const products = apiData.data.map((p: any) => {
      const stockQuantity = p.stockQuantity ?? p.stock ?? p.quantity ?? 0;
      const stockStatus = stockQuantity > 0 ? 'available' : 'out_of_stock';
      return {
        name: p.name,
        description: p.description,
        category: p.category?.name || p.productType || "General",
        price: p.salePrice || p.price,
        images: p.images || [],
        source_url: "https://www.forgivenshoppingcentre.com/",
        status: 'active',
        sizes: p.sizes || (p.variants && p.variants.length > 0 ? [...new Set(p.variants.map((v: any) => v.size || v.value || v.name).filter(Boolean))] : []) || (p.options?.find((o: any) => o.name?.toLowerCase().includes("size"))?.values || []),
        colors: p.colors || (p.variants && p.variants.length > 0 ? [...new Set(p.variants.map((v: any) => v.color || v.colour || v.name).filter(Boolean))] : []) || (p.options?.find((o: any) => o.name?.toLowerCase().includes("color") || o.name?.toLowerCase().includes("colour"))?.values || []),
        stock_quantity: stockQuantity,
        stock_status: stockStatus,
        variants: Array.isArray(p.variants) ? p.variants.map((v: any) => ({
          name: v.name || v.size || v.color || "Default",
          size: v.size || null,
          color: v.color || null,
          stock_quantity: v.stockQuantity ?? v.inventory ?? v.quantity ?? stockQuantity,
          sku: v.sku || p.sku || null
        })) : []
      };
    });

    // Deduplicate by name
    const uniqueProducts = Array.from(new Map(products.map(p => [p.name, p])).values());
    console.log(`Syncing ${uniqueProducts.length} unique products from API...`);

    // Fetch existing products by name
    const { data: existingProducts, error: fetchErr } = await supabase
      .from('products')
      .select('id, name')
      .in('name', uniqueProducts.map(p => p.name));

    if (fetchErr) throw fetchErr;

    const existingMap = new Map(existingProducts?.map(p => [p.name, p.id]) || []);

    const toInsert = [];
    const toUpdate = [];

    for (const p of uniqueProducts) {
      const existingId = existingMap.get(p.name);
      const productRow = {
        name: p.name,
        description: p.description,
        category: p.category,
        price: p.price,
        images: p.images,
        source_url: p.source_url,
        status: 'active',
        sizes: p.sizes,
        colors: p.colors,
        stock_quantity: p.stock_quantity,
        stock_status: p.stock_status,
        variants: p.variants
      };

      if (existingId) {
        toUpdate.push({ id: existingId, ...productRow });
      } else {
        toInsert.push(productRow);
      }
    }

    if (toInsert.length > 0) {
      console.log(`Inserting ${toInsert.length} new products...`);
      const { error: insErr } = await supabase.from('products').insert(toInsert);
      if (insErr) throw insErr;
    }

    if (toUpdate.length > 0) {
      console.log(`Updating ${toUpdate.length} existing products...`);
      const { error: updErr } = await supabase.from('products').upsert(toUpdate);
      if (updErr) throw updErr;
    }

    const duration = Date.now() - startTime;
    
    // Log sync
    await supabase.from('sync_logs').insert({
      status: 'success',
      products_synced: uniqueProducts.length,
      new_products_count: toInsert.length,
      updated_products_count: toUpdate.length,
      duration_ms: duration,
    });

    return new Response(
      JSON.stringify({ success: true, imported: uniqueProducts.length, newCount: toInsert.length, updatedCount: toUpdate.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Sync Error:', error);
    
    const duration = Date.now() - startTime;
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    await supabase.from('sync_logs').insert({
      status: 'failed',
      error_message: error.message || 'Unknown error',
      duration_ms: duration,
    });

    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
