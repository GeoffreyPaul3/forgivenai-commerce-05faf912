-- ============================================================
-- FIX: Admin RLS policies + Bootstrap Admin User
-- Run this entirely in Supabase SQL Editor
-- ============================================================

-- Step 1: Ensure columns exist
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS role TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Step 2: Create a SECURITY DEFINER function to check admin role
-- (avoids recursive RLS policy problem)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Step 3: Drop old restrictive update policy and add admin policy
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can update their own profile" ON public.profiles 
  FOR UPDATE TO authenticated 
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

CREATE POLICY "Admins can update all profiles" ON public.profiles 
  FOR UPDATE TO authenticated 
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Step 4: Upsert the admin profile for Geoffrey Paul
INSERT INTO public.profiles (id, full_name, role, status)
SELECT 
  u.id,
  COALESCE(u.raw_user_meta_data->>'full_name', 'Geoffrey Paul'),
  'admin',
  'approved'
FROM auth.users u
WHERE u.email = 'geofreypaul40@gmail.com'
ON CONFLICT (id) DO UPDATE SET
  role    = 'admin',
  status  = 'approved',
  updated_at = now();

-- Step 5: Verify
SELECT id, full_name, role, status 
FROM public.profiles 
WHERE role = 'admin';
