
-- 1. Function to calculate monthly delivered sales for an agent
CREATE OR REPLACE FUNCTION public.get_monthly_delivered_sales(p_agent_id UUID)
RETURNS NUMERIC AS $$
BEGIN
    RETURN (
        SELECT COALESCE(SUM(total), 0)
        FROM public.orders
        WHERE agent_id = p_agent_id
          AND status = 'delivered'
          AND created_at >= date_trunc('month', now())
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Function to determine and update agent tier based on monthly sales
CREATE OR REPLACE FUNCTION public.update_agent_tier(p_agent_id UUID)
RETURNS VOID AS $$
DECLARE
    v_sales NUMERIC;
    v_new_rate NUMERIC;
BEGIN
    v_sales := public.get_monthly_delivered_sales(p_agent_id);
    
    -- Tiers Logic:
    -- 0-200,000 = 8%
    -- 200,000-500,000 = 10%
    -- 500,000-1,000,000 = 12%
    -- 1,000,000+ = 15%
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

-- 3. Update pending commission trigger to include surplus calculation
CREATE OR REPLACE FUNCTION public.create_pending_commission()
RETURNS TRIGGER AS $$
DECLARE
    v_agent_rate NUMERIC;
    v_commission_amount NUMERIC;
    v_max_commission NUMERIC;
BEGIN
    IF NEW.agent_id IS NOT NULL AND (NEW.is_first_order = TRUE OR EXISTS (SELECT 1 FROM public.agents WHERE id = NEW.agent_id)) THEN
        -- Get current rate
        SELECT commission_rate INTO v_agent_rate FROM public.agents WHERE id = NEW.agent_id;
        
        -- Default to 8% if not set
        IF v_agent_rate IS NULL THEN
            v_agent_rate := 8;
        END IF;

        -- Actual commission
        v_commission_amount := NEW.total * (v_agent_rate / 100);
        
        -- Max commission (15%)
        v_max_commission := NEW.total * 0.15;

        -- Insert commission
        INSERT INTO public.commissions (agent_id, order_id, amount, status)
        VALUES (NEW.agent_id, NEW.id, v_commission_amount, 'pending');
        
        -- Set surplus on order
        NEW.surplus_profit := v_max_commission - v_commission_amount;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Trigger to recalculate tier when an order is delivered
CREATE OR REPLACE FUNCTION public.handle_order_delivery_tiers()
RETURNS TRIGGER AS $$
BEGIN
    -- If order status changed to delivered
    IF (OLD.status IS NULL OR OLD.status <> 'delivered') AND NEW.status = 'delivered' AND NEW.agent_id IS NOT NULL THEN
        -- Update agent tier
        PERFORM public.update_agent_tier(NEW.agent_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_handle_order_delivery_tiers ON public.orders;
CREATE TRIGGER trigger_handle_order_delivery_tiers
AFTER UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.handle_order_delivery_tiers();

-- 5. Force reset all agents to Tier 1 (8%) as requested
UPDATE public.agents SET commission_rate = 8;
