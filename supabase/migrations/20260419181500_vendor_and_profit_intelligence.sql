-- Migration: Vendor and Profit Intelligence
-- Created at: 2026-04-19 18:15:00

-- ============ SETTINGS ============
CREATE TABLE IF NOT EXISTS public.settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO public.settings (key, value, description)
VALUES ('operations_cost', '5000', 'Global operations cost per order in MWK')
ON CONFLICT (key) DO NOTHING;

-- ============ VENDORS ============
CREATE TABLE IF NOT EXISTS public.vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    business_name TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT NOT NULL,
    location TEXT,
    category TEXT,
    payment_details TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'limited', 'suspended')),
    score NUMERIC(5,2) DEFAULT 100.00,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Vendors are viewable by everyone" ON public.vendors FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage vendors" ON public.vendors FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============ EXTEND PRODUCTS ============
ALTER TABLE public.products ADD COLUMN vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL;
ALTER TABLE public.products ADD COLUMN vendor_cost NUMERIC(15,2);
ALTER TABLE public.products ADD COLUMN inventory_mode TEXT DEFAULT 'flexible' CHECK (inventory_mode IN ('fixed', 'flexible'));
ALTER TABLE public.products ADD COLUMN stock_quantity INTEGER DEFAULT 0;
ALTER TABLE public.products ADD COLUMN sizes TEXT[] DEFAULT '{}';
ALTER TABLE public.products ADD COLUMN colors TEXT[] DEFAULT '{}';

-- ============ EXTEND ORDERS ============
ALTER TABLE public.orders ADD COLUMN vendor_cost NUMERIC(15,2);
ALTER TABLE public.orders ADD COLUMN operations_cost NUMERIC(15,2);
ALTER TABLE public.orders ADD COLUMN gross_margin NUMERIC(15,2);
ALTER TABLE public.orders ADD COLUMN base_profit NUMERIC(15,2);
ALTER TABLE public.orders ADD COLUMN surplus_profit NUMERIC(15,2);
ALTER TABLE public.orders ADD COLUMN surplus_type TEXT CHECK (surplus_type IN ('agent', 'direct'));
ALTER TABLE public.orders ADD COLUMN vendor_confirmation_status TEXT DEFAULT 'pending' CHECK (vendor_confirmation_status IN ('pending', 'accepted', 'rejected'));
ALTER TABLE public.orders ADD COLUMN vendor_confirmed_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN rider_id UUID;
ALTER TABLE public.orders ADD COLUMN delivery_proof_url TEXT;

-- ============ VENDOR PAYOUTS ============
CREATE TABLE IF NOT EXISTS public.vendor_payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    amount NUMERIC(15,2) NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.vendor_payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Vendors can view their own payouts" ON public.vendor_payouts FOR SELECT TO authenticated USING (auth.uid() IN (SELECT user_id FROM public.vendors WHERE id = vendor_id));
CREATE POLICY "Admins can manage payouts" ON public.vendor_payouts FOR ALL TO authenticated USING (true);

-- ============ LOGIC: PRICING ENGINE ============
CREATE OR REPLACE FUNCTION public.calculate_product_price()
RETURNS TRIGGER AS $$
DECLARE
  v_ops_cost NUMERIC;
BEGIN
  -- 1. Get current operations cost from settings
  SELECT (value::numeric) INTO v_ops_cost FROM public.settings WHERE key = 'operations_cost';
  IF v_ops_cost IS NULL THEN v_ops_cost := 0; END IF;

  -- 2. Calculate price: (vendor_cost + operations_cost) / 0.55
  IF NEW.vendor_cost IS NOT NULL AND NEW.vendor_cost > 0 THEN
    NEW.price := (NEW.vendor_cost + v_ops_cost) / 0.55;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE TRIGGER trigger_calculate_product_price
BEFORE INSERT OR UPDATE OF vendor_cost ON public.products
FOR EACH ROW EXECUTE FUNCTION public.calculate_product_price();

-- ============ LOGIC: PROFIT INTELLIGENCE ============
CREATE OR REPLACE FUNCTION public.calculate_order_profit()
RETURNS TRIGGER AS $$
DECLARE
  v_vendor_cost_total NUMERIC := 0;
  v_ops_cost NUMERIC;
  v_item JSONB;
  v_product_vendor_cost NUMERIC;
  v_max_commission NUMERIC;
  v_actual_deduction NUMERIC;
BEGIN
  -- 1. Get current operations cost from settings
  SELECT (value::numeric) INTO v_ops_cost FROM public.settings WHERE key = 'operations_cost';
  IF v_ops_cost IS NULL THEN v_ops_cost := 0; END IF;

  -- 2. Calculate total vendor cost from items
  FOR v_item IN SELECT * FROM jsonb_array_elements(NEW.items)
  LOOP
    SELECT vendor_cost INTO v_product_vendor_cost FROM public.products WHERE id = (v_item->>'product_id')::uuid;
    v_vendor_cost_total := v_vendor_cost_total + (COALESCE(v_product_vendor_cost, 0) * (v_item->>'quantity')::int);
  END LOOP;

  -- 3. Core Profit Metrics
  NEW.vendor_cost := v_vendor_cost_total;
  NEW.operations_cost := v_ops_cost;
  NEW.gross_margin := NEW.total - v_vendor_cost_total - v_ops_cost;
  NEW.base_profit := NEW.total * 0.30;
  
  -- 4. Surplus Logic
  -- max_commission = 15% of selling_price
  v_max_commission := NEW.total * 0.15;
  
  -- actual_deduction = agent_commission OR customer_discount
  -- For now, we use the commission amount if an agent is attached
  IF NEW.agent_id IS NOT NULL THEN
    -- Try to find commission amount from commissions table (if already calculated)
    -- Or calculate it here based on agent rate
    SELECT (NEW.total * commission_rate / 100) INTO v_actual_deduction FROM public.agents WHERE id = NEW.agent_id;
    NEW.surplus_type := 'agent';
  ELSE
    v_actual_deduction := 0; -- Assuming no direct discount for now
    NEW.surplus_type := 'direct';
  END IF;

  NEW.surplus_profit := v_max_commission - COALESCE(v_actual_deduction, 0);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE TRIGGER trigger_calculate_order_profit
BEFORE INSERT OR UPDATE OF status ON public.orders
FOR EACH ROW
WHEN (NEW.status = 'delivered')
EXECUTE FUNCTION public.calculate_order_profit();

-- ============ LOGIC: RESPONSIVE TIEM TRACKING ============
CREATE OR REPLACE FUNCTION public.track_vendor_response_time()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.vendor_confirmation_status = 'pending' AND NEW.vendor_confirmation_status IN ('accepted', 'rejected')) THEN
        NEW.vendor_confirmed_at := now();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_track_vendor_response_time
BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.track_vendor_response_time();
