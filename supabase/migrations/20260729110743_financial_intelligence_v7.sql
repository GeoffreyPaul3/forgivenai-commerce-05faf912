-- 1. Create pricing_policies table
CREATE TABLE public.pricing_policies (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 TEXT NOT NULL,
  version              INTEGER NOT NULL DEFAULT 1,
  effective_from       TIMESTAMPTZ NOT NULL DEFAULT now(),
  effective_to         TIMESTAMPTZ,
  commission_rate      NUMERIC(5,2) DEFAULT 8.00,
  gateway_rate         NUMERIC(5,2) DEFAULT 2.50,
  marketing_rate       NUMERIC(5,2) DEFAULT 3.00,
  platform_rate        NUMERIC(5,2) DEFAULT 1.00,
  reserve_rate         NUMERIC(5,2) DEFAULT 1.00,
  tax_rate             NUMERIC(5,2) DEFAULT 0.00,
  packaging_cost       NUMERIC(15,2) DEFAULT 500.00,
  delivery_cost        NUMERIC(15,2) DEFAULT 2000.00,
  operations_cost      NUMERIC(15,2) DEFAULT 5000.00,
  target_margin        NUMERIC(5,2) DEFAULT 30.00,
  currency             TEXT DEFAULT 'MWK',
  is_active            BOOLEAN DEFAULT false,
  created_by           UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes                TEXT,
  created_at           TIMESTAMPTZ DEFAULT now(),
  updated_at           TIMESTAMPTZ DEFAULT now()
);

-- Only one policy active at a time
CREATE UNIQUE INDEX idx_pricing_policies_active
  ON public.pricing_policies (is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.pricing_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to active policies" 
ON public.pricing_policies FOR SELECT 
USING (is_active = true OR auth.role() = 'authenticated');

CREATE POLICY "Allow admin full access to pricing policies" 
ON public.pricing_policies FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- Insert Default Policy
INSERT INTO public.pricing_policies (name, version, is_active, notes)
VALUES ('FSC Standard Pricing Policy', 1, true, 'Default policy seeded during V7 upgrade.');


-- 2. Create pricing_events table
CREATE TABLE public.pricing_events (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id        UUID REFERENCES public.products(id) ON DELETE SET NULL,
  event_type        TEXT NOT NULL CHECK (event_type IN (
                      'price_set', 'policy_applied', 'policy_changed',
                      'cost_updated', 'discount_applied', 'vendor_cost_changed')),
  old_policy_id     UUID REFERENCES public.pricing_policies(id) ON DELETE SET NULL,
  new_policy_id     UUID REFERENCES public.pricing_policies(id) ON DELETE SET NULL,
  old_selling_price NUMERIC(15,2),
  new_selling_price NUMERIC(15,2),
  old_vendor_cost   NUMERIC(15,2),
  new_vendor_cost   NUMERIC(15,2),
  reason            TEXT,
  changed_by        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata          JSONB DEFAULT '{}',
  created_at        TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS (Append Only, read by admin)
ALTER TABLE public.pricing_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow admin read access to pricing events" 
ON public.pricing_events FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

CREATE POLICY "Allow authenticated insert to pricing events" 
ON public.pricing_events FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');


-- 3. Create product_financial_profiles table
CREATE TABLE public.product_financial_profiles (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id               UUID NOT NULL UNIQUE REFERENCES public.products(id) ON DELETE CASCADE,
  policy_id                UUID REFERENCES public.pricing_policies(id) ON DELETE SET NULL,
  commission_rate_override NUMERIC(5,2),
  gateway_rate_override    NUMERIC(5,2),
  marketing_rate_override  NUMERIC(5,2),
  packaging_cost_override  NUMERIC(15,2),
  delivery_cost_override   NUMERIC(15,2),
  notes                    TEXT,
  created_at               TIMESTAMPTZ DEFAULT now(),
  updated_at               TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.product_financial_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to product profiles" 
ON public.product_financial_profiles FOR SELECT 
USING (true);

CREATE POLICY "Allow admin full access to product profiles" 
ON public.product_financial_profiles FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- Optional: Function to get active policy easily from Edge Functions or triggers
CREATE OR REPLACE FUNCTION public.get_active_pricing_policy()
RETURNS SETOF public.pricing_policies
LANGUAGE sql STABLE
AS $$
  SELECT * FROM public.pricing_policies WHERE is_active = true LIMIT 1;
$$;
