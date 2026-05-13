-- Migration to auto-approve agents on signup

-- 1. Update handle_new_user to set agent status to 'approved' by default
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_role public.user_role;
  v_status public.user_status;
BEGIN
  v_role := (new.raw_user_meta_data->>'role')::public.user_role;
  
  -- Auto-approve agents, everyone else starts as pending
  IF v_role = 'agent' THEN
    v_status := 'approved';
  ELSE
    v_status := COALESCE((new.raw_user_meta_data->>'status')::public.user_status, 'pending');
  END IF;

  INSERT INTO public.profiles (id, full_name, email, avatar_url, role, status, phone, business_name)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.email,
    new.raw_user_meta_data->>'avatar_url',
    v_role,
    v_status,
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'business_name'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Update handle_profile_approval to handle immediate insertion of approved profiles
CREATE OR REPLACE FUNCTION public.handle_profile_approval()
RETURNS TRIGGER AS $$
BEGIN
  -- Trigger if status is 'approved' (either new record or status change)
  IF (NEW.status = 'approved') AND (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status)) THEN
  
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

-- 3. Update trigger to fire on INSERT as well
DROP TRIGGER IF EXISTS trigger_approve_profile ON public.profiles;
CREATE TRIGGER trigger_approve_profile
AFTER INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.handle_profile_approval();
