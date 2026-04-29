-- Fix specific users who should be approved admins
UPDATE public.profiles 
SET status = 'approved', role = 'admin' 
WHERE full_name IN ('Tuntufye Grace Mwalwenje', 'g tiger', 'Gtiger Jeff')
   OR email IN ('tgrace@forgivenshoppingcentre.com'); -- Added likely email for Grace

-- Ensure all admins are approved automatically
UPDATE public.profiles
SET status = 'approved'
WHERE role = 'admin' AND status = 'pending';
