-- ============================================================
-- Vendor Workflow Multi-Vendor Payout Fix
-- Corrects: Payout calculation for orders with items from multiple vendors
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_vendor_payout_on_delivery()
RETURNS TRIGGER AS $$
DECLARE
  v_vendor_record RECORD;
  v_vendor_total NUMERIC;
BEGIN
  -- Only trigger when status changes to 'delivered'
  IF OLD.status IS DISTINCT FROM 'delivered' AND NEW.status = 'delivered' THEN
    
    -- Loop through each unique vendor in the order
    FOR v_vendor_record IN 
      SELECT DISTINCT p.vendor_id
      FROM jsonb_array_elements(NEW.items) AS item
      JOIN public.products p ON p.id = (item->>'product_id')::uuid
      WHERE p.vendor_id IS NOT NULL
    LOOP
      
      -- Calculate the total vendor_cost for this specific vendor's items in this order
      SELECT SUM((p.vendor_cost * (item->>'quantity')::int))
      INTO v_vendor_total
      FROM jsonb_array_elements(NEW.items) AS item
      JOIN public.products p ON p.id = (item->>'product_id')::uuid
      WHERE p.vendor_id = v_vendor_record.vendor_id;

      -- Insert or update payout record
      INSERT INTO public.vendor_payouts (vendor_id, order_id, amount, status)
      VALUES (v_vendor_record.vendor_id, NEW.id, COALESCE(v_vendor_total, 0), 'pending')
      ON CONFLICT (vendor_id, order_id) DO UPDATE 
      SET amount = EXCLUDED.amount;
      
    END LOOP;

    -- Set delivery confirmed timestamp if not set
    IF NEW.delivery_confirmed_at IS NULL THEN
      NEW.delivery_confirmed_at := now();
    END IF;
    
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
