-- Bootstrap Admin User: tuntumwalwenje@gmail.com
-- This migration ensures that tuntumwalwenje@gmail.com has the admin role and is approved.

DO $$
DECLARE
  admin_user_id UUID;
BEGIN
  -- Find the user by email
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = 'tuntumwalwenje@gmail.com'
  LIMIT 1;

  IF admin_user_id IS NOT NULL THEN
    INSERT INTO public.profiles (id, full_name, role, status)
    VALUES (admin_user_id, 'Tuntumwalwenje', 'admin', 'approved')
    ON CONFLICT (id) DO UPDATE SET
      role = 'admin',
      status = 'approved',
      updated_at = now();
    
    RAISE NOTICE 'Admin user set successfully for ID: %', admin_user_id;
  ELSE
    RAISE NOTICE 'User not found: tuntumwalwenje@gmail.com. This migration will update the role once the user registers.';
  END IF;
END $$;
