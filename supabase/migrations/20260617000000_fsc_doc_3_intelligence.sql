-- ============================================================
-- MIGRATION: FSC Document 3 Business Intelligence Updates
-- Date: 2026-06-17
-- Description: Replaces old pricing model and commission logic 
--              with the allocation model specified in Doc 3.
-- ============================================================

-- 1. Extend `products` table
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS rights_type TEXT CHECK (rights_type IN ('shared', 'exclusive', 'fsc_owned')) DEFAULT 'shared';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS landed_cost NUMERIC(15,2);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS cac_allocation_pct NUMERIC(5,2) DEFAULT 15.00;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS packaging_allocation NUMERIC(15,2) DEFAULT 0.00;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS logistics_allocation NUMERIC(15,2) DEFAULT 0.00;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS fsc_markup_pct NUMERIC(5,2);

-- 2. Extend `orders` table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS total_vendor_cost NUMERIC(15,2) DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS fsc_markup_total NUMERIC(15,2) DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cac_total NUMERIC(15,2) DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS packaging_total NUMERIC(15,2) DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS logistics_total NUMERIC(15,2) DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS agent_commission_total NUMERIC(15,2) DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS net_fsc_contribution NUMERIC(15,2) DEFAULT 0;

-- 3. Create `fund_allocations` table
CREATE TABLE IF NOT EXISTS public.fund_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    fund_type TEXT NOT NULL CHECK (fund_type IN ('operations', 'acquisition', 'packaging', 'infrastructure', 'reinvestment', 'reserve')),
    amount NUMERIC(15,2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on fund_allocations
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'fund_allocations' 
        AND policyname = 'Admins can manage fund allocations'
    ) THEN
        CREATE POLICY "Admins can manage fund allocations" ON public.fund_allocations FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
END $$;

-- 4. Rewrite `calculate_product_price`
CREATE OR REPLACE FUNCTION public.calculate_product_price()
RETURNS TRIGGER AS $$
DECLARE
  v_basis NUMERIC := 0;
  v_markup_pct NUMERIC := 0;
  v_cac_pct NUMERIC := 0;
BEGIN
  -- Determine basis and markup depending on rights type
  IF NEW.rights_type = 'fsc_owned' THEN
    v_basis := COALESCE(NEW.landed_cost, 0);
    v_markup_pct := COALESCE(NEW.fsc_markup_pct, 25);
  ELSIF NEW.rights_type = 'exclusive' THEN
    v_basis := COALESCE(NEW.vendor_cost, 0);
    v_markup_pct := COALESCE(NEW.fsc_markup_pct, 25);
  ELSE
    v_basis := COALESCE(NEW.vendor_cost, 0);
    v_markup_pct := COALESCE(NEW.fsc_markup_pct, 15);
  END IF;

  v_cac_pct := COALESCE(NEW.cac_allocation_pct, 15);

  -- Calculate price
  IF v_basis > 0 THEN
    NEW.price := v_basis 
                 + (v_basis * (v_markup_pct / 100)) 
                 + (v_basis * (v_cac_pct / 100)) 
                 + COALESCE(NEW.packaging_allocation, 0) 
                 + COALESCE(NEW.logistics_allocation, 0);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. Calculate Order Allocations before insert/update
CREATE OR REPLACE FUNCTION public.calculate_order_allocations()
RETURNS TRIGGER AS $$
DECLARE
  v_item JSONB;
  v_prod RECORD;
  v_qty INT;
  v_basis NUMERIC;
  v_markup_pct NUMERIC;
