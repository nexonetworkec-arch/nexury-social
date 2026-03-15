-- 1. EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLA DE PERFILES
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    display_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    is_verified BOOLEAN DEFAULT false,
    is_admin BOOLEAN DEFAULT false,
    is_super_admin BOOLEAN DEFAULT false,
    is_online BOOLEAN DEFAULT false,
    last_seen TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Restricciones de formato
    CONSTRAINT username_length CHECK (char_length(username) >= 3)
);

-- Habilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. POLÍTICAS DE RLS PARA PROFILES
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
    DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
END $$;

CREATE POLICY "Public profiles are viewable by everyone"
ON public.profiles FOR SELECT
TO public
USING (true);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 4. FUNCIÓN Y TRIGGER PARA NUEVOS USUARIOS
-- Esta función se ejecuta automáticamente cuando se crea un usuario en auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, username, display_name, avatar_url)
    VALUES (
        NEW.id,
        LOWER(SPLIT_PART(NEW.email, '@', 1)) || '_' || SUBSTRING(NEW.id::text, 1, 4),
        COALESCE(NEW.raw_user_meta_data->>'display_name', SPLIT_PART(NEW.email, '@', 1)),
        NEW.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. STORAGE (AVATARES Y MEDIA SIN LÍMITE DE TAMAÑO)
-- Aseguramos que los buckets existan y no tengan límite de tamaño (file_size_limit = null)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('avatars', 'avatars', true, null, '{image/*}'),
    ('media', 'media', true, null, '{image/*,video/*}')
ON CONFLICT (id) DO UPDATE SET 
    file_size_limit = null,
    public = true,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Políticas de Storage para 'avatars'
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
    DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
    DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
    DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
END $$;

CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Políticas de Storage para 'media'
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Media is publicly accessible" ON storage.objects;
    DROP POLICY IF EXISTS "Users can upload media" ON storage.objects;
    DROP POLICY IF EXISTS "Users can update their media" ON storage.objects;
    DROP POLICY IF EXISTS "Users can delete their media" ON storage.objects;
END $$;

CREATE POLICY "Media is publicly accessible"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'media');

CREATE POLICY "Users can upload media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'media');

CREATE POLICY "Users can update their media"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'media');

CREATE POLICY "Users can delete their media"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'media');

-- 6. SINCRONIZACIÓN RETROACTIVA
-- Insertar perfiles para usuarios que ya existen en auth.users pero no en public.profiles
INSERT INTO public.profiles (id, username, display_name, avatar_url)
SELECT 
    id,
    LOWER(SPLIT_PART(email, '@', 1)) || '_' || SUBSTRING(id::text, 1, 4),
    COALESCE(raw_user_meta_data->>'display_name', SPLIT_PART(email, '@', 1)),
    raw_user_meta_data->>'avatar_url'
FROM auth.users
ON CONFLICT (id) DO NOTHING;
