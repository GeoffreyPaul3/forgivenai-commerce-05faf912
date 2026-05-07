import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const QWEN_API_URL = "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, action, limit = 20 } = await req.json();

    const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
    const QWEN_API_KEY = Deno.env.get('QWEN_API_KEY');
    
    if (!FIRECRAWL_API_KEY) throw new Error('FIRECRAWL_API_KEY not configured');
    if (!QWEN_API_KEY) throw new Error('QWEN_API_KEY not configured');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (action === 'sync' || action === 'sync-api') {
      let formattedUrl = (url || 'https://www.forgivenshoppingcentre.com/').trim();
      if (!formattedUrl.startsWith('http')) formattedUrl = `https://${formattedUrl}`;

      console.log('Starting sync for:', formattedUrl);
      const apiProducts: any[] = [];

      // Step 1: Fetch from Direct API (Fast & Reliable)
      try {
        console.log('Fetching from Direct API...');
        const apiRes = await fetch("https://www.forgivenshoppingcentre.com/api/products/all");
        const apiData = await apiRes.json();
        if (apiData.success && Array.isArray(apiData.data)) {
          apiData.data.forEach((p: any) => {
            apiProducts.push({
              name: p.name,
              description: p.description,
              category: p.category?.name || p.productType || "General",
              price: p.salePrice || p.price,
              images: p.images || [],
              source_url: formattedUrl,
              status: 'active'
            });
          });
          console.log(`Fetched ${apiProducts.length} products from API.`);
        }
      } catch (e) {
        console.warn('Direct API fetch failed, skipping API sync step:', e);
      }

      // Step 2: Scrape with Firecrawl (Only if explicitly requested or if API yielded nothing)
      const scrapedProducts: any[] = [];
      if (action === 'sync' && (apiProducts.length === 0 || limit > 0)) {
        console.log('Starting sync for:', formattedUrl);

        // Step 1: Discover and Scrape with Firecrawl
        const crawlResponse = await fetch('https://api.firecrawl.dev/v1/crawl', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: formattedUrl,
            limit: limit,
            scrapeOptions: {
              formats: ['markdown'],
              onlyMainContent: true,
            },
          }),
        });

        if (!crawlResponse.ok) {
          const err = await crawlResponse.json();
          throw new Error(`Firecrawl error: ${err.error || 'Crawl failed'}`);
        }

        const crawlData = await crawlResponse.json();
        const jobId = crawlData.id || crawlData.jobId;

        // Status polling (Firecrawl v1 crawl is async)
        let status = 'scraping';
        let results: any[] = [];
        let attempts = 0;
        
        while (status !== 'completed' && attempts < 15) {
          await new Promise(r => setTimeout(r, 4000));
          const statusRes = await fetch(`https://api.firecrawl.dev/v1/crawl/${jobId}`, {
            headers: { 'Authorization': `Bearer ${FIRECRAWL_API_KEY}` }
          });
          const statusData = await statusRes.json();
          status = statusData.status;
          if (status === 'completed') results = statusData.data;
          attempts++;
        }

        if (status !== 'completed' || results.length === 0) {
          throw new Error('Crawl timed out or returned no results');
        }

        console.log(`Found ${results.length} pages. Starting AI extraction...`);

        // Step 2: Extract products from each page using Qwen
        for (const page of results) {
          if (!page.markdown) continue;

          const aiRes = await fetch(QWEN_API_URL, {
            method: "POST",
            headers: { 
              "Authorization": `Bearer ${QWEN_API_KEY}`,
              "Content-Type": "application/json" 
            },
            body: JSON.stringify({
              model: "qwen-plus",
              messages: [
                { 
                  role: "system", 
                  content: "You are a specialized data extraction agent. Extract product information from fashion website content. Return ONLY valid JSON." 
                },
                { 
                  role: "user", 
                  content: `Extract all products from this markdown text. For each product, find: name, price (number only), description, category, and image URLs. 
                  Return format: {"products": [{"name": "...", "price": 123, "description": "...", "category": "...", "images": ["url1", "url2"]}]}
                  If no products found, return {"products": []}.
                  
                  Content:
                  ${page.markdown.substring(0, 6000)}` 
                }
              ],
              response_format: { type: "json_object" }
            }),
          });

          if (aiRes.ok) {
            const aiData = await aiRes.json();
            try {
              const parsed = JSON.parse(aiData.choices[0].message.content);
              if (parsed.products) {
                parsed.products.forEach((p: any) => {
                  if (p.name && p.name !== 'Untitled Product') {
                    scrapedProducts.push({
                       ...p,
                       source_url: page.metadata?.url || formattedUrl,
                       status: 'active'
                     });
                  }
                });
              }
            } catch (e) {
              console.warn('Failed to parse AI response for page', page.metadata?.url);
            }
          }
        }
      }

      const allExtracted = [...apiProducts, ...scrapedProducts];
      const uniqueExtracted = Array.from(new Map(allExtracted.map(p => [p.name, p])).values());
      console.log(`Deduplicated to ${uniqueExtracted.length} truly unique products.`);

      if (uniqueExtracted.length > 0) {
        // 1. Fetch existing products to avoid duplicates manually if constraint is missing
        const { data: existingProducts } = await supabase
          .from('products')
          .select('name')
          .in('name', uniqueExtracted.map(p => p.name));
        
        const existingNames = new Set(existingProducts?.map(p => p.name) || []);
        
        // 2. Separate into new and existing
        const newProducts = uniqueExtracted.filter(p => !existingNames.has(p.name));
        
        if (newProducts.length > 0) {
          console.log(`Inserting ${newProducts.length} new products...`);
          const { error: insErr } = await supabase.from('products').insert(
            newProducts.map(p => ({
              name: p.name,
              description: p.description,
              category: p.category,
              price: p.price,
              images: p.images,
              source_url: p.source_url,
              status: 'active',
            }))
          );
          if (insErr) throw insErr;
        }

        // 3. Optional: Update existing (Try UPSERT but don't crash if constraint is missing)
        try {
          await supabase.from('products').upsert(
            uniqueExtracted.map(p => ({
              name: p.name,
              description: p.description,
              category: p.category,
              price: p.price,
              images: p.images,
              source_url: p.source_url,
              status: 'active',
            })),
            { onConflict: 'name' }
          );
        } catch (e) {
          console.log("Upsert constraint missing or failed, skipping updates for now. New products were still imported.");
        }
      }

      return new Response(
        JSON.stringify({ success: true, imported: uniqueExtracted.length }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Keep legacy actions for compatibility
    if (action === 'import-products') {
      const { products } = await req.json();
      if (products && products.length > 0) {
        const { error } = await supabase.from('products').insert(products);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true, imported: products.length }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    return new Response(JSON.stringify({ error: 'Unsupported action' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
