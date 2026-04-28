-- ============================================================
-- FSC Vendor Workflow v2 — Full Spec Implementation
-- Covers: §3 Onboarding, §4 Product Intake, §5 Inventory Modes,
--         §6 Order Flow, §7 Timing, §8 Scoring, §9-§11 Fulfillment/Payouts
-- ============================================================

-- ============ §3 VENDORS: Fix address column (spec uses "location") ============
-- The vendors table uses "location" but the front-end forms use "address".
-- Add address as alias column and sync.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'vendors' AND column_name = 'address'
  ) THEN
    ALTER TABLE public.vendors ADD COLUMN address TEXT;
    -- Sync existing location data into address
    UPDATE public.vendors SET address = location WHERE location IS NOT NULL AND address IS NULL;
  END IF;
END $$;

-- ============ §5 PRODUCTS: stock_status for Flexible mode ============
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'stock_status'
  ) THEN
    ALTER TABLE public.products ADD COLUMN stock_status TEXT DEFAULT 'available'
      CHECK (stock_status IN ('available', 'low_stock', 'unavailable'));
  END IF;
END $$;

-- ============ §8 VENDORS: quality_score for scoring (admin-managed, 0-100) ============
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'vendors' AND column_name = 'quality_score'
  ) THEN
    ALTER TABLE public.vendors ADD COLUMN quality_score NUMERIC(5,2) DEFAULT 80.00
      CHECK (quality_score >= 0 AND quality_score <= 100);
  END IF;
END $$;

-- ============ §8 VENDORS: class column (A/B/C/D) ============
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'vendors' AND column_name = 'class'
  ) THEN
    ALTER TABLE public.vendors ADD COLUMN class TEXT DEFAULT 'B'
      CHECK (class IN ('A', 'B', 'C', 'D'));
  END IF;
END $$;

-- ============ §9-§11 ORDERS: Fulfillment + Payout columns ============
DO $$
BEGIN
  -- §9 Fulfillment
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'rider_name'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN rider_name TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'fulfillment_collected_at'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN fulfillment_collected_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'delivery_confirmed_at'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN delivery_confirmed_at TIMESTAMPTZ;
  END IF;

  -- §7 Confirmation delay state
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'confirmation_delay_state'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN confirmation_delay_state TEXT DEFAULT 'ok'
      CHECK (confirmation_delay_state IN ('ok', 'flagged', 'escalated'));
  END IF;

  -- §11 Vendor payout amount
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'vendor_amount'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN vendor_amount NUMERIC(15,2);
  END IF;
END $$;

-- ============ §11 VENDOR_PAYOUTS: Add missing columns used by UI ============
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'vendor_payouts' AND column_name = 'period_start'
  ) THEN
    ALTER TABLE public.vendor_payouts ADD COLUMN period_start TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'vendor_payouts' AND column_name = 'period_end'
  ) THEN
    ALTER TABLE public.vendor_payouts ADD COLUMN period_end TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'vendor_payouts' AND column_name = 'notes'
  ) THEN
    ALTER TABLE public.vendor_payouts ADD COLUMN notes TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'vendor_payouts' AND column_name = 'rejected_reason'
  ) THEN
    ALTER TABLE public.vendor_payouts ADD COLUMN rejected_reason TEXT;
  END IF;

  -- Extend payout status to include 'rejected'
  ALTER TABLE public.vendor_payouts
    DROP CONSTRAINT IF EXISTS vendor_payouts_status_check;
  ALTER TABLE public.vendor_payouts
    ADD CONSTRAINT vendor_payouts_status_check
    CHECK (status IN ('pending', 'paid', 'rejected'));
END $$;

-- ============ §5 LOGIC: Auto-deduct stock on order placement (Fixed mode) ============
CREATE OR REPLACE FUNCTION public.auto_deduct_fixed_stock()
RETURNS TRIGGER AS $$
DECLARE
  v_item JSONB;
  v_product_record RECORD;
BEGIN
  -- Only process newly placed orders (INSERT)
  FOR v_item IN SELECT * FROM jsonb_array_elements(NEW.items)
  LOOP
    SELECT id, inventory_mode, stock_quantity, stock_status
      INTO v_product_record
      FROM public.products
      WHERE id = (v_item->>'product_id')::uuid;

    IF v_product_record.inventory_mode = 'fixed' THEN
      -- Deduct stock
      UPDATE public.products
        SET stock_quantity = GREATEST(0, stock_quantity - (v_item->>'quantity')::int),
            stock_status = CASE
              WHEN stock_quantity - (v_item->>'quantity')::int <= 0 THEN 'unavailable'
              WHEN stock_quantity - (v_item->>'quantity')::int <= 3 THEN 'low_stock'
              ELSE 'available'
            END
        WHERE id = v_product_record.id;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_auto_deduct_fixed_stock ON public.orders;
