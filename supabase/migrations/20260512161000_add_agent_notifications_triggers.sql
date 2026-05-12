-- Migration to add order insert and payout update triggers for agent notifications

-- 1. Function to handle order insert notifications (for vendors and agents)
CREATE OR REPLACE FUNCTION public.handle_order_insert_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_supabase_url TEXT;
  v_service_role_key TEXT;
BEGIN
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
          'type', 'INSERT',
          'record', row_to_json(NEW)
        )
      );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Order insert notification failed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger on order insert
DROP TRIGGER IF EXISTS trigger_order_automation_insert ON public.orders;
CREATE TRIGGER trigger_order_automation_insert
AFTER INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.handle_order_insert_notification();

-- 2. Function to handle agent payout notifications
CREATE OR REPLACE FUNCTION public.handle_payout_update_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_supabase_url TEXT;
  v_service_role_key TEXT;
BEGIN
  -- Only trigger on status change to 'paid'
  IF (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'paid') THEN
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
            'type', 'PAYOUT_UPDATE',
            'record', row_to_json(NEW),
            'old_record', row_to_json(OLD)
          )
        );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Payout notification failed: %', SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger on payout update
DROP TRIGGER IF EXISTS trigger_payout_notification ON public.agent_payouts;
CREATE TRIGGER trigger_payout_notification
AFTER UPDATE ON public.agent_payouts
FOR EACH ROW EXECUTE FUNCTION public.handle_payout_update_notification();
