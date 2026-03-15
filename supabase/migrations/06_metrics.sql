-- METRICS MODULE (VIEWS)

-- POST VIEWS
CREATE TABLE IF NOT EXISTS public.post_views (
    post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (post_id, user_id)
);

-- PROFILE VIEWS
CREATE TABLE IF NOT EXISTS public.profile_views (
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    viewer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (profile_id, viewer_id)
);

-- RLS
ALTER TABLE public.post_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_views ENABLE ROW LEVEL SECURITY;

-- CLEANUP POLICIES
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "post_views_read_all" ON public.post_views;
    DROP POLICY IF EXISTS "post_views_insert_auth" ON public.post_views;
    DROP POLICY IF EXISTS "profile_views_read_all" ON public.profile_views;
    DROP POLICY IF EXISTS "profile_views_insert_auth" ON public.profile_views;
END $$;

-- POLICIES
CREATE POLICY "post_views_read_all" ON public.post_views FOR SELECT USING (true);
CREATE POLICY "post_views_insert_auth" ON public.post_views FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "profile_views_read_all" ON public.profile_views FOR SELECT USING (true);
CREATE POLICY "profile_views_insert_auth" ON public.profile_views FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- RPCs
CREATE OR REPLACE FUNCTION public.record_view_atomic(p_post_id UUID, p_user_id UUID DEFAULT NULL)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.post_views (post_id, user_id) 
    VALUES (p_post_id, p_user_id)
    ON CONFLICT (post_id, user_id) DO NOTHING;
    
    IF FOUND THEN
        UPDATE public.posts SET views_count = views_count + 1 WHERE id = p_post_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.record_profile_view_atomic(p_profile_id UUID, p_viewer_id UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.profile_views (profile_id, viewer_id) 
    VALUES (p_profile_id, p_viewer_id)
    ON CONFLICT (profile_id, viewer_id) DO NOTHING;
    
    IF FOUND THEN
        UPDATE public.profiles SET views_count = views_count + 1 WHERE id = p_profile_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
