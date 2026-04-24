-- Add 'ai_visual' to the allowed types in the content table
ALTER TABLE public.content DROP CONSTRAINT IF EXISTS content_type_check;
ALTER TABLE public.content ADD CONSTRAINT content_type_check CHECK (type IN ('description', 'social_post', 'video', 'campaign', 'ugc', 'ai_visual'));
