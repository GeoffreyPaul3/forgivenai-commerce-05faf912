-- ==========================================
-- ENTERPRISE MULTI-COURIER UPGRADE MIGRATION
-- ==========================================

-- 1. Extend courier_providers with capabilities matrix and tracking
ALTER TABLE public.courier_providers
ADD COLUMN IF NOT EXISTS capabilities JSONB DEFAULT '{"supports_weight_pricing": false, "supports_value_pricing": false, "supports_same_day": false, "supports_tracking": false}'::jsonb,
ADD COLUMN IF NOT EXISTS tracking_url_template TEXT,
ADD COLUMN IF NOT EXISTS api_base_url TEXT;

-- 2. Seed Impala Courier
INSERT INTO public.courier_providers (name, code, environment, capabilities)
VALUES (
  'Impala Courier', 
  'IMPALA_COURIER', 
  'sandbox', 
  '{"supports_weight_pricing": true, "supports_value_pricing": true, "supports_same_day": false, "supports_tracking": true}'::jsonb
)
ON CONFLICT (code) DO UPDATE 
SET capabilities = EXCLUDED.capabilities;

-- 3. Extend delivery_orders for idempotency and ETA
ALTER TABLE public.delivery_orders
ADD COLUMN IF NOT EXISTS idempotency_key TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS estimated_delivery_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS provider_score NUMERIC(5,2);

-- 4. Create Logistics Configuration Table for Decision Engine
CREATE TABLE IF NOT EXISTS public.logistics_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key TEXT NOT NULL UNIQUE,
    setting_value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Seed default Decision Engine weights
INSERT INTO public.logistics_settings (setting_key, setting_value, description)
VALUES (
    'decision_engine_weights',
    '{"price": 0.40, "eta": 0.20, "reliability": 0.30, "business_rules": 0.10}',
    'Weights for the Logistics Orchestrator scoring algorithm'
) ON CONFLICT (setting_key) DO NOTHING;

-- RLS for logistics_settings
ALTER TABLE public.logistics_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view logistics_settings" ON public.logistics_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can manage logistics_settings" ON public.logistics_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6. Add Provider Metrics table for Health & Reliability
CREATE TABLE IF NOT EXISTS public.courier_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    courier_provider_id UUID NOT NULL REFERENCES public.courier_providers(id) ON DELETE CASCADE,
    metric_date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_requests INTEGER DEFAULT 0,
    failed_requests INTEGER DEFAULT 0,
    avg_response_time_ms INTEGER DEFAULT 0,
    circuit_breaker_status TEXT DEFAULT 'closed',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(courier_provider_id, metric_date)
);

ALTER TABLE public.courier_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view courier_metrics" ON public.courier_metrics FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can manage courier_metrics" ON public.courier_metrics FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER update_courier_metrics_updated_at BEFORE UPDATE ON public.courier_metrics FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
