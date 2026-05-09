-- Update completion logic to count revenue at 'paid' status instead of waiting for 'delivered'
CREATE OR REPLACE FUNCTION public.handle_order_completion_logic()
RETURNS TRIGGER AS $$
DECLARE
  v_total_spent NUMERIC;
  v_total_orders INTEGER;
  v_threshold NUMERIC := 500000;
  v_is_paid_transition BOOLEAN;
BEGIN
  -- Determine if this is the transition into a "Paid/Success" state
  -- We want to count it exactly once when it first hits 'paid', 'processing', 'shipped', or 'delivered'
  v_is_paid_transition := (
    (OLD.status IS NULL OR OLD.status NOT IN ('paid', 'processing', 'shipped', 'delivered')) 
    AND NEW.status IN ('paid', 'processing', 'shipped', 'delivered')
  );

  IF v_is_paid_transition THEN
    
    -- 1. Update commission to paid if it exists
    UPDATE public.commissions SET status = 'paid' WHERE order_id = NEW.id;

    -- 2. Update customer statistics
    UPDATE public.customers
    SET 
      total_orders = total_orders + 1,
      total_spent = total_spent + NEW.total,
      updated_at = now()
    WHERE id = NEW.customer_id
    RETURNING total_orders, total_spent INTO v_total_orders, v_total_spent;

    -- 3. Update customer status
    IF v_total_spent > v_threshold THEN
      UPDATE public.customers SET customer_status = 'high_value' WHERE id = NEW.customer_id;
    ELSIF v_total_orders > 1 THEN
      UPDATE public.customers SET customer_status = 'returning' WHERE id = NEW.customer_id;
    END IF;

    -- 4. Trigger WhatsApp Follow-up (via pg_net to Edge Function)
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

-- Backfill Geoffrey Paul's first_agent_id if he used a code in his recent orders
UPDATE public.customers c
SET first_agent_id = o.agent_id
FROM public.orders o
WHERE o.customer_id = c.id
  AND c.first_agent_id IS NULL
  AND o.agent_id IS NOT NULL;

-- Backfill customer stats for all existing 'paid' orders that might have been missed
-- This is a one-time sync to make the dashboard look "Real" as requested
UPDATE public.customers c
SET 
  total_orders = sub.cnt,
  total_spent = sub.total
FROM (
  SELECT customer_id, count(*) as cnt, sum(total) as total
  FROM public.orders
  WHERE status IN ('paid', 'processing', 'shipped', 'delivered')
  GROUP BY customer_id
) sub
WHERE c.id = sub.customer_id;