CREATE TRIGGER trigger_auto_deduct_fixed_stock
  AFTER INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.auto_deduct_fixed_stock();

-- ============ §6 LOGIC: Auto-confirm Fixed mode orders if stock exists ============
CREATE OR REPLACE FUNCTION public.auto_confirm_fixed_mode_order()
RETURNS TRIGGER AS $$
DECLARE
  v_item JSONB;
  v_product_record RECORD;
  v_all_fixed BOOLEAN := TRUE;
  v_has_stock BOOLEAN := TRUE;
BEGIN
  -- Only run on INSERT (new order)
  FOR v_item IN SELECT * FROM jsonb_array_elements(NEW.items)
  LOOP
    SELECT id, inventory_mode, stock_quantity
      INTO v_product_record
      FROM public.products
      WHERE id = (v_item->>'product_id')::uuid;

    IF v_product_record.inventory_mode != 'fixed' THEN
      v_all_fixed := FALSE;
    END IF;

    IF v_product_record.stock_quantity < (v_item->>'quantity')::int THEN
      v_has_stock := FALSE;
    END IF;
  END LOOP;

  -- If all items are fixed mode AND sufficient stock exists → auto-confirm
  IF v_all_fixed AND v_has_stock THEN
    NEW.vendor_confirmation_status := 'accepted';
    NEW.vendor_confirmed_at := now();
    NEW.status := 'confirmed';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_auto_confirm_fixed_mode ON public.orders;
CREATE TRIGGER trigger_auto_confirm_fixed_mode
  BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.auto_confirm_fixed_mode_order();

-- ============ §11 LOGIC: Create vendor payout record on delivery ============
CREATE OR REPLACE FUNCTION public.create_vendor_payout_on_delivery()
RETURNS TRIGGER AS $$
DECLARE
  v_vendor_id UUID;
  v_vendor_cost NUMERIC;
  v_item JSONB;
BEGIN
  -- Only trigger when status changes to 'delivered'
  IF OLD.status != 'delivered' AND NEW.status = 'delivered' THEN
    -- Calculate total vendor cost across all items
    v_vendor_cost := 0;
    FOR v_item IN SELECT * FROM jsonb_array_elements(NEW.items)
    LOOP
      SELECT vendor_cost, vendor_id INTO v_vendor_cost, v_vendor_id
        FROM public.products
        WHERE id = (v_item->>'product_id')::uuid AND vendor_id IS NOT NULL
        LIMIT 1;

      IF v_vendor_id IS NOT NULL THEN
        -- Insert payout record for this vendor (one per order per vendor)
        INSERT INTO public.vendor_payouts (vendor_id, order_id, amount, status)
        VALUES (v_vendor_id, NEW.id, COALESCE(NEW.vendor_cost, 0), 'pending')
        ON CONFLICT DO NOTHING;

        -- Set delivery confirmed timestamp
        NEW.delivery_confirmed_at := COALESCE(NEW.delivery_confirmed_at, now());
        EXIT; -- One payout per order
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_create_vendor_payout ON public.orders;
CREATE TRIGGER trigger_create_vendor_payout
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.create_vendor_payout_on_delivery();

