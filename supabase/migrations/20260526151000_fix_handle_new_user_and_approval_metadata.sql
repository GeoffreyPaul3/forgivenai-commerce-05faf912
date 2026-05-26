-- Migration: Fix handle_new_user and handle_profile_approval to restore metadata fields sync.
-- Date: 2026-05-26

-- 1. Correctly copy all metadata fields to public.profiles upon signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_role   public.user_role;
  v_status public.user_status;
BEGIN
  v_role := (new.raw_user_meta_data->>'role')::public.user_role;

  -- Only admins are auto-approved; everyone else must be reviewed.
  IF v_role = 'admin' THEN
    v_status := 'approved';
  ELSE
    v_status := 'pending';
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
    v_role,
    v_status,
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'business_name',
    new.raw_user_meta_data->>'address',
    new.raw_user_meta_data->>'category',
    (new.raw_user_meta_data->>'payment_details')::jsonb
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Correctly copy all metadata fields to vendors/agents tables when a profile is approved
CREATE OR REPLACE FUNCTION public.handle_profile_approval()
RETURNS TRIGGER AS $$
BEGIN
  -- Trigger if status is 'approved' (either new record or status change)
  IF (NEW.status = 'approved') AND (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status)) THEN

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
            INSERT INTO public.agents (user_id, name, email, phone, referral_code, commission_rate)
            VALUES (
                NEW.id,
                COALESCE(NEW.full_name, 'New Agent'),
                NEW.email,
                NEW.phone,
                'AGT-' || UPPER(SUBSTRING(REPLACE(NEW.id::text, '-', ''), 1, 6)),
                8.00  -- Explicitly set Tier 1 (8%) — never rely on column default
            )
            ON CONFLICT (referral_code) DO NOTHING;
        END IF;
     END IF;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
