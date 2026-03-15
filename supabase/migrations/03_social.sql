-- 03_social.sql: Interacciones Sociales (Likes, Follows, Comentarios, Bookmarks)

-- 1. Tabla de LIKES
CREATE TABLE IF NOT EXISTS public.likes (
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, post_id)
);

-- 1.1 Ensure columns exist (in case table was created differently)
ALTER TABLE public.likes ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.likes ADD COLUMN IF NOT EXISTS post_id UUID;
ALTER TABLE public.likes ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Ensure foreign keys exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'likes' AND constraint_name = 'likes_user_id_fkey') THEN
        ALTER TABLE public.likes ADD CONSTRAINT likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'likes' AND constraint_name = 'likes_post_id_fkey') THEN
        ALTER TABLE public.likes ADD CONSTRAINT likes_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 2. Tabla de FOLLOWS
CREATE TABLE IF NOT EXISTS public.follows (
    follower_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    following_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (follower_id, following_id),
    CONSTRAINT no_self_follow CHECK (follower_id <> following_id)
);

-- 2.1 Ensure columns and constraints
ALTER TABLE public.follows ADD COLUMN IF NOT EXISTS follower_id UUID;
ALTER TABLE public.follows ADD COLUMN IF NOT EXISTS following_id UUID;
ALTER TABLE public.follows ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'follows' AND constraint_name = 'follows_follower_id_fkey') THEN
        ALTER TABLE public.follows ADD CONSTRAINT follows_follower_id_fkey FOREIGN KEY (follower_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'follows' AND constraint_name = 'follows_following_id_fkey') THEN
        ALTER TABLE public.follows ADD CONSTRAINT follows_following_id_fkey FOREIGN KEY (following_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 3. Tabla de COMMENTS
CREATE TABLE IF NOT EXISTS public.comments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT comment_length CHECK (char_length(content) >= 1 AND char_length(content) <= 1000)
);

-- 3.1 Ensure columns and constraints
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS post_id UUID;
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'comments' AND constraint_name = 'comments_post_id_fkey') THEN
        ALTER TABLE public.comments ADD CONSTRAINT comments_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'comments' AND constraint_name = 'comments_user_id_fkey') THEN
        ALTER TABLE public.comments ADD CONSTRAINT comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 4. Tabla de BOOKMARKS (Marcadores)
CREATE TABLE IF NOT EXISTS public.bookmarks (
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, post_id)
);

-- 4.1 Ensure columns and constraints
ALTER TABLE public.bookmarks ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.bookmarks ADD COLUMN IF NOT EXISTS post_id UUID;
ALTER TABLE public.bookmarks ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'bookmarks' AND constraint_name = 'bookmarks_user_id_fkey') THEN
        ALTER TABLE public.bookmarks ADD CONSTRAINT bookmarks_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'bookmarks' AND constraint_name = 'bookmarks_post_id_fkey') THEN
        ALTER TABLE public.bookmarks ADD CONSTRAINT bookmarks_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 5. Habilitar RLS (Asegurar que esté habilitado incluso si ya existen)
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;

-- 6. Limpieza y Recreación de Políticas
DO $$ 
BEGIN
    -- Likes
    DROP POLICY IF EXISTS "likes_read_all" ON public.likes;
    DROP POLICY IF EXISTS "likes_insert_auth" ON public.likes;
    DROP POLICY IF EXISTS "likes_delete_owner" ON public.likes;
    
    -- Follows
    DROP POLICY IF EXISTS "follows_read_all" ON public.follows;
    DROP POLICY IF EXISTS "follows_insert_auth" ON public.follows;
    DROP POLICY IF EXISTS "follows_delete_owner" ON public.follows;
    
    -- Comments
    DROP POLICY IF EXISTS "comments_read_all" ON public.comments;
    DROP POLICY IF EXISTS "comments_insert_auth" ON public.comments;
    DROP POLICY IF EXISTS "comments_update_owner" ON public.comments;
    DROP POLICY IF EXISTS "comments_delete_owner_admin" ON public.comments;
    
    -- Bookmarks
    DROP POLICY IF EXISTS "bookmarks_read_owner" ON public.bookmarks;
    DROP POLICY IF EXISTS "bookmarks_insert_auth" ON public.bookmarks;
    DROP POLICY IF EXISTS "bookmarks_delete_owner" ON public.bookmarks;
END $$;

-- POLÍTICAS: LIKES
CREATE POLICY "likes_read_all" ON public.likes FOR SELECT USING (true);
CREATE POLICY "likes_insert_auth" ON public.likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "likes_delete_owner" ON public.likes FOR DELETE USING (auth.uid() = user_id);

-- POLÍTICAS: FOLLOWS
CREATE POLICY "follows_read_all" ON public.follows FOR SELECT USING (true);
CREATE POLICY "follows_insert_auth" ON public.follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "follows_delete_owner" ON public.follows FOR DELETE USING (auth.uid() = follower_id);

-- POLÍTICAS: COMMENTS
CREATE POLICY "comments_read_all" ON public.comments FOR SELECT USING (true);
CREATE POLICY "comments_insert_auth" ON public.comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "comments_update_owner" ON public.comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "comments_delete_owner_admin" ON public.comments FOR DELETE USING (
    auth.uid() = user_id 
    OR (SELECT is_admin FROM public.profiles WHERE id = auth.uid())
);

-- POLÍTICAS: BOOKMARKS (Privados)
CREATE POLICY "bookmarks_read_owner" ON public.bookmarks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "bookmarks_insert_auth" ON public.bookmarks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "bookmarks_delete_owner" ON public.bookmarks FOR DELETE USING (auth.uid() = user_id);

-- 7. TRIGGERS PARA CONTADORES (SECURITY DEFINER para saltar RLS en updates de conteo)

-- LIKES COUNT
CREATE OR REPLACE FUNCTION public.handle_post_likes()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE public.posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
        UPDATE public.profiles SET total_likes_received = total_likes_received + 1 
        WHERE id = (SELECT user_id FROM public.posts WHERE id = NEW.post_id);
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE public.posts SET likes_count = likes_count - 1 WHERE id = OLD.post_id;
        UPDATE public.profiles SET total_likes_received = total_likes_received - 1 
        WHERE id = (SELECT user_id FROM public.posts WHERE id = OLD.post_id);
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_like_change ON public.likes;
CREATE TRIGGER on_like_change AFTER INSERT OR DELETE ON public.likes FOR EACH ROW EXECUTE FUNCTION public.handle_post_likes();

-- COMMENTS COUNT
CREATE OR REPLACE FUNCTION public.handle_post_comments()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE public.posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE public.posts SET comments_count = comments_count - 1 WHERE id = OLD.post_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_comment_change ON public.comments;
CREATE TRIGGER on_comment_change AFTER INSERT OR DELETE ON public.comments FOR EACH ROW EXECUTE FUNCTION public.handle_post_comments();

-- FOLLOWS COUNT
CREATE OR REPLACE FUNCTION public.handle_follow_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE public.profiles SET following_count = following_count + 1 WHERE id = NEW.follower_id;
        UPDATE public.profiles SET followers_count = followers_count + 1 WHERE id = NEW.following_id;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE public.profiles SET following_count = following_count - 1 WHERE id = OLD.follower_id;
        UPDATE public.profiles SET followers_count = followers_count - 1 WHERE id = OLD.following_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_follow_change ON public.follows;
CREATE TRIGGER on_follow_change AFTER INSERT OR DELETE ON public.follows FOR EACH ROW EXECUTE FUNCTION public.handle_follow_stats();
