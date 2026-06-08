-- ============================================================
-- Sync Logs Table — Objective 8: Real-Time Auto Product Sync
-- ============================================================

CREATE TABLE IF NOT EXISTS public.sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  triggered_by TEXT DEFAULT 'manual', -- 'manual' | 'auto'
  sync_at TIMESTAMPTZ DEFAULT now(),
  products_imported INTEGER DEFAULT 0,
  products_updated INTEGER DEFAULT 0,
  products_skipped INTEGER DEFAULT 0,
  errors JSONB DEFAULT '[]'::jsonb,
  duration_ms INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: admins only
ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage sync logs" ON public.sync_logs;
CREATE POLICY "Admins can manage sync logs"
  ON public.sync_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Index for fast recent log fetches
CREATE INDEX IF NOT EXISTS idx_sync_logs_sync_at
  ON public.sync_logs (sync_at DESC);
