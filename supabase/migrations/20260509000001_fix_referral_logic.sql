-- Migration to fix referral attribution for existing customers
-- 1. Update handle_order_customer_logic to preserve agent_id and capture first_agent_id for existing customers
CREATE OR REPLACE FUNCTION public.handle_order_customer_logic()
RETURNS TRIGGER AS $$
DECLARE
  v_customer_id UUID;
  v_first_order BOOLEAN := false;
  v_existing_agent_id UUID;
BEGIN
  -- 1. Find or create customer
  SELECT id, first_agent_id INTO v_customer_id, v_existing_agent_id 
  FROM public.customers 
  WHERE phone = NEW.customer_phone;
  
  IF v_customer_id IS NULL THEN
    -- Brand new customer
    INSERT INTO public.customers (name, phone, email, first_agent_id)
    VALUES (NEW.customer_name, NEW.customer_phone, NEW.customer_email, NEW.agent_id)
    RETURNING id INTO v_customer_id;
    v_first_order := true;
  ELSE
    -- Existing customer
    -- If they don't have a first_agent_id yet, assign this one
    IF v_existing_agent_id IS NULL AND NEW.agent_id IS NOT NULL THEN
      UPDATE public.customers SET first_agent_id = NEW.agent_id WHERE id = v_customer_id;
    END IF;

    -- Check if it's the first SUCCESSFUL order for this customer
    IF NOT EXISTS (
      SELECT 1 FROM public.orders 
      WHERE customer_id = v_customer_id 
      AND status NOT IN ('cancelled', 'pending')
    ) THEN
      v_first_order := true;
    END IF;
  END IF;

  -- 2. Update order with customer link and first-touch status
  NEW.customer_id := v_customer_id;
  NEW.is_first_order := v_first_order;

  -- 3. REMOVED: NEW.agent_id := NULL logic. 
  -- We preserve the agent_id on the order for tracking, 
  -- but commission trigger only fires if is_first_order is TRUE.

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Re-create trigger just in case
DROP TRIGGER IF EXISTS trigger_handle_order_customer_logic ON public.orders;
CREATE TRIGGER trigger_handle_order_customer_logic
BEFORE INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.handle_order_customer_logic();
