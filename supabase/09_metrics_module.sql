-- NEXUS SOCIAL - MÓDULO 09: MÉTRICAS Y VISTAS ÚNICAS
-- Propósito: Garantizar que las visualizaciones sean únicas por usuario y post.

-- 1. TABLA DE VISTAS DE POSTS
CREATE TABLE IF NOT EXISTS public.post_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(post_id, user_id)
);

-- 2. TABLA DE VISTAS DE PERFILES
CREATE TABLE IF NOT EXISTS public.profile_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    viewer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(profile_id, viewer_id)
);

-- 3. RLS PARA VISTAS
ALTER TABLE public.post_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lectura pública de vistas de posts" ON public.post_views FOR SELECT USING (true);
CREATE POLICY "Creación de vistas de posts propias" ON public.post_views FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Lectura pública de vistas de perfiles" ON public.profile_views FOR SELECT USING (true);
CREATE POLICY "Creación de vistas de perfiles propias" ON public.profile_views FOR INSERT WITH CHECK (auth.uid() = viewer_id);

-- 4. FUNCIÓN PARA INCREMENTAR CONTADOR DE VISTAS DE POSTS
CREATE OR REPLACE FUNCTION public.handle_post_view_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.posts SET views_count = views_count + 1 WHERE id = NEW.post_id;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. TRIGGER PARA VISTAS DE POSTS
DROP TRIGGER IF EXISTS on_view_added ON public.post_views;
CREATE TRIGGER on_view_added
AFTER INSERT ON public.post_views
FOR EACH ROW EXECUTE FUNCTION public.handle_post_view_count();

-- 6. RPC PARA REGISTRO SEGURO DESDE EL FRONTEND
CREATE OR REPLACE FUNCTION public.record_unique_view(p_viewer_id UUID, p_target_id UUID, p_target_type TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    IF p_target_type = 'post' THEN
        INSERT INTO public.post_views (post_id, user_id)
        VALUES (p_target_id, p_viewer_id)
        ON CONFLICT (post_id, user_id) DO NOTHING;
        
        RETURN FOUND;
    ELSIF p_target_type = 'profile' THEN
        INSERT INTO public.profile_views (profile_id, viewer_id)
        VALUES (p_target_id, p_viewer_id)
        ON CONFLICT (profile_id, viewer_id) DO NOTHING;
        
        RETURN FOUND;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
