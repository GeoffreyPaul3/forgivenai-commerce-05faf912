
-- ============ CUSTOMERS ============
CREATE TABLE public.customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT,
  phone TEXT UNIQUE NOT NULL,
  email TEXT,
  location TEXT,
  first_agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  customer_status TEXT DEFAULT 'new' CHECK (customer_status IN ('new', 'returning', 'high_value')),
  total_orders INTEGER NOT NULL DEFAULT 0,
  total_spent NUMERIC(15,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS for Customers
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can manage customers" ON public.customers FOR ALL TO public USING (true) WITH CHECK (true);

-- Updated_at trigger for customers
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ COMMISSIONS ============
CREATE TABLE public.commissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  amount NUMERIC(15,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS for Commissions
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can manage commissions" ON public.commissions FOR ALL TO public USING (true) WITH CHECK (true);

-- ============ EXTEND ORDERS ============
ALTER TABLE public.orders ADD COLUMN customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL;
ALTER TABLE public.orders ADD COLUMN is_first_order BOOLEAN NOT NULL DEFAULT false;

-- ============ LOGIC TRIGGERS ============

-- Function to handle customer logic on order creation
CREATE OR REPLACE FUNCTION public.handle_order_customer_logic()
RETURNS TRIGGER AS $$
DECLARE
  v_customer_id UUID;
  v_first_order BOOLEAN := false;
BEGIN
  -- 1. Find or create customer
  SELECT id INTO v_customer_id FROM public.customers WHERE phone = NEW.customer_phone;
  
  IF v_customer_id IS NULL THEN
    INSERT INTO public.customers (name, phone, email, first_agent_id)
    VALUES (NEW.customer_name, NEW.customer_phone, NEW.customer_email, NEW.agent_id)
    RETURNING id INTO v_customer_id;
    v_first_order := true;
  ELSE
    -- Check if it's the first order for existing customer (though usually they should have total_orders > 0)
    IF NOT EXISTS (SELECT 1 FROM public.orders WHERE customer_id = v_customer_id AND status != 'cancelled') THEN
      v_first_order := true;
    END IF;
  END IF;

  -- 2. Update order with customer link and first-touch status
  NEW.customer_id := v_customer_id;
  NEW.is_first_order := v_first_order;

  -- 3. If it's NOT the first order, disconnect the agent (platform owns the customer now)
  IF NOT v_first_order THEN
    NEW.agent_id := NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trigger_handle_order_customer_logic
BEFORE INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.handle_order_customer_logic();

-- Function to handle commission and stats on order status change
CREATE OR REPLACE FUNCTION public.handle_order_completion_logic()
RETURNS TRIGGER AS $$
DECLARE
  v_agent_rate NUMERIC;
  v_commission_amount NUMERIC;
  v_total_spent NUMERIC;
  v_total_orders INTEGER;
  v_threshold NUMERIC := 500000; -- Example threshold for high_value
BEGIN
  -- Only act when status changes to 'delivered'
  IF (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'delivered') THEN
    
    -- 1. Calculate commission if it's the first order and an agent is attached
    IF (NEW.is_first_order AND NEW.agent_id IS NOT NULL) THEN
      SELECT commission_rate INTO v_agent_rate FROM public.agents WHERE id = NEW.agent_id;
      v_commission_amount := NEW.total * (v_agent_rate / 100);
      
      INSERT INTO public.commissions (agent_id, order_id, amount, status)
      VALUES (NEW.agent_id, NEW.id, v_commission_amount, 'pending');
    END IF;

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
    -- We use a simple HTTP POST to the order-automation function
    -- Note: This requires the pg_net extension to be enabled in Supabase
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

CREATE TRIGGER trigger_handle_order_completion_logic
AFTER UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.handle_order_completion_logic();
