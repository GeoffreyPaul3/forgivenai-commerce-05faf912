-- Migration: All new signups require admin approval — no role is auto-approved.
-- Date: 2026-07-20
-- Rationale: Previously admin role was auto-approved on signup, which was a
-- security hole. Now ALL new user registrations start as 'pending' and must
-- be explicitly approved by an existing approved admin via the dashboard.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_role   public.user_role;
  v_status public.user_status;
BEGIN
  v_role := (new.raw_user_meta_data->>'role')::public.user_role;

  -- ALL new users start as pending — no role is auto-approved.
  -- An existing approved admin must grant access via the dashboard.
  v_status := 'pending';

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
