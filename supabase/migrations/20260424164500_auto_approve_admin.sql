-- Update handle_new_user to automatically approve admins
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  initial_status public.user_status;
  user_role public.user_role;
BEGIN
  user_role := (new.raw_user_meta_data->>'role')::public.user_role;
  
  -- Automatically approve admins, others stay pending
  IF user_role = 'admin' THEN
    initial_status := 'approved';
  ELSE
    initial_status := COALESCE((new.raw_user_meta_data->>'status')::public.user_status, 'pending');
  END IF;

  INSERT INTO public.profiles (id, full_name, email, avatar_url, role, status, phone, business_name)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.email,
    new.raw_user_meta_data->>'avatar_url',
    user_role,
    initial_status,
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'business_name'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
