-- Trigger to update agent total_sales and total_commission automatically
CREATE OR REPLACE FUNCTION public.update_agent_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    -- If it's an order update
    IF (TG_TABLE_NAME = 'orders') THEN
      IF (NEW.agent_id IS NOT NULL AND NEW.status IN ('paid', 'processing', 'shipped', 'delivered')) THEN
        UPDATE public.agents
        SET total_sales = (
          SELECT COALESCE(sum(total), 0) FROM public.orders 
          WHERE agent_id = NEW.agent_id AND status IN ('paid', 'processing', 'shipped', 'delivered')
        )
        WHERE id = NEW.agent_id;
      END IF;
    END IF;

    -- If it's a commission update
    IF (TG_TABLE_NAME = 'commissions') THEN
      IF (NEW.status = 'paid') THEN
        UPDATE public.agents
        SET total_commission = (
          SELECT COALESCE(sum(amount), 0) FROM public.commissions 
          WHERE agent_id = NEW.agent_id AND status = 'paid'
        )
        WHERE id = NEW.agent_id;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for orders
DROP TRIGGER IF EXISTS trigger_update_agent_sales ON public.orders;
CREATE TRIGGER trigger_update_agent_sales
AFTER INSERT OR UPDATE OF status, agent_id ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.update_agent_stats();

-- Triggers for commissions
DROP TRIGGER IF EXISTS trigger_update_agent_commissions ON public.commissions;
CREATE TRIGGER trigger_update_agent_commissions
AFTER INSERT OR UPDATE OF status ON public.commissions
FOR EACH ROW EXECUTE FUNCTION public.update_agent_stats();

-- Sync existing stats
UPDATE public.agents a
SET 
  total_sales = (SELECT COALESCE(sum(total), 0) FROM public.orders WHERE agent_id = a.id AND status IN ('paid', 'processing', 'shipped', 'delivered')),
  total_commission = (SELECT COALESCE(sum(amount), 0) FROM public.commissions WHERE agent_id = a.id AND status = 'paid');
