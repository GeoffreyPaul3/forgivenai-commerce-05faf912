-- Migration: Vendor Auth Onboarding
-- Description: Adds address, category, and payment_details to profiles, and updates triggers to sync them to vendors.

-- Add metadata columns to profiles to hold data during onboarding
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS payment_details JSONB;

-- Update the new user trigger to capture these from Auth metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  initial_status public.user_status;
  user_role public.user_role;
BEGIN
  user_role := (new.raw_user_meta_data->>'role')::public.user_role;
  
  -- Automatically approve admins, others stay pending unless explicitly set in metadata
  IF user_role = 'admin' THEN
    initial_status := 'approved';
  ELSE
    initial_status := COALESCE((new.raw_user_meta_data->>'status')::public.user_status, 'pending');
  END IF;

  INSERT INTO public.profiles (
    id, 
    full_name, 
    email, 
    avatar_url, 
    role, 
    status, 
    phone, 
    business_name,
    address,
    category,
    payment_details
  )
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.email,
    new.raw_user_meta_data->>'avatar_url',
    user_role,
    initial_status,
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'business_name',
    new.raw_user_meta_data->>'address',
    new.raw_user_meta_data->>'category',
    (new.raw_user_meta_data->>'payment_details')::jsonb
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the profile approval sync trigger to utilize address, category, and payment_details
CREATE OR REPLACE FUNCTION public.handle_profile_approval()
RETURNS TRIGGER AS $$
BEGIN
  -- Trigger this only when status officially turns 'approved'
  IF (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'approved') THEN
  
     IF NEW.role = 'vendor' THEN
        -- Prevent duplicates
        IF NOT EXISTS (SELECT 1 FROM public.vendors WHERE user_id = NEW.id) THEN
            INSERT INTO public.vendors (user_id, business_name, phone, address, category, payment_details)
            VALUES (
                NEW.id, 
                COALESCE(NEW.business_name, COALESCE(NEW.full_name, 'New Vendor') || '''s Store'), 
                COALESCE(NEW.phone, 'Pending Setup'),
                NEW.address,
                NEW.category,
                NEW.payment_details
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
