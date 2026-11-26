-- Migration: Comprehensive ERP Product & Inventory Sync Triggers + Shipped Order State
-- Fixes gap where INSERTs on public.products and non-stock product UPDATEs never fired to ERP,
-- includes metadata.sku / vendor_cost / category / status in payload,
-- and maps 'shipped' / 'in_transit' / 'returned' order states properly.

-- 1. Comprehensive Product & Inventory Event Trigger Function
CREATE OR REPLACE FUNCTION public.notify_erp_on_product_event()
RETURNS TRIGGER AS $func$
DECLARE
  v_supabase_url TEXT := 'https://prweavmmpmoutdcsrseh.supabase.co';
  v_service_role_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InByd2Vhdm1tcG1vdXRkY3Nyc2VoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5NDM5MzA0OSwiZXhwIjoyMTA5OTY5MDQ5fQ.pYAFeC-7Folt3Dn9ZVR0gTWRTuRyQPxBQ1F9PPeXbhc';
  v_event_type TEXT;
  v_entity_type TEXT;
  v_catalog_changed BOOLEAN := FALSE;
  v_stock_changed BOOLEAN := FALSE;
  v_sku TEXT;
  v_payload JSONB;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_event_type := 'commerce.product.created';
    v_entity_type := 'product';
  ELSIF TG_OP = 'UPDATE' THEN
    v_catalog_changed := (
      OLD.name IS DISTINCT FROM NEW.name OR
      OLD.description IS DISTINCT FROM NEW.description OR
      OLD.category IS DISTINCT FROM NEW.category OR
      OLD.subcategory IS DISTINCT FROM NEW.subcategory OR
      OLD.price IS DISTINCT FROM NEW.price OR
      OLD.vendor_cost IS DISTINCT FROM NEW.vendor_cost OR
      OLD.landed_cost IS DISTINCT FROM NEW.landed_cost OR
      OLD.status IS DISTINCT FROM NEW.status OR
      OLD.metadata IS DISTINCT FROM NEW.metadata OR
      OLD.inventory_mode IS DISTINCT FROM NEW.inventory_mode
    );
    v_stock_changed := (
      OLD.stock_quantity IS DISTINCT FROM NEW.stock_quantity OR
      OLD.stock_status IS DISTINCT FROM NEW.stock_status
    );

    -- Skip no-op updates (e.g. updated_at only)
    IF NOT v_catalog_changed AND NOT v_stock_changed THEN
      RETURN NEW;
    END IF;

    IF v_catalog_changed THEN
      v_event_type := 'commerce.product.updated';
      v_entity_type := 'product';
    ELSE
      v_event_type := 'commerce.inventory.updated';
      v_entity_type := 'inventory';
    END IF;
  ELSE
    RETURN NEW;
  END IF;

  v_sku := NULLIF(TRIM(COALESCE(NEW.metadata->>'sku', NEW.metadata->>'vendor_sku', '')), '');

  v_payload := jsonb_strip_nulls(jsonb_build_object(
    'entity_type', v_entity_type,
    'entity_id', NEW.id,
    'product_id', NEW.id,
    'sku', v_sku,
    'name', NEW.name,
    'description', NEW.description,
    'category', NEW.category,
    'subcategory', NEW.subcategory,
    'price', NEW.price,
    'selling_price', NEW.price,
    'vendor_cost', NEW.vendor_cost,
    'cost_price', COALESCE(NEW.vendor_cost, NEW.landed_cost, 0),
    'currency', NEW.currency,
    'stock_quantity', NEW.stock_quantity,
    'previous_stock_quantity', CASE WHEN TG_OP = 'UPDATE' THEN OLD.stock_quantity ELSE NULL END,
    'delta', CASE
      WHEN TG_OP = 'UPDATE' AND NEW.stock_quantity IS NOT NULL AND OLD.stock_quantity IS NOT NULL
      THEN (NEW.stock_quantity - OLD.stock_quantity)
      ELSE NEW.stock_quantity
    END,
    'stock_status', NEW.stock_status,
    'inventory_mode', NEW.inventory_mode,
    'status', NEW.status,
    'is_active', (NEW.status IS DISTINCT FROM 'archived' AND NEW.status IS DISTINCT FROM 'draft'),
    'metadata', COALESCE(NEW.metadata, '{}'::jsonb),
    'vendor_id', NEW.vendor_id,
    'created_at', NEW.created_at,
    'updated_at', NEW.updated_at
  ));

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
          'type', TG_OP,
          'table', 'products',
          'payload', v_payload
        )
      );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'ERP Product notification dispatch failed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Replace stock-only trigger with full INSERT + UPDATE product sync trigger
DROP TRIGGER IF EXISTS trigger_erp_inventory_sync ON public.products;
DROP TRIGGER IF EXISTS trigger_erp_product_sync ON public.products;
CREATE TRIGGER trigger_erp_product_sync
AFTER INSERT OR UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.notify_erp_on_product_event();


-- 2. Upgrade Order Trigger Function to map 'shipped' / 'in_transit' / 'returned' explicitly
CREATE OR REPLACE FUNCTION public.notify_erp_on_order_event()
RETURNS TRIGGER AS $func$
DECLARE
  v_supabase_url TEXT := 'https://prweavmmpmoutdcsrseh.supabase.co';
  v_service_role_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InByd2Vhdm1tcG1vdXRkY3Nyc2VoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5NDM5MzA0OSwiZXhwIjoyMTA5OTY5MDQ5fQ.pYAFeC-7Folt3Dn9ZVR0gTWRTuRyQPxBQ1F9PPeXbhc';
  v_event_type TEXT;
  v_payload JSONB;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_event_type := 'commerce.order.created';
  ELSIF TG_OP = 'UPDATE' THEN
    IF (OLD.status IS DISTINCT FROM NEW.status) THEN
      IF NEW.status = 'paid' THEN
        v_event_type := 'commerce.order.paid';
      ELSIF NEW.status = 'confirmed' THEN
        v_event_type := 'commerce.order.confirmed';
      ELSIF NEW.status IN ('shipped', 'in_transit', 'parcel_created') THEN
        v_event_type := 'commerce.order.shipped';
      ELSIF NEW.status = 'delivered' THEN
        v_event_type := 'commerce.order.delivered';
      ELSIF NEW.status IN ('cancelled', 'rejected') THEN
        v_event_type := 'commerce.order.cancelled';
      ELSIF NEW.status IN ('refunded', 'returned') THEN
        v_event_type := 'commerce.order.refunded';
      ELSE
        v_event_type := 'commerce.order.updated';
      END IF;
    ELSE
      RETURN NEW;
    END IF;
  ELSE
    RETURN NEW;
  END IF;

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
