-- Require admin approval for all new vendor and agent accounts.
-- Only admin role is auto-approved. Vendors and agents start as 'pending'.

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
