-- Add unique constraint to product name to support UPSERT operations during sync
-- First, handle any potential duplicates that might already exist (unlikely in this fresh catalog but safe)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'products_name_unique'
    ) THEN
        ALTER TABLE public.products ADD CONSTRAINT products_name_unique UNIQUE (name);
    END IF;
END $$;
