-- POSTS MODULE
CREATE TABLE IF NOT EXISTS public.posts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    content TEXT,
    image_url TEXT,
    media_type TEXT DEFAULT 'image', -- 'image', 'video', 'text'
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    views_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT content_or_image CHECK (content IS NOT NULL OR image_url IS NOT NULL)
);

-- RLS
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- POLICIES
CREATE POLICY "posts_read_all" ON public.posts FOR SELECT USING (true);
CREATE POLICY "posts_self_manage" ON public.posts FOR ALL USING (auth.uid() = user_id OR is_admin());

-- VIEW
CREATE OR REPLACE VIEW public.posts_with_profiles AS
SELECT 
    p.*, 
    pr.username, 
    pr.display_name, 
    pr.avatar_url, 
    pr.is_verified
FROM public.posts p
JOIN public.profiles pr ON p.user_id = pr.id;
