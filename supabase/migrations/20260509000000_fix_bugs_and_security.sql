-- Migration to fix commission creation logic and vendor orders data leak

-- 1. Create pending commission on order insert
CREATE OR REPLACE FUNCTION public.create_pending_commission()
RETURNS TRIGGER AS $$
DECLARE
  v_agent_rate NUMERIC;
  v_commission_amount NUMERIC;
BEGIN
  IF (NEW.is_first_order AND NEW.agent_id IS NOT NULL) THEN
    SELECT commission_rate INTO v_agent_rate FROM public.agents WHERE id = NEW.agent_id;
    v_commission_amount := NEW.total * (COALESCE(v_agent_rate, 5) / 100);
    
    INSERT INTO public.commissions (agent_id, order_id, amount, status)
    VALUES (NEW.agent_id, NEW.id, v_commission_amount, 'pending');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trigger_create_pending_commission
AFTER INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.create_pending_commission();

-- 2. Update completion logic to mark commission as paid, instead of creating it
CREATE OR REPLACE FUNCTION public.handle_order_completion_logic()
RETURNS TRIGGER AS $$
DECLARE
  v_total_spent NUMERIC;
  v_total_orders INTEGER;
  v_threshold NUMERIC := 500000;
BEGIN
  IF (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'delivered') THEN
    
    -- Update commission to paid if it exists
    UPDATE public.commissions SET status = 'paid' WHERE order_id = NEW.id;

    -- Update customer statistics
    UPDATE public.customers
    SET 
      total_orders = total_orders + 1,
      total_spent = total_spent + NEW.total,
      updated_at = now()
    WHERE id = NEW.customer_id
    RETURNING total_orders, total_spent INTO v_total_orders, v_total_spent;

    -- Update customer status
    IF v_total_spent > v_threshold THEN
      UPDATE public.customers SET customer_status = 'high_value' WHERE id = NEW.customer_id;
    ELSIF v_total_orders > 1 THEN
      UPDATE public.customers SET customer_status = 'returning' WHERE id = NEW.customer_id;
    END IF;

    -- Trigger WhatsApp Follow-up (via pg_net to Edge Function)
    PERFORM
      net.http_post(
        url := (SELECT value FROM (SELECT current_setting('custom.supabase_url', true) AS value) AS settings) || '/functions/v1/order-automation',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (SELECT value FROM (SELECT current_setting('custom.service_role_key', true) AS value) AS settings)
        ),
        body := jsonb_build_object(
          'type', 'UPDATE',
          'record', row_to_json(NEW),
          'old_record', row_to_json(OLD)
        )
      );

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 3. Create secure RPC for vendor orders to prevent data leak
CREATE OR REPLACE FUNCTION public.get_vendor_orders(p_vendor_id UUID)
RETURNS SETOF public.orders
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT o.* 
  FROM public.orders o
  WHERE EXISTS (
    SELECT 1 
    FROM jsonb_array_elements(o.items) AS item
    WHERE item->>'product_id' IS NOT NULL
      AND item->>'product_id' IN (
        SELECT id::text FROM public.products WHERE vendor_id = p_vendor_id
      )
  )
  ORDER BY o.created_at DESC;
$$;
