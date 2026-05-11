-- ============================================================
-- Vendor Workflow Stabilization Migration
-- Fixes: vendor_amount calculation, payout trigger, and score logic
-- ============================================================

-- 1. Function to calculate vendor_amount for an order
CREATE OR REPLACE FUNCTION public.calculate_order_vendor_amount(p_order_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  v_total_vendor_cost NUMERIC := 0;
  v_item JSONB;
  v_cost NUMERIC;
BEGIN
  FOR v_item IN SELECT * FROM jsonb_array_elements((SELECT items FROM public.orders WHERE id = p_order_id))
  LOOP
    SELECT vendor_cost INTO v_cost
      FROM public.products
      WHERE id = (v_item->>'product_id')::uuid;
    
    IF v_cost IS NOT NULL THEN
      v_total_vendor_cost := v_total_vendor_cost + (v_cost * (v_item->>'quantity')::int);
    END IF;
  END LOOP;
  
  RETURN v_total_vendor_cost;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Trigger to auto-set vendor_amount on order insert/update
CREATE OR REPLACE FUNCTION public.trigger_set_order_vendor_amount()
RETURNS TRIGGER AS $$
BEGIN
  NEW.vendor_amount := public.calculate_order_vendor_amount(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_set_order_vendor_amount ON public.orders;
CREATE TRIGGER trigger_set_order_vendor_amount
  BEFORE INSERT OR UPDATE OF items ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_order_vendor_amount();

-- 3. Fix create_vendor_payout_on_delivery (use vendor_amount column)
CREATE OR REPLACE FUNCTION public.create_vendor_payout_on_delivery()
RETURNS TRIGGER AS $$
DECLARE
  v_vendor_id UUID;
  v_item JSONB;
BEGIN
  -- Only trigger when status changes to 'delivered'
  IF OLD.status IS DISTINCT FROM 'delivered' AND NEW.status = 'delivered' THEN
    -- Find the vendor(s) involved in this order
    FOR v_item IN SELECT * FROM jsonb_array_elements(NEW.items)
    LOOP
      SELECT vendor_id INTO v_vendor_id
        FROM public.products
        WHERE id = (v_item->>'product_id')::uuid AND vendor_id IS NOT NULL
        LIMIT 1;

      IF v_vendor_id IS NOT NULL THEN
        -- Insert payout record for this vendor
        INSERT INTO public.vendor_payouts (vendor_id, order_id, amount, status)
        VALUES (v_vendor_id, NEW.id, COALESCE(NEW.vendor_amount, 0), 'pending')
        ON CONFLICT DO NOTHING;
        
        -- Set delivery confirmed timestamp if not set
        IF NEW.delivery_confirmed_at IS NULL THEN
          NEW.delivery_confirmed_at := now();
        END IF;
        
        EXIT; -- One payout per order for now
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Backfill vendor_amount for existing orders
UPDATE public.orders SET vendor_amount = public.calculate_order_vendor_amount(id) WHERE vendor_amount IS NULL;
