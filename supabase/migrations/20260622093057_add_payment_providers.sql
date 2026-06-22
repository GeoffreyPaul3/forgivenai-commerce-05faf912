-- Add new columns to public.orders for payment orchestration
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_provider TEXT DEFAULT 'paychangu';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS external_reference TEXT;

-- Index for querying by external reference
CREATE INDEX IF NOT EXISTS idx_orders_external_reference ON public.orders(external_reference);

-- Populate default payment settings
INSERT INTO public.settings (key, value, description)
VALUES 
    ('default_payment_provider', 'paychangu', 'Default payment provider for checkout (paychangu or onekhusa)'),
    ('paychangu_enabled', 'true', 'Whether PayChangu is enabled as a payment option'),
    ('onekhusa_enabled', 'false', 'Whether OneKhusa is enabled as a payment option')
ON CONFLICT (key) DO UPDATE SET 
    description = EXCLUDED.description;
