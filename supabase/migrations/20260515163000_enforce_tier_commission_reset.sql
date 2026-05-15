-- Migration: Enforce tier-based commission system and reset all agents to Tier 1 (8%)
-- Date: 2026-05-15

-- 1. Ensure the tier update function reflects the correct tiers
CREATE OR REPLACE FUNCTION public.update_agent_tier(p_agent_id UUID)
RETURNS VOID AS $$
DECLARE
    v_sales NUMERIC;
    v_new_rate NUMERIC;
BEGIN
    v_sales := public.get_monthly_delivered_sales(p_agent_id);
    
    -- Tier Logic:
    -- 0–200,000       = 8%
    -- 200,000–500,000 = 10%
    -- 500,000–1,000,000 = 12%
    -- 1,000,000+      = 15%
    IF v_sales >= 1000000 THEN
        v_new_rate := 15;
    ELSIF v_sales >= 500000 THEN
        v_new_rate := 12;
    ELSIF v_sales >= 200000 THEN
        v_new_rate := 10;
    ELSE
        v_new_rate := 8;
    END IF;
    
    UPDATE public.agents
    SET commission_rate = v_new_rate
    WHERE id = p_agent_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Ensure the pending commission trigger defaults to 8% (not 10%)
CREATE OR REPLACE FUNCTION public.create_pending_commission()
RETURNS TRIGGER AS $$
DECLARE
    v_agent_rate NUMERIC;
    v_commission_amount NUMERIC;
    v_max_commission NUMERIC;
BEGIN
    IF NEW.agent_id IS NOT NULL AND (NEW.is_first_order = TRUE OR EXISTS (SELECT 1 FROM public.agents WHERE id = NEW.agent_id)) THEN
        -- Get current agent rate
        SELECT commission_rate INTO v_agent_rate FROM public.agents WHERE id = NEW.agent_id;
        
        -- Default to 8% (Tier 1) if not set
        IF v_agent_rate IS NULL THEN
            v_agent_rate := 8;
        END IF;

        -- Actual commission based on tier rate
        v_commission_amount := NEW.total * (v_agent_rate / 100);
        
        -- Max possible commission (15% cap)
        v_max_commission := NEW.total * 0.15;

        -- Insert commission record
        INSERT INTO public.commissions (agent_id, order_id, amount, status)
        VALUES (NEW.agent_id, NEW.id, v_commission_amount, 'pending');
        
        -- Track surplus profit (difference between agent rate and max rate)
        NEW.surplus_profit := v_max_commission - v_commission_amount;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Reset ALL existing agents to Tier 1 (8%) since all agents joined recently
UPDATE public.agents SET commission_rate = 8;

-- 4. Verify the reset (informational)
DO $$
DECLARE
    agent_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO agent_count FROM public.agents WHERE commission_rate = 8;
    RAISE NOTICE 'Successfully reset % agent(s) to Tier 1 (8%% commission rate)', agent_count;
END;
$$;
