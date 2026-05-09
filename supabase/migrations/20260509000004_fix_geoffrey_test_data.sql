-- Fix Geoffrey Paul's data for testing verification
-- 1. Identify Agent 47
DO $$
DECLARE
  v_agent_id UUID;
  v_customer_id UUID;
BEGIN
  SELECT id INTO v_agent_id FROM public.agents WHERE referral_code = 'AGT-CCAB0B' LIMIT 1;
  SELECT id INTO v_customer_id FROM public.customers WHERE phone = '+265992132195' LIMIT 1;

  IF v_agent_id IS NOT NULL AND v_customer_id IS NOT NULL THEN
    -- Link customer to agent
    UPDATE public.customers SET first_agent_id = v_agent_id WHERE id = v_customer_id;
    
    -- Attribute all their recent orders to this agent
    UPDATE public.orders SET agent_id = v_agent_id WHERE customer_id = v_customer_id AND agent_id IS NULL;
    
    -- Sync conversation
    UPDATE public.conversations SET agent_id = v_agent_id WHERE customer_phone = '+265992132195' AND status = 'open';
  END IF;
END $$;
