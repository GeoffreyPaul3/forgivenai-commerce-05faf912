-- Migration: Bi-Directional Enterprise ERP Integration Bridge for Forgiven Enterprise ERP
-- Creates erp_sync_logs audit ledger and event triggers for commerce lifecycle events

-- 1. Create public.erp_sync_logs table
CREATE TABLE IF NOT EXISTS public.erp_sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'delivered', 'failed', 'received', 'processed')),
    http_status INTEGER,
    response_body TEXT,
    attempts INTEGER DEFAULT 1,
    direction TEXT NOT NULL DEFAULT 'outbound' CHECK (direction IN ('outbound', 'inbound')),
    latency_ms INTEGER,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Unique index on event_id for deduplication and lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_erp_sync_logs_event_id ON public.erp_sync_logs (event_id);
CREATE INDEX IF NOT EXISTS idx_erp_sync_logs_created_at ON public.erp_sync_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_erp_sync_logs_status ON public.erp_sync_logs (status);
CREATE INDEX IF NOT EXISTS idx_erp_sync_logs_direction ON public.erp_sync_logs (direction);

-- Enable RLS on erp_sync_logs
ALTER TABLE public.erp_sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service_role full access to erp_sync_logs"
ON public.erp_sync_logs FOR ALL TO service_role
USING (true) WITH CHECK (true);

CREATE POLICY "Allow admins read access to erp_sync_logs"
ON public.erp_sync_logs FOR SELECT TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 2. Trigger Function for Order Events
CREATE OR REPLACE FUNCTION public.notify_erp_on_order_event()
RETURNS TRIGGER AS $func$
DECLARE
  v_supabase_url TEXT := 'https://prweavmmpmoutdcsrseh.supabase.co';
  v_service_role_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InByd2Vhdm1tcG1vdXRkY3Nyc2VoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5NDM5MzA0OSwiZXhwIjoyMTA5OTY5MDQ5fQ.pYAFeC-7Folt3Dn9ZVR0gTWRTuRyQPxBQ1F9PPeXbhc';
  v_event_type TEXT;
  v_payload JSONB;
BEGIN
  -- Determine event type based on action and status transition
  IF TG_OP = 'INSERT' THEN
    v_event_type := 'commerce.order.created';
  ELSIF TG_OP = 'UPDATE' THEN
    IF (OLD.status IS DISTINCT FROM NEW.status) THEN
      IF NEW.status = 'paid' THEN
        v_event_type := 'commerce.order.paid';
      ELSIF NEW.status = 'confirmed' THEN
        v_event_type := 'commerce.order.confirmed';
      ELSIF NEW.status IN ('cancelled', 'rejected') THEN
        v_event_type := 'commerce.order.cancelled';
      ELSIF NEW.status = 'refunded' THEN
        v_event_type := 'commerce.order.refunded';
      ELSIF NEW.status = 'delivered' THEN
        v_event_type := 'commerce.order.delivered';
      ELSE
        v_event_type := 'commerce.order.updated';
      END IF;
    ELSE
      -- No status change; do not fire redundant ERP sync
      RETURN NEW;
    END IF;
  ELSE
    RETURN NEW;
  END IF;

  -- Build canonical order payload
  v_payload := jsonb_build_object(
    'entity_type', 'order',
    'entity_id', NEW.id,
    'order_id', NEW.id,
    'status', NEW.status,
    'previous_status', CASE WHEN TG_OP = 'UPDATE' THEN OLD.status ELSE NULL END,
    'total', NEW.total,
    'currency', NEW.currency,
    'customer_id', NEW.customer_id,
    'customer_name', NEW.customer_name,
    'customer_phone', NEW.customer_phone,
    'customer_email', NEW.customer_email,
    'payment_reference', NEW.payment_reference,
    'payment_provider', NEW.payment_provider,
    'channel', NEW.channel,
    'agent_id', NEW.agent_id,
    'items', NEW.items,
    'created_at', NEW.created_at,
    'updated_at', NEW.updated_at
  );

  -- Asynchronously dispatch via pg_net to erp-sync-webhook
  BEGIN
    PERFORM
      net.http_post(
        url := v_supabase_url || '/functions/v1/erp-sync-webhook',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || v_service_role_key
        ),
        body := jsonb_build_object(
          'eventType', v_event_type,
          'payload', v_payload
        )
      );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'ERP Order notification dispatch failed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_erp_order_sync ON public.orders;
