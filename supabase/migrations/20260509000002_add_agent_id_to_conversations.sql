-- Add agent_id to conversations for referral tracking
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_conversations_agent ON public.conversations(agent_id);
