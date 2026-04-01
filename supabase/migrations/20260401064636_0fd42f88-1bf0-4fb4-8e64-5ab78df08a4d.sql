
-- UGC Projects table for tracking video generation pipeline
CREATE TABLE public.ugc_projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  avatar_url TEXT,
  avatar_settings JSONB DEFAULT '{}'::jsonb,
  script TEXT,
  storyboard JSONB DEFAULT '[]'::jsonb,
  video_url TEXT,
  voice_url TEXT,
  status TEXT DEFAULT 'draft',
  provider TEXT DEFAULT 'lovable-ai',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- UGC Frames table for multi-frame storyboards
CREATE TABLE public.ugc_frames (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.ugc_projects(id) ON DELETE CASCADE NOT NULL,
  frame_index INTEGER NOT NULL DEFAULT 0,
  image_url TEXT,
  scene TEXT,
  camera TEXT,
  expression TEXT,
  dialogue TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Influencers table for persistent AI brand ambassadors
CREATE TABLE public.influencers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  avatar_url TEXT,
  voice_id TEXT,
  tone TEXT DEFAULT 'friendly',
  niche TEXT DEFAULT 'fashion',
  catchphrases TEXT[] DEFAULT '{}'::text[],
  gender TEXT DEFAULT 'female',
  ethnicity TEXT DEFAULT 'african',
  setting TEXT DEFAULT 'studio',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.ugc_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ugc_frames ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.influencers ENABLE ROW LEVEL SECURITY;

-- Public access policies (matching existing pattern)
CREATE POLICY "Public can manage ugc_projects" ON public.ugc_projects FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Public can manage ugc_frames" ON public.ugc_frames FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Public can manage influencers" ON public.influencers FOR ALL TO public USING (true) WITH CHECK (true);

-- Updated_at triggers
CREATE TRIGGER update_ugc_projects_updated_at BEFORE UPDATE ON public.ugc_projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_influencers_updated_at BEFORE UPDATE ON public.influencers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
