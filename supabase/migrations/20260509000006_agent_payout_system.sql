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
-- Agent Payout System Implementation

-- 1. Add payment_details to agents table
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS payment_details TEXT;

-- 2. Create agent_payouts table
CREATE TABLE IF NOT EXISTS public.agent_payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
    amount NUMERIC(15,2) NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'rejected')),
    notes TEXT,
    period_start TIMESTAMPTZ,
    period_end TIMESTAMPTZ,
    rejected_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Enable RLS on agent_payouts
ALTER TABLE public.agent_payouts ENABLE ROW LEVEL SECURITY;

-- Agents can view their own payouts
CREATE POLICY "Agents can view their own payouts" ON public.agent_payouts
    FOR SELECT TO authenticated
    USING (auth.uid() IN (SELECT user_id FROM public.agents WHERE id = agent_id));

-- Agents can insert their own payout requests (withdrawals)
CREATE POLICY "Agents can request withdrawals" ON public.agent_payouts
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() IN (SELECT user_id FROM public.agents WHERE id = agent_id));

-- Admins can manage all agent payouts
CREATE POLICY "Admins can manage all agent payouts" ON public.agent_payouts
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

-- 4. Trigger to update updated_at
CREATE TRIGGER update_agent_payouts_updated_at BEFORE UPDATE ON public.agent_payouts
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 5. Helper function to calculate agent balance (available for withdrawal)
CREATE OR REPLACE FUNCTION public.get_agent_balance(p_agent_id UUID)
RETURNS NUMERIC AS $$
DECLARE
    v_total_earned NUMERIC;
    v_total_payouts NUMERIC;
BEGIN
    -- Total from commissions table (only first orders)
    SELECT COALESCE(SUM(amount), 0) INTO v_total_earned
    FROM public.commissions
    WHERE agent_id = p_agent_id;

    -- Total from agent_payouts (paid or pending)
    SELECT COALESCE(SUM(amount), 0) INTO v_total_payouts
    FROM public.agent_payouts
    WHERE agent_id = p_agent_id AND status != 'rejected';

    RETURN GREATEST(0, v_total_earned - v_total_payouts);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
