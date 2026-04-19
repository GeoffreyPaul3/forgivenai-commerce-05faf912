-- Migration: Capture additional auth fields
-- Description: Updates profiles to temporarily hold business_name and phone during the pending phase, and syncs them directly to vendors/agents when approved.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS business_name TEXT;

-- Update the new user trigger to capture these from Auth metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, avatar_url, role, status, phone, business_name)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.email,
    new.raw_user_meta_data->>'avatar_url',
    (new.raw_user_meta_data->>'role')::public.user_role,
    COALESCE((new.raw_user_meta_data->>'status')::public.user_status, 'pending'),
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'business_name'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the profile approval sync trigger to utilize these new profile fields instead of hardcoded defaults
CREATE OR REPLACE FUNCTION public.handle_profile_approval()
RETURNS TRIGGER AS $$
BEGIN
  IF (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'approved') THEN
  
     IF NEW.role = 'vendor' THEN
        IF NOT EXISTS (SELECT 1 FROM public.vendors WHERE user_id = NEW.id) THEN
            INSERT INTO public.vendors (user_id, business_name, phone)
            VALUES (
                NEW.id, 
                COALESCE(NEW.business_name, COALESCE(NEW.full_name, 'New Vendor') || '''s Store'), 
                COALESCE(NEW.phone, 'Pending Setup')
            );
        END IF;

     ELSIF NEW.role = 'agent' THEN
        IF NOT EXISTS (SELECT 1 FROM public.agents WHERE user_id = NEW.id) THEN
            INSERT INTO public.agents (user_id, name, email, phone, referral_code)
            VALUES (
                NEW.id, 
                COALESCE(NEW.full_name, 'New Agent'), 
                NEW.email,
                NEW.phone,
                'AGT-' || UPPER(SUBSTRING(REPLACE(NEW.id::text, '-', ''), 1, 6))
            )
            ON CONFLICT (referral_code) DO NOTHING;
        END IF;
     END IF;
     
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
