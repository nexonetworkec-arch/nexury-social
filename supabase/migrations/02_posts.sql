-- 02_posts.sql: Publicaciones y Almacenamiento de Medios

-- 1. Asegurar extensión para UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Tabla de Publicaciones
CREATE TABLE IF NOT EXISTS public.posts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    content TEXT,
    image_url TEXT,
    media_type TEXT DEFAULT 'image', -- 'image', 'video', 'text'
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    views_count INTEGER DEFAULT 0,
    show_appointment_button BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT content_or_image CHECK (content IS NOT NULL OR image_url IS NOT NULL)
);

-- 2.1 ADD MISSING COLUMNS (In case table already existed)
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS media_type TEXT DEFAULT 'image';
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS comments_count INTEGER DEFAULT 0;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS views_count INTEGER DEFAULT 0;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS show_appointment_button BOOLEAN DEFAULT FALSE;

-- Ensure foreign key exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'posts' AND constraint_name = 'posts_user_id_fkey'
    ) THEN
        ALTER TABLE public.posts ADD CONSTRAINT posts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 3. Habilitar RLS
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- 4. Limpieza y Recreación de Políticas para la tabla posts
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "posts_read_all" ON public.posts;
    DROP POLICY IF EXISTS "posts_insert_auth" ON public.posts;
    DROP POLICY IF EXISTS "posts_update_owner_admin" ON public.posts;
    DROP POLICY IF EXISTS "posts_delete_owner_admin" ON public.posts;
    DROP POLICY IF EXISTS "posts_self_manage" ON public.posts;
END $$;

-- Política de Lectura: Cualquiera puede ver posts (público)
CREATE POLICY "posts_read_all" ON public.posts 
FOR SELECT USING (true);

-- Política de Inserción: Solo usuarios autenticados y para su propio ID
CREATE POLICY "posts_insert_auth" ON public.posts 
FOR INSERT WITH CHECK (
    auth.uid() = user_id 
    AND EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND is_blocked = false
    )
);

-- Política de Actualización: Solo el dueño o un administrador
CREATE POLICY "posts_update_owner_admin" ON public.posts 
FOR UPDATE USING (
    auth.uid() = user_id 
    OR (SELECT is_admin FROM public.profiles WHERE id = auth.uid())
);

-- Política de Borrado: Solo el dueño o un administrador
CREATE POLICY "posts_delete_owner_admin" ON public.posts 
FOR DELETE USING (
    auth.uid() = user_id 
    OR (SELECT is_admin FROM public.profiles WHERE id = auth.uid())
);

-- 5. Configuración de Almacenamiento (Bucket 'posts')
-- Insertar el bucket si no existe
INSERT INTO storage.buckets (id, name, public)
SELECT 'posts', 'posts', true
WHERE NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'posts'
);

-- Limpieza de políticas de storage para evitar conflictos
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Public Access Posts" ON storage.objects;
    DROP POLICY IF EXISTS "Authenticated Upload Posts" ON storage.objects;
    DROP POLICY IF EXISTS "Owner Delete Posts" ON storage.objects;
END $$;

-- Política: Acceso público a los archivos del bucket 'posts'
CREATE POLICY "Public Access Posts" ON storage.objects 
FOR SELECT USING (bucket_id = 'posts');

-- Política: Solo usuarios autenticados pueden subir archivos a 'posts'
CREATE POLICY "Authenticated Upload Posts" ON storage.objects 
FOR INSERT WITH CHECK (
    bucket_id = 'posts' 
    AND auth.role() = 'authenticated'
);

-- Política: Solo el dueño puede borrar sus archivos en 'posts'
CREATE POLICY "Owner Delete Posts" ON storage.objects 
FOR DELETE USING (
    bucket_id = 'posts' 
    AND auth.uid() = owner
);

-- 6. Vista posts_with_profiles
DROP VIEW IF EXISTS public.posts_with_profiles;
CREATE VIEW public.posts_with_profiles AS
SELECT 
    p.*, 
    pr.username, 
    pr.display_name, 
    pr.avatar_url, 
    pr.is_verified
FROM public.posts p
JOIN public.profiles pr ON p.user_id = pr.id;