BEGIN
  NEW.total_vendor_cost := 0;
  NEW.fsc_markup_total := 0;
  NEW.cac_total := 0;
  NEW.packaging_total := 0;
  NEW.logistics_total := 0;

  FOR v_item IN SELECT * FROM jsonb_array_elements(NEW.items)
  LOOP
    SELECT vendor_cost, landed_cost, rights_type, cac_allocation_pct, packaging_allocation, logistics_allocation, fsc_markup_pct 
    INTO v_prod
    FROM public.products WHERE id = (v_item->>'product_id')::uuid;
    
    v_qty := (v_item->>'quantity')::int;
    
    IF v_prod.rights_type = 'fsc_owned' THEN
       v_basis := COALESCE(v_prod.landed_cost, 0);
       v_markup_pct := COALESCE(v_prod.fsc_markup_pct, 25);
    ELSIF v_prod.rights_type = 'exclusive' THEN
       v_basis := COALESCE(v_prod.vendor_cost, 0);
       v_markup_pct := COALESCE(v_prod.fsc_markup_pct, 25);
    ELSE
       v_basis := COALESCE(v_prod.vendor_cost, 0);
       v_markup_pct := COALESCE(v_prod.fsc_markup_pct, 15);
    END IF;

    NEW.total_vendor_cost := NEW.total_vendor_cost + (v_basis * v_qty);
    NEW.fsc_markup_total := NEW.fsc_markup_total + (v_basis * (v_markup_pct / 100) * v_qty);
    NEW.cac_total := NEW.cac_total + (v_basis * (COALESCE(v_prod.cac_allocation_pct, 15) / 100) * v_qty);
    NEW.packaging_total := NEW.packaging_total + (COALESCE(v_prod.packaging_allocation, 0) * v_qty);
    NEW.logistics_total := NEW.logistics_total + (COALESCE(v_prod.logistics_allocation, 0) * v_qty);
  END LOOP;

  -- Maintain backward compatibility
  NEW.vendor_cost := NEW.total_vendor_cost;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_calculate_order_allocations ON public.orders;
CREATE TRIGGER trigger_calculate_order_allocations
BEFORE INSERT OR UPDATE OF items ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.calculate_order_allocations();


-- 6. Rewrite `create_pending_commission` (AFTER INSERT)
CREATE OR REPLACE FUNCTION public.create_pending_commission()
RETURNS TRIGGER AS $$
DECLARE
  v_agent_id         UUID;
  v_agent_rate       NUMERIC;
  v_commission_amount NUMERIC := 0;
  v_agent_total_sales NUMERIC;
BEGIN
  -- Resolve agent
  v_agent_id := COALESCE(NEW.attributed_agent_id, NEW.agent_id);

  IF v_agent_id IS NOT NULL THEN
    -- Calculate agent's total sales this month to determine tier
    SELECT COALESCE(SUM(total), 0) INTO v_agent_total_sales
    FROM public.orders
    WHERE COALESCE(attributed_agent_id, agent_id) = v_agent_id
      AND created_at >= date_trunc('month', now())
      AND status NOT IN ('cancelled', 'refunded');

    -- Tier calculation based on Vendor Cost or Landed Cost basis (total_vendor_cost)
    IF v_agent_total_sales >= 1000000 THEN
      v_agent_rate := 15;
    ELSIF v_agent_total_sales >= 500000 THEN
      v_agent_rate := 12;
    ELSIF v_agent_total_sales >= 200000 THEN
      v_agent_rate := 10;
    ELSE
      v_agent_rate := 8;
    END IF;

    -- Agent rate should be updated on agent profile for reference
    UPDATE public.agents SET commission_rate = v_agent_rate WHERE id = v_agent_id;

    -- Commission based on cost basis NOT selling price
    v_commission_amount := NEW.total_vendor_cost * (v_agent_rate / 100);

    -- Insert commission
    INSERT INTO public.commissions (agent_id, order_id, amount, status)
    VALUES (v_agent_id, NEW.id, v_commission_amount, 'pending');

    -- Update Order with Net Contribution
    UPDATE public.orders
    SET agent_commission_total = v_commission_amount,
        net_fsc_contribution = fsc_markup_total - v_commission_amount,
        surplus_profit = fsc_markup_total - v_commission_amount, -- backward compat
        surplus_type = 'agent'
    WHERE id = NEW.id;

  ELSE
    -- Direct Sale
    UPDATE public.orders
    SET agent_commission_total = 0,
        net_fsc_contribution = fsc_markup_total,
        surplus_profit = fsc_markup_total, -- backward compat
        surplus_type = 'direct'
    WHERE id = NEW.id;
  END IF;

  -- INSERT FUND ALLOCATIONS
  INSERT INTO public.fund_allocations (order_id, fund_type, amount, notes) VALUES
    (NEW.id, 'acquisition', NEW.cac_total, 'Auto-allocation on order creation'),
    (NEW.id, 'packaging', NEW.packaging_total, 'Auto-allocation on order creation'),
    (NEW.id, 'reinvestment', (NEW.fsc_markup_total - v_commission_amount), 'Net FSC Contribution allocation');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Disable old profit intelligence logic on delivery, since we now calculate upfront
DROP TRIGGER IF EXISTS trigger_calculate_order_profit ON public.orders;

