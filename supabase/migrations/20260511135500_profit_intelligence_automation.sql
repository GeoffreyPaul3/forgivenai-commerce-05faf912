
-- 1. Update the pending commission trigger to handle full profit intelligence
CREATE OR REPLACE FUNCTION public.create_pending_commission()
RETURNS TRIGGER AS $$
DECLARE
    v_agent_rate NUMERIC;
    v_commission_amount NUMERIC;
    v_max_commission NUMERIC;
    v_base_profit NUMERIC;
BEGIN
    -- Standard Base Profit (30% of order total)
    v_base_profit := NEW.total * 0.30;
    NEW.base_profit := v_base_profit;

    -- Max Commission Buffer (15% of order total)
    v_max_commission := NEW.total * 0.15;

    IF NEW.agent_id IS NOT NULL THEN
        -- AGENT SALE LOGIC
        SELECT COALESCE(commission_rate, 8) INTO v_agent_rate FROM public.agents WHERE id = NEW.agent_id;
        
        v_commission_amount := NEW.total * (v_agent_rate / 100);
        NEW.surplus_profit := v_max_commission - v_commission_amount;
        NEW.surplus_type := 'agent';

        -- Insert into commissions table
        INSERT INTO public.commissions (agent_id, order_id, amount, status)
        VALUES (NEW.agent_id, NEW.id, v_commission_amount, 'pending');
    ELSE
        -- DIRECT SALE LOGIC
        -- If no agent, the full 15% buffer is pure surplus for the business
        NEW.surplus_profit := v_max_commission;
        NEW.surplus_type := 'direct';
    END IF;

    -- Gross Margin = Base Profit (30%) + Surplus (difference in commission buffer)
    NEW.gross_margin := NEW.base_profit + NEW.surplus_profit;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Backfill existing delivered orders with calculated data for the dashboard
UPDATE public.orders
SET 
    base_profit = total * 0.30,
    surplus_profit = CASE 
        WHEN agent_id IS NOT NULL THEN (total * 0.15) - (SELECT COALESCE(amount, total * 0.08) FROM public.commissions WHERE order_id = public.orders.id LIMIT 1)
        ELSE total * 0.15
    END,
    surplus_type = CASE WHEN agent_id IS NOT NULL THEN 'agent' ELSE 'direct' END,
    gross_margin = (total * 0.30) + (
        CASE 
            WHEN agent_id IS NOT NULL THEN (total * 0.15) - (SELECT COALESCE(amount, total * 0.08) FROM public.commissions WHERE order_id = public.orders.id LIMIT 1)
            ELSE total * 0.15
        END
    )
WHERE status = 'delivered';
