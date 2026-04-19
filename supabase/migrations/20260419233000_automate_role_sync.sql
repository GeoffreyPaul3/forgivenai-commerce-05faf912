-- Migration: Automate Role Sync
-- Description: Automatically populates the agents and vendors tables when a profile is approved.

CREATE OR REPLACE FUNCTION public.handle_profile_approval()
RETURNS TRIGGER AS $$
BEGIN
  -- Trigger this only when status officially turns 'approved'
  IF (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'approved') THEN
  
     IF NEW.role = 'vendor' THEN
        -- Prevent duplicates
        IF NOT EXISTS (SELECT 1 FROM public.vendors WHERE user_id = NEW.id) THEN
            INSERT INTO public.vendors (user_id, business_name, phone)
            VALUES (
                NEW.id, 
                COALESCE(NEW.full_name, 'New Vendor') || '''s Store', 
                'Pending Setup'
            );
        END IF;

     ELSIF NEW.role = 'agent' THEN
        IF NOT EXISTS (SELECT 1 FROM public.agents WHERE user_id = NEW.id) THEN
            INSERT INTO public.agents (user_id, name, email, referral_code)
            VALUES (
                NEW.id, 
                COALESCE(NEW.full_name, 'New Agent'), 
                NEW.email,
                'AGT-' || UPPER(SUBSTRING(REPLACE(NEW.id::text, '-', ''), 1, 6))
            )
            ON CONFLICT (referral_code) DO NOTHING;
        END IF;
     END IF;
     
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger config
DROP TRIGGER IF EXISTS trigger_approve_profile ON public.profiles;
CREATE TRIGGER trigger_approve_profile
AFTER UPDATE OF status ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.handle_profile_approval();