CREATE TRIGGER trigger_erp_order_sync
AFTER INSERT OR UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.notify_erp_on_order_event();


-- 3. Trigger Function for Customer Registrations
CREATE OR REPLACE FUNCTION public.notify_erp_on_customer_event()
RETURNS TRIGGER AS $func$
DECLARE
  v_supabase_url TEXT := 'https://prweavmmpmoutdcsrseh.supabase.co';
  v_service_role_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InByd2Vhdm1tcG1vdXRkY3Nyc2VoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5NDM5MzA0OSwiZXhwIjoyMTA5OTY5MDQ5fQ.pYAFeC-7Folt3Dn9ZVR0gTWRTuRyQPxBQ1F9PPeXbhc';
  v_payload JSONB;
BEGIN
  v_payload := jsonb_build_object(
    'entity_type', 'customer',
    'entity_id', NEW.id,
    'customer_id', NEW.id,
    'name', NEW.name,
    'phone', NEW.phone,
    'email', NEW.email,
    'location', NEW.location,
    'first_agent_id', NEW.first_agent_id,
    'customer_status', NEW.customer_status,
    'created_at', NEW.created_at
  );

  BEGIN
    PERFORM
      net.http_post(
        url := v_supabase_url || '/functions/v1/erp-sync-webhook',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || v_service_role_key
        ),
        body := jsonb_build_object(
          'eventType', 'commerce.customer.created',
          'payload', v_payload
        )
      );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'ERP Customer registration notification dispatch failed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_erp_customer_sync ON public.customers;
CREATE TRIGGER trigger_erp_customer_sync
AFTER INSERT ON public.customers
FOR EACH ROW EXECUTE FUNCTION public.notify_erp_on_customer_event();


-- 4. Trigger Function for Inventory/Stock Updates
CREATE OR REPLACE FUNCTION public.notify_erp_on_inventory_event()
RETURNS TRIGGER AS $func$
DECLARE
  v_supabase_url TEXT := 'https://prweavmmpmoutdcsrseh.supabase.co';
  v_service_role_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InByd2Vhdm1tcG1vdXRkY3Nyc2VoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5NDM5MzA0OSwiZXhwIjoyMTA5OTY5MDQ5fQ.pYAFeC-7Folt3Dn9ZVR0gTWRTuRyQPxBQ1F9PPeXbhc';
  v_payload JSONB;
BEGIN
  IF (OLD.stock_quantity IS DISTINCT FROM NEW.stock_quantity) THEN
    v_payload := jsonb_build_object(
      'entity_type', 'inventory',
      'entity_id', NEW.id,
      'product_id', NEW.id,
      'name', NEW.name,
      'stock_quantity', NEW.stock_quantity,
      'previous_stock_quantity', OLD.stock_quantity,
      'delta', (NEW.stock_quantity - OLD.stock_quantity),
      'stock_status', NEW.stock_status,
      'price', NEW.price,
      'updated_at', NEW.updated_at
    );

    BEGIN
      PERFORM
        net.http_post(
          url := v_supabase_url || '/functions/v1/erp-sync-webhook',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || v_service_role_key
          ),
          body := jsonb_build_object(
            'eventType', 'commerce.inventory.updated',
            'payload', v_payload
          )
        );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'ERP Inventory notification dispatch failed: %', SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_erp_inventory_sync ON public.products;
CREATE TRIGGER trigger_erp_inventory_sync
AFTER UPDATE OF stock_quantity ON public.products
FOR EACH ROW EXECUTE FUNCTION public.notify_erp_on_inventory_event();

