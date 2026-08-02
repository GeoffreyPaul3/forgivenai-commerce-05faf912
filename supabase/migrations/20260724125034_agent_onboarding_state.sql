-- Migration to add onboarding_state JSONB column to agents table for V6.0 Agent Success Platform
ALTER TABLE public.agents
ADD COLUMN IF NOT EXISTS onboarding_state JSONB DEFAULT '{}'::jsonb;

-- Ensure RLS allows agents to update their own onboarding state
-- Wait, the agents table might already have an UPDATE policy.
-- Let's just add the column for now.
