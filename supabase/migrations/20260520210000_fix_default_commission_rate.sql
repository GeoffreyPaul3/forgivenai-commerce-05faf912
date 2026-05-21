-- Migration: Fix default commission rate from 10% to 8%
-- Date: 2026-05-20
-- This ensures new agent signups receive 8% (Tier 1) commission, not 10%

-- 1. Fix the column-level default (was incorrectly set to 10.00)
ALTER TABLE public.agents
  ALTER COLUMN commission_rate SET DEFAULT 8.00;

-- 2. Update handle_profile_approval so new agents always get 8% explicitly
CREATE OR REPLACE FUNCTION public.handle_profile_approval()
RETURNS TRIGGER AS $$
BEGIN
  -- Trigger if status is 'approved' (either new record or status change)
  IF (NEW.status = 'approved') AND (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status)) THEN

     IF NEW.role = 'vendor' THEN
        -- Prevent duplicates
        IF NOT EXISTS (SELECT 1 FROM public.vendors WHERE user_id = NEW.id) THEN
            INSERT INTO public.vendors (user_id, business_name, phone)
            VALUES (
                NEW.id,
                COALESCE(NEW.full_name, 'New Vendor') || '''s Store',
                'Pending Setup'
            );
        END IF;

     ELSIF NEW.role = 'agent' THEN
        IF NOT EXISTS (SELECT 1 FROM public.agents WHERE user_id = NEW.id) THEN
            INSERT INTO public.agents (user_id, name, email, referral_code, commission_rate)
            VALUES (
                NEW.id,
                COALESCE(NEW.full_name, 'New Agent'),
                NEW.email,
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

-- 3. Reset any agents that may have slipped through with 10% (belt-and-suspenders)
UPDATE public.agents SET commission_rate = 8.00 WHERE commission_rate = 10.00;

-- 4. Verify
DO $$
DECLARE
  agent_count INTEGER;
  default_val TEXT;
BEGIN
  SELECT column_default INTO default_val
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'agents' AND column_name = 'commission_rate';
  RAISE NOTICE 'commission_rate column default is now: %', default_val;

  SELECT COUNT(*) INTO agent_count FROM public.agents WHERE commission_rate = 8;
  RAISE NOTICE 'Total agents on 8%% (Tier 1): %', agent_count;
END;
$$;
