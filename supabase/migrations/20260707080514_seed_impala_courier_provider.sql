-- Add missing columns first (all safe and idempotent)
ALTER TABLE public.courier_providers
ADD COLUMN IF NOT EXISTS capabilities JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS tracking_url_template TEXT,
ADD COLUMN IF NOT EXISTS api_base_url TEXT;

-- Insert Impala Courier (only using actual existing columns)
INSERT INTO public.courier_providers (name, code, environment, active)
VALUES ('Impala Courier', 'IMPALA_COURIER', 'production', true)
ON CONFLICT (code) DO UPDATE 
SET 
  name = EXCLUDED.name,
  environment = EXCLUDED.environment,
  active = true;
