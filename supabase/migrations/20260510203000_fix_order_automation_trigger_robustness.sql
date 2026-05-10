-- Fix the regression in handle_order_completion_logic that causes NULL URL errors in pg_net
-- This restores hardcoded fallbacks and wraps the HTTP call in an EXCEPTION block
-- to prevent payment verification from failing if the WhatsApp notification fails.

CREATE OR REPLACE FUNCTION public.handle_order_completion_logic()
RETURNS TRIGGER AS $$
DECLARE
  v_total_spent NUMERIC;
  v_total_orders INTEGER;
  v_threshold NUMERIC := 500000;
  v_is_paid_transition BOOLEAN;
  v_supabase_url TEXT;
  v_service_role_key TEXT;
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
    -- Fetch config with hardcoded fallbacks for reliability
    v_supabase_url := COALESCE(
      current_setting('custom.supabase_url', true),
      'https://wzncegnkhybtmybqftbv.supabase.co'
    );
    
    v_service_role_key := COALESCE(
      current_setting('custom.service_role_key', true),
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6bmNlZ25raHlidG15YnFmdGJ2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjE0OTM3NywiZXhwIjoyMDkxNzI1Mzc3fQ.nm1EK9Q8Yz4Eiq2B6hPpZW0GwWiZ_6U2RdAG8PWyefM'
    );

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
      -- CRITICAL: Allow the transaction to continue even if notification fails
      -- This prevents payment verification from failing if pg_net has issues
      RAISE WARNING 'WhatsApp notification failed: %', SQLERRM;
    END;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;