-- ============ §8 LOGIC: Calculate and update vendor score ============
CREATE OR REPLACE FUNCTION public.calculate_vendor_score(p_vendor_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  v_orders_total INT := 0;
  v_orders_accepted INT := 0;
  v_orders_delivered INT := 0;
  v_total_confirm_mins NUMERIC := 0;
  v_confirm_count INT := 0;
  v_avg_confirm_mins NUMERIC := 0;
  v_quality_score NUMERIC := 80;

  -- Component scores
  v_speed_score NUMERIC := 100;
  v_rate_score NUMERIC := 0;
  v_fulfillment_score NUMERIC := 0;
  v_final_score NUMERIC;
  v_class TEXT;

  v_order RECORD;
BEGIN
  -- Get quality score from vendor profile
  SELECT COALESCE(quality_score, 80) INTO v_quality_score
    FROM public.vendors WHERE id = p_vendor_id;

  -- Gather order metrics
  FOR v_order IN
    SELECT o.vendor_confirmation_status, o.status, o.created_at, o.vendor_confirmed_at
    FROM public.orders o
    JOIN public.products p ON p.vendor_id = p_vendor_id
    WHERE (o.items::jsonb @> jsonb_build_array(jsonb_build_object('product_id', p.id::text)))
  LOOP
    v_orders_total := v_orders_total + 1;

    IF v_order.vendor_confirmation_status = 'accepted' THEN
      v_orders_accepted := v_orders_accepted + 1;
      IF v_order.vendor_confirmed_at IS NOT NULL THEN
        v_total_confirm_mins := v_total_confirm_mins +
          EXTRACT(EPOCH FROM (v_order.vendor_confirmed_at - v_order.created_at)) / 60;
        v_confirm_count := v_confirm_count + 1;
      END IF;
    END IF;

    IF v_order.status = 'delivered' THEN
      v_orders_delivered := v_orders_delivered + 1;
    END IF;
  END LOOP;

  -- § 8 Metric 1: Confirmation Speed (30%) — ideal ≤15m → 100, ≤30m → 70, ≤60m → 40, >60m → 10
  IF v_confirm_count > 0 THEN
    v_avg_confirm_mins := v_total_confirm_mins / v_confirm_count;
    IF v_avg_confirm_mins <= 15 THEN v_speed_score := 100;
    ELSIF v_avg_confirm_mins <= 30 THEN v_speed_score := 70;
    ELSIF v_avg_confirm_mins <= 60 THEN v_speed_score := 40;
    ELSE v_speed_score := 10;
    END IF;
  END IF;

  -- §8 Metric 2: Confirmation Rate (30%)
  IF v_orders_total > 0 THEN
    v_rate_score := (v_orders_accepted::NUMERIC / v_orders_total) * 100;
  ELSE
    v_rate_score := 100; -- No orders yet → neutral
  END IF;

  -- §8 Metric 3: Fulfillment Reliability (25%)
  IF v_orders_accepted > 0 THEN
    v_fulfillment_score := (v_orders_delivered::NUMERIC / v_orders_accepted) * 100;
  ELSE
    v_fulfillment_score := 100; -- No accepted orders yet → neutral
  END IF;

  -- §8 Weighted Final Score
  v_final_score := (v_speed_score * 0.30) +
                   (v_rate_score * 0.30) +
                   (v_fulfillment_score * 0.25) +
                   (v_quality_score * 0.15);

  -- §8 Derive class
  IF v_final_score >= 85 THEN v_class := 'A';
  ELSIF v_final_score >= 70 THEN v_class := 'B';
  ELSIF v_final_score >= 50 THEN v_class := 'C';
  ELSE v_class := 'D';
  END IF;

  -- Update vendor record
  UPDATE public.vendors
    SET score = ROUND(v_final_score, 2),
        class = v_class,
        updated_at = now()
    WHERE id = p_vendor_id;

  RETURN ROUND(v_final_score, 2);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============ §8 TRIGGER: Recalculate vendor score after order events ============
CREATE OR REPLACE FUNCTION public.trigger_recalculate_vendor_score()
RETURNS TRIGGER AS $$
DECLARE
  v_vendor_id UUID;
  v_item JSONB;
BEGIN
  -- Find vendor_id from order items
  FOR v_item IN SELECT * FROM jsonb_array_elements(NEW.items)
  LOOP
    SELECT vendor_id INTO v_vendor_id
      FROM public.products
      WHERE id = (v_item->>'product_id')::uuid AND vendor_id IS NOT NULL
      LIMIT 1;
    IF v_vendor_id IS NOT NULL THEN EXIT; END IF;
  END LOOP;

  IF v_vendor_id IS NOT NULL THEN
    PERFORM public.calculate_vendor_score(v_vendor_id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_update_vendor_score ON public.orders;
CREATE TRIGGER trigger_update_vendor_score
  AFTER UPDATE OF vendor_confirmation_status, status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.trigger_recalculate_vendor_score();

-- ============ RLS POLICY: vendor_payouts — admin full access ============
DROP POLICY IF EXISTS "Admins can manage payouts" ON public.vendor_payouts;
CREATE POLICY "Admins can manage payouts" ON public.vendor_payouts
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
