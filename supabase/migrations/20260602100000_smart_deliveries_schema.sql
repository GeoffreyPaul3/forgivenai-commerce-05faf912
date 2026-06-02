-- ==========================================
-- SMART DELIVERIES INTEGRATION SCHEMA
-- ==========================================

-- 1. Courier Providers Table
CREATE TABLE IF NOT EXISTS public.courier_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    active BOOLEAN DEFAULT true,
    environment TEXT DEFAULT 'sandbox',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert Smart Deliveries
INSERT INTO public.courier_providers (name, code, environment)
VALUES ('Smart Deliveries', 'SMART_DELIVERIES', 'sandbox')
ON CONFLICT (code) DO NOTHING;

-- 2. Delivery Orders Table
CREATE TABLE IF NOT EXISTS public.delivery_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    courier_provider_id UUID REFERENCES public.courier_providers(id),
    smart_delivery_uuid TEXT,
    waybill_number TEXT,
    delivery_type TEXT NOT NULL,
    receiver_name TEXT NOT NULL,
    receiver_phone TEXT NOT NULL,
    receiver_city TEXT NOT NULL,
    receiver_address TEXT,
    payment_method TEXT,
    parcel_status TEXT DEFAULT 'pending',
    delivery_fee DECIMAL(10, 2),
    courier_fee DECIMAL(10, 2),
    courier_response JSONB,
    courier_request JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Delivery Tracking Events Table
CREATE TABLE IF NOT EXISTS public.delivery_tracking_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    delivery_order_id UUID NOT NULL REFERENCES public.delivery_orders(id) ON DELETE CASCADE,
    status_code TEXT NOT NULL,
    status_name TEXT NOT NULL,
    description TEXT,
    event_time TIMESTAMPTZ,
    raw_payload JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Delivery Service Payments Table
CREATE TABLE IF NOT EXISTS public.delivery_service_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    delivery_order_id UUID NOT NULL REFERENCES public.delivery_orders(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    currency TEXT DEFAULT 'MWK',
    status TEXT DEFAULT 'pending',
    transaction_reference TEXT,
    provider_response JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Delivery Audit Logs Table
CREATE TABLE IF NOT EXISTS public.delivery_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    reference_id UUID,
    payload JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Triggers for updated_at
CREATE TRIGGER update_courier_providers_updated_at BEFORE UPDATE ON public.courier_providers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_delivery_orders_updated_at BEFORE UPDATE ON public.delivery_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_delivery_service_payments_updated_at BEFORE UPDATE ON public.delivery_service_payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Update orders status check constraint to include new delivery states
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT conname FROM pg_constraint WHERE conrelid = 'public.orders'::regclass AND contype = 'c' AND pg_get_constraintdef(oid) LIKE '%status%') LOOP
        EXECUTE 'ALTER TABLE public.orders DROP CONSTRAINT ' || r.conname;
    END LOOP;
END$$;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_status_check
  CHECK (status IN (
      'pending','confirmed','paid','processing','shipped','delivered','cancelled',
      'awaiting_delivery_payment',
      'delivery_payment_processing',
      'delivery_payment_complete',
      'delivery_payment_failed',
      'parcel_created',
      'in_transit',
      'returned'
  ));

-- RLS Policies
ALTER TABLE public.courier_providers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can view courier_providers" ON public.courier_providers FOR SELECT USING (true);
CREATE POLICY "Admin can manage courier_providers" ON public.courier_providers FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.delivery_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view delivery_orders" ON public.delivery_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage delivery_orders" ON public.delivery_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.delivery_tracking_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view delivery_tracking_events" ON public.delivery_tracking_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage delivery_tracking_events" ON public.delivery_tracking_events FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.delivery_service_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view delivery_service_payments" ON public.delivery_service_payments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage delivery_service_payments" ON public.delivery_service_payments FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.delivery_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view delivery_audit_logs" ON public.delivery_audit_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage delivery_audit_logs" ON public.delivery_audit_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);
