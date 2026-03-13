-- NEXUS SOCIAL - MÓDULO 05: ESTADÍSTICAS Y CONTADORES EN TIEMPO REAL
-- Propósito: Mantener contadores de seguidores, seguidos y likes actualizados.

-- 1. EXTENDER TABLA PROFILES CON CONTADORES
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='followers_count') THEN
        ALTER TABLE public.profiles ADD COLUMN followers_count INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='following_count') THEN
        ALTER TABLE public.profiles ADD COLUMN following_count INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='total_likes_received') THEN
        ALTER TABLE public.profiles ADD COLUMN total_likes_received INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='posts' AND column_name='views_count') THEN
        ALTER TABLE public.posts ADD COLUMN views_count INTEGER DEFAULT 0;
    END IF;
END $$;

-- 2. TRIGGER PARA CONTADORES DE SEGUIDORES (FOLLOWS)
CREATE OR REPLACE FUNCTION public.handle_follow_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    -- Aumentar seguidor al que recibe el follow
    UPDATE public.profiles SET followers_count = followers_count + 1 WHERE id = NEW.following_id;
    -- Aumentar seguido al que realiza el follow
    UPDATE public.profiles SET following_count = following_count + 1 WHERE id = NEW.follower_id;
  ELSIF (TG_OP = 'DELETE') THEN
    -- Disminuir seguidor
    UPDATE public.profiles SET followers_count = followers_count - 1 WHERE id = OLD.following_id;
    -- Disminuir seguido
    UPDATE public.profiles SET following_count = following_count - 1 WHERE id = OLD.follower_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_follow_change_stats ON public.follows;
CREATE TRIGGER on_follow_change_stats
  AFTER INSERT OR DELETE ON public.follows
  FOR EACH ROW EXECUTE PROCEDURE public.handle_follow_stats();

-- 3. TRIGGER PARA TOTAL DE LIKES RECIBIDOS EN PERFIL
CREATE OR REPLACE FUNCTION public.handle_profile_likes_stats()
RETURNS TRIGGER AS $$
DECLARE
  post_author_id UUID;
BEGIN
  -- Obtener el autor del post al que se le dio like
  IF (TG_OP = 'INSERT') THEN
    SELECT user_id INTO post_author_id FROM public.posts WHERE id = NEW.post_id;
    UPDATE public.profiles SET total_likes_received = total_likes_received + 1 WHERE id = post_author_id;
  ELSIF (TG_OP = 'DELETE') THEN
    SELECT user_id INTO post_author_id FROM public.posts WHERE id = OLD.post_id;
    UPDATE public.profiles SET total_likes_received = total_likes_received - 1 WHERE id = post_author_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_like_change_profile_stats ON public.likes;
CREATE TRIGGER on_like_change_profile_stats
  AFTER INSERT OR DELETE ON public.likes
  FOR EACH ROW EXECUTE PROCEDURE public.handle_profile_likes_stats();

-- 4. HABILITAR REALTIME PARA PERFILES (Para ver cambios en contadores al instante)
-- Nota: Si ya está en la publicación, esto no hará daño.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'profiles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  END IF;
END $$;
