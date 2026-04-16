
-- Update handle_order_completion_logic to trigger for more statuses
CREATE OR REPLACE FUNCTION public.handle_order_completion_logic()
RETURNS TRIGGER AS $$
DECLARE
  v_agent_rate NUMERIC;
  v_commission_amount NUMERIC;
  v_total_spent NUMERIC;
  v_total_orders INTEGER;
  v_threshold NUMERIC := 500000; -- Example threshold for high_value
BEGIN
  -- 1. Handle Commission & Stats ONLY when status changes to 'delivered'
  IF (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'delivered') THEN
    
    -- Calculate commission if it's the first order and an agent is attached
    IF (NEW.is_first_order AND NEW.agent_id IS NOT NULL) THEN
      SELECT commission_rate INTO v_agent_rate FROM public.agents WHERE id = NEW.agent_id;
      v_commission_amount := NEW.total * (v_agent_rate / 100);
      
      INSERT INTO public.commissions (agent_id, order_id, amount, status)
      VALUES (NEW.agent_id, NEW.id, v_commission_amount, 'pending');
    END IF;

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
  END IF;

  -- 2. Trigger WhatsApp Automation for ANY status change
  -- Except for 'paid' which is handled by the payment gateway redirect logic for now
  -- but we'll send it to the edge function anyway and let the edge function decide if it wants to notify
  IF (OLD.status IS DISTINCT FROM NEW.status) THEN
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
