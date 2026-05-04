-- Create a caching layer for UGC generation
CREATE TABLE IF NOT EXISTS public.ugc_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT UNIQUE NOT NULL,
  image_url TEXT NOT NULL,
  influencer_id UUID,
  product_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS ugc_cache_key_idx ON public.ugc_cache (cache_key);

-- RLS
ALTER TABLE public.ugc_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for everyone" ON public.ugc_cache FOR ALL USING (true) WITH CHECK (true);
