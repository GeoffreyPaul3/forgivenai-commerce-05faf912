
-- Update handle_order_completion_logic with robust error handling
CREATE OR REPLACE FUNCTION public.handle_order_completion_logic()
RETURNS TRIGGER AS $$
DECLARE
  v_agent_rate NUMERIC;
  v_commission_amount NUMERIC;
  v_total_spent NUMERIC;
  v_total_orders INTEGER;
  v_threshold NUMERIC := 500000;
  v_supabase_url TEXT;
  v_service_role_key TEXT;
BEGIN
  -- 1. Handle Commission & Stats ONLY when status changes to 'delivered'
  IF (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'delivered') THEN
    BEGIN
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
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Commission/Stats update failed: %', SQLERRM;
    END;
  END IF;

  -- 2. Trigger WhatsApp Automation for ANY status change
  IF (OLD.status IS DISTINCT FROM NEW.status) THEN
    -- Fetch config with fallbacks
    v_supabase_url := COALESCE(
      current_setting('custom.supabase_url', true),
      'https://wzncegnkhybtmybqftbv.supabase.co'
    );
    
    v_service_role_key := current_setting('custom.service_role_key', true);

    -- Only attempt if we have a service role key, or at least try and catch the failure
    IF v_service_role_key IS NOT NULL THEN
      BEGIN
        PERFORM
          net.http_post(
            url := v_supabase_url || '/functions/v1/order-automation',
            headers := jsonb_build_object(
              'Content-Type', 'application/json',
              'Authorization', 'Bearer ' || v_service_role_key
            ),
            body := jsonb_build_object(
              'type', 'UPDATE',
              'record', row_to_json(NEW),
              'old_record', row_to_json(OLD)
            )
          );
      EXCEPTION WHEN OTHERS THEN
        -- Allow the transaction to continue even if notification fails
        RAISE WARNING 'WhatsApp notification failed: %', SQLERRM;
      END;
    ELSE
       RAISE WARNING 'WhatsApp notification skipped: custom.service_role_key is not set';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;
