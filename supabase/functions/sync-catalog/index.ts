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

    const products = apiData.data.map((p: any) => ({
      name: p.name,
      description: p.description,
      category: p.category?.name || p.productType || "General",
      price: p.salePrice || p.price,
      images: p.images || [],
      source_url: "https://www.forgivenshoppingcentre.com/",
      status: 'active',
      sizes: p.sizes || (p.variants && p.variants.length > 0 ? [...new Set(p.variants.map((v: any) => v.size || v.value || v.name).filter(Boolean))] : []) || (p.options?.find((o: any) => o.name?.toLowerCase().includes("size"))?.values || []),
      colors: p.colors || (p.variants && p.variants.length > 0 ? [...new Set(p.variants.map((v: any) => v.color || v.colour || v.name).filter(Boolean))] : []) || (p.options?.find((o: any) => o.name?.toLowerCase().includes("color") || o.name?.toLowerCase().includes("colour"))?.values || [])
    }));

    // Deduplicate by name
    const uniqueProducts = Array.from(new Map(products.map(p => [p.name, p])).values());
    console.log(`Syncing ${uniqueProducts.length} unique products from API...`);

    // Upsert into products table
    const { error } = await supabase.from('products').upsert(
      uniqueProducts.map(p => ({
        name: p.name,
        description: p.description,
        category: p.category,
        price: p.price,
        images: p.images,
        source_url: p.source_url,
        status: 'active',
        sizes: p.sizes,
        colors: p.colors
      })),
      { onConflict: 'name' }
    );

    if (error) throw error;

    return new Response(
      JSON.stringify({ success: true, imported: uniqueProducts.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Sync Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
