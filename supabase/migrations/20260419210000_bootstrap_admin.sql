-- Bootstrap Admin User
-- This migration sets geofreypaul40@gmail.com as the platform admin.
-- It uses ON CONFLICT to safely update if the profile already exists,
-- or insert if it does not yet exist.

DO $$
DECLARE
  admin_user_id UUID;
BEGIN
  -- Find the user by email
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = 'geofreypaul40@gmail.com'
  LIMIT 1;

  IF admin_user_id IS NOT NULL THEN
    INSERT INTO public.profiles (id, full_name, role, status)
    VALUES (admin_user_id, 'Geoffrey Paul', 'admin', 'approved')
    ON CONFLICT (id) DO UPDATE SET
      role = 'admin',
      status = 'approved',
      updated_at = now();
    
    RAISE NOTICE 'Admin user set successfully for ID: %', admin_user_id;
  ELSE
    RAISE NOTICE 'User not found: geofreypaul40@gmail.com. Run again after the user signs up.';
  END IF;
END $$;
