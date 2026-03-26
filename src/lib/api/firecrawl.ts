import { supabase } from '@/integrations/supabase/client';

export const firecrawlApi = {
  async mapWebsite(url: string) {
    const { data, error } = await supabase.functions.invoke('firecrawl-products', {
      body: { action: 'map', url },
    });
    if (error) return { success: false, error: error.message };
    return data;
  },

  async scrapeUrl(url: string) {
    const { data, error } = await supabase.functions.invoke('firecrawl-products', {
      body: { action: 'scrape', url },
    });
    if (error) return { success: false, error: error.message };
    return data;
  },

  async crawlWebsite(url: string) {
    const { data, error } = await supabase.functions.invoke('firecrawl-products', {
      body: { action: 'crawl', url },
    });
    if (error) return { success: false, error: error.message };
    return data;
  },
};
