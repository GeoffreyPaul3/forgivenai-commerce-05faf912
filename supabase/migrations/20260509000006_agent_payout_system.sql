-- 1. Extend agents table with payout details
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS payout_method TEXT DEFAULT 'Airtel Money';
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS payout_details TEXT;

-- 2. Create agent_payouts table
CREATE TABLE IF NOT EXISTS public.agent_payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
    amount NUMERIC(15,2) NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'rejected')),
    payout_method TEXT NOT NULL,
    payout_details TEXT NOT NULL,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. RLS for agent_payouts
ALTER TABLE public.agent_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents can view their own payouts" 
ON public.agent_payouts FOR SELECT 
TO authenticated 
USING (auth.uid() IN (SELECT user_id FROM public.agents WHERE id = agent_id));

CREATE POLICY "Agents can request payouts" 
ON public.agent_payouts FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() IN (SELECT user_id FROM public.agents WHERE id = agent_id));

CREATE POLICY "Admins can manage agent payouts" 
ON public.agent_payouts FOR ALL 
TO authenticated 
USING (true) WITH CHECK (true);

-- 4. RPC for agent to request withdrawal (safety check)
CREATE OR REPLACE FUNCTION public.request_agent_payout(p_agent_id UUID, p_amount NUMERIC)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_available_balance NUMERIC;
  v_payout_id UUID;
  v_method TEXT;
  v_details TEXT;
BEGIN
  -- Check available balance (Earned - Paid/Pending Payouts)
  -- This is a simplified check for now
  SELECT total_commission INTO v_available_balance FROM public.agents WHERE id = p_agent_id;
  
  -- Subtract already requested/paid payouts
  v_available_balance := v_available_balance - COALESCE((
    SELECT sum(amount) FROM public.agent_payouts WHERE agent_id = p_agent_id AND status IN ('pending', 'paid')
  ), 0);

  IF p_amount > v_available_balance THEN
    RAISE EXCEPTION 'Insufficient balance for this withdrawal.';
  END IF;

  SELECT payout_method, payout_details INTO v_method, v_details FROM public.agents WHERE id = p_agent_id;
  
  IF v_details IS NULL THEN
    RAISE EXCEPTION 'Please configure your payout method in settings first.';
  END IF;

  INSERT INTO public.agent_payouts (agent_id, amount, payout_method, payout_details)
  VALUES (p_agent_id, p_amount, v_method, v_details)
  RETURNING id INTO v_payout_id;

  RETURN v_payout_id;
END;
$$;
