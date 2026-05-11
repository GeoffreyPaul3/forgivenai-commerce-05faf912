
-- 1. Add missing onboarding fields to agents table
ALTER TABLE public.agents 
ADD COLUMN IF NOT EXISTS national_id TEXT,
ADD COLUMN IF NOT EXISTS emergency_contact TEXT,
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS payment_details JSONB;

-- 2. Add tiering flag to products
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS is_luxury BOOLEAN DEFAULT FALSE;

-- 3. Update existing products to be 'Essentials' by default
UPDATE public.products SET is_luxury = FALSE WHERE is_luxury IS NULL;

-- 4. Create a table for Training Materials (Stage 3)
CREATE TABLE IF NOT EXISTS public.training_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL, -- 'pdf', 'video', 'link'
    url TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.training_materials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agents can view training materials" ON public.training_materials;
CREATE POLICY "Agents can view training materials"
ON public.training_materials FOR SELECT
USING (EXISTS (SELECT 1 FROM public.agents WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Admins can manage training materials" ON public.training_materials;
CREATE POLICY "Admins can manage training materials"
ON public.training_materials FOR ALL
USING (auth.jwt() ->> 'role' = 'admin');
