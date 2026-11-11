-- Migration to configure new project URLs and keys for database triggers and cron jobs
-- Project: prweavmmpmoutdcsrseh

-- 1. Update cron job for sync-catalog
SELECT cron.unschedule('sync-catalog-every-5-minutes');

SELECT cron.schedule(
  'sync-catalog-every-5-minutes',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
      url:='https://prweavmmpmoutdcsrseh.supabase.co/functions/v1/sync-catalog',
      headers:=jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InByd2Vhdm1tcG1vdXRkY3Nyc2VoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQzOTMwNDksImV4cCI6MjEwOTk2OTA0OX0.cc4xHW0WVM_AcRyihG_hT7LPyY-OejbCOrI5cb0MXJ8'
      )
  );
  $$
);

-- 2. Update handle_order_completion_logic with new project URL and key
CREATE OR REPLACE FUNCTION public.handle_order_completion_logic()
RETURNS TRIGGER AS $func$
DECLARE
  v_total_spent NUMERIC;
  v_total_orders INTEGER;
  v_threshold NUMERIC := 500000;
  v_is_paid_transition BOOLEAN;
  v_status_changed BOOLEAN;
  v_supabase_url TEXT := 'https://prweavmmpmoutdcsrseh.supabase.co';
  v_service_role_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InByd2Vhdm1tcG1vdXRkY3Nyc2VoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5NDM5MzA0OSwiZXhwIjoyMTA5OTY5MDQ5fQ.pYAFeC-7Folt3Dn9ZVR0gTWRTuRyQPxBQ1F9PPeXbhc';
BEGIN
  -- 1. Determine if this is a status change
  v_status_changed := (OLD.status IS DISTINCT FROM NEW.status);

  -- 2. Determine if this is the transition into a Paid/Success state
  v_is_paid_transition := (
    (OLD.status IS NULL OR OLD.status NOT IN ('paid', 'processing', 'shipped', 'delivered')) 
    AND NEW.status IN ('paid', 'processing', 'shipped', 'delivered')
  );

  -- 3. Update customer statistics and commissions exactly once
  IF v_is_paid_transition THEN
    UPDATE public.commissions SET status = 'paid' WHERE order_id = NEW.id;

    UPDATE public.customers
    SET 
      total_orders = total_orders + 1,
      total_spent = total_spent + NEW.total,
      updated_at = now()
    WHERE id = NEW.customer_id
    RETURNING total_orders, total_spent INTO v_total_orders, v_total_spent;

    IF v_total_spent > v_threshold THEN
      UPDATE public.customers SET customer_status = 'high_value' WHERE id = NEW.customer_id;
    ELSIF v_total_orders > 1 THEN
      UPDATE public.customers SET customer_status = 'returning' WHERE id = NEW.customer_id;
    END IF;
  END IF;

  -- 4. Trigger WhatsApp notification on EVERY status change
  IF v_status_changed THEN
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
      RAISE WARNING 'WhatsApp notification failed: %', SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$func$ LANGUAGE plpgsql SET search_path = public;

-- 3. Update handle_order_insert_notification with new project URL and key
CREATE OR REPLACE FUNCTION public.handle_order_insert_notification()
RETURNS TRIGGER AS $func$
DECLARE
  v_supabase_url TEXT := 'https://prweavmmpmoutdcsrseh.supabase.co';
  v_service_role_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InByd2Vhdm1tcG1vdXRkY3Nyc2VoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5NDM5MzA0OSwiZXhwIjoyMTA5OTY5MDQ5fQ.pYAFeC-7Folt3Dn9ZVR0gTWRTuRyQPxBQ1F9PPeXbhc';
BEGIN
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
$func$ LANGUAGE plpgsql SET search_path = public;

-- 4. Update handle_payout_update_notification with new project URL and key
CREATE OR REPLACE FUNCTION public.handle_payout_update_notification()
RETURNS TRIGGER AS $func$
DECLARE
  v_supabase_url TEXT := 'https://prweavmmpmoutdcsrseh.supabase.co';
  v_service_role_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InByd2Vhdm1tcG1vdXRkY3Nyc2VoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5NDM5MzA0OSwiZXhwIjoyMTA5OTY5MDQ5fQ.pYAFeC-7Folt3Dn9ZVR0gTWRTuRyQPxBQ1F9PPeXbhc';
BEGIN
  IF (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'paid') THEN
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
      RAISE WARNING 'Payout update notification failed: %', SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$func$ LANGUAGE plpgsql SET search_path = public;
