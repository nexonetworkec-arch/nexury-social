-- NEXUS SOCIAL - MÓDULO 02: MOTOR SOCIAL
-- Propósito: Publicaciones, Comentarios, Likes, Seguidores y Contadores.

-- 1. TABLAS
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND (is_admin = TRUE OR is_super_admin = TRUE)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TABLE IF NOT EXISTS public.posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  media_type TEXT DEFAULT 'image',
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  views_count INTEGER DEFAULT 0,
  show_appointment_button BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.likes (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  PRIMARY KEY (user_id, post_id)
);

CREATE TABLE IF NOT EXISTS public.follows (
  follower_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  following_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  PRIMARY KEY (follower_id, following_id)
);

-- 2. VISTAS
DROP VIEW IF EXISTS public.posts_with_profiles CASCADE;
CREATE OR REPLACE VIEW public.posts_with_profiles AS
SELECT p.*, pr.username, pr.display_name, pr.avatar_url, pr.is_verified
FROM public.posts p
JOIN public.profiles pr ON p.user_id = pr.id;

-- 3. RLS
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

-- Limpieza de políticas (CORREGIDO PARA EVITAR ERROR NULL)
DO $$ 
DECLARE
    pol_cmd TEXT;
BEGIN
    SELECT string_agg('DROP POLICY IF EXISTS ' || quote_ident(policyname) || ' ON ' || quote_ident(tablename) || ';', ' ')
    INTO pol_cmd
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename IN ('posts', 'comments', 'likes', 'follows');

    IF pol_cmd IS NOT NULL THEN
        EXECUTE pol_cmd;
    END IF;
END $$;

-- Políticas Posts
CREATE POLICY "Lectura pública de posts" ON public.posts FOR SELECT USING (true);
CREATE POLICY "Creación de posts" ON public.posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Edición de posts propios" ON public.posts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Borrado de posts (Dueño o Admin)" ON public.posts FOR DELETE USING (auth.uid() = user_id OR public.is_admin());

-- Políticas Comentarios
CREATE POLICY "Lectura pública de comentarios" ON public.comments FOR SELECT USING (true);
CREATE POLICY "Creación de comentarios" ON public.comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Borrado de comentarios (Dueño o Admin)" ON public.comments FOR DELETE USING (auth.uid() = user_id OR public.is_admin());

-- Políticas Likes y Seguidores
CREATE POLICY "Gestión de likes propios" ON public.likes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Gestión de seguidos propios" ON public.follows FOR ALL USING (auth.uid() = follower_id);

-- 4. CONTADORES (Triggers)
CREATE OR REPLACE FUNCTION handle_like_count() RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE public.posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE public.posts SET likes_count = likes_count - 1 WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_like_change ON public.likes;
CREATE TRIGGER on_like_change AFTER INSERT OR DELETE ON public.likes FOR EACH ROW EXECUTE PROCEDURE handle_like_count();
