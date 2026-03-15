-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE,
    username TEXT UNIQUE NOT NULL CHECK (char_length(username) >= 3),
    display_name TEXT,
    bio TEXT,
    avatar_url TEXT,
    website TEXT,
    location TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    is_admin BOOLEAN DEFAULT FALSE,
    is_super_admin BOOLEAN DEFAULT FALSE,
    is_blocked BOOLEAN DEFAULT FALSE,
    is_online BOOLEAN DEFAULT FALSE,
    is_live BOOLEAN DEFAULT FALSE,
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    permissions JSONB DEFAULT '{}'::jsonb,
    followers_count INTEGER DEFAULT 0,
    following_count INTEGER DEFAULT 0,
    total_likes_received INTEGER DEFAULT 0,
    views_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.1 ADD MISSING COLUMNS (In case table already existed)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_live BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS total_likes_received INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS views_count INTEGER DEFAULT 0;

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- CLEANUP POLICIES
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "profiles_read_all" ON public.profiles;
    DROP POLICY IF EXISTS "profiles_self_update" ON public.profiles;
END $$;

-- Helper Functions for RLS
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND (is_admin = TRUE OR is_super_admin = TRUE OR permissions->>'role' = 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- POLICIES
CREATE POLICY "profiles_read_all" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_self_update" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- AUTO-PROFILE ON SIGNUP
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_username TEXT;
    v_display_name TEXT;
    v_avatar_url TEXT;
BEGIN
    -- Extract metadata with fallbacks
    v_display_name := COALESCE(
        NULLIF(NEW.raw_user_meta_data->>'display_name', ''), 
        NULLIF(NEW.raw_user_meta_data->>'full_name', ''), 
        'Usuario'
    );
    
    v_avatar_url := COALESCE(
        NULLIF(NEW.raw_user_meta_data->>'avatar_url', ''), 
        'https://api.dicebear.com/7.x/avataaars/svg?seed=' || NEW.id
    );
    
    -- Generate username from email or metadata
    v_username := LOWER(COALESCE(
        NULLIF(NEW.raw_user_meta_data->>'username', ''),
        SPLIT_PART(NEW.email, '@', 1),
        'user'
    ));

    -- Clean username (only alphanumeric and underscores)
    v_username := REGEXP_REPLACE(v_username, '[^a-zA-Z0-9_]', '', 'g');

    -- Ensure username is at least 3 characters and unique-ish
    IF char_length(v_username) < 3 THEN
        v_username := v_username || SUBSTR(NEW.id::text, 1, 4);
    ELSE
        -- Add suffix to avoid conflicts with existing usernames
        v_username := v_username || '_' || SUBSTR(NEW.id::text, 1, 4);
    END IF;

    -- Final fallback if still too short
    IF char_length(v_username) < 3 THEN
        v_username := 'user_' || SUBSTR(NEW.id::text, 1, 8);
    END IF;

    INSERT INTO public.profiles (id, email, username, display_name, avatar_url)
    VALUES (NEW.id, NEW.email, v_username, v_display_name, v_avatar_url)
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        display_name = COALESCE(public.profiles.display_name, EXCLUDED.display_name),
        avatar_url = COALESCE(public.profiles.avatar_url, EXCLUDED.avatar_url);

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- STORAGE BUCKETS
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('avatars', 'avatars', true, null, '{image/*}'),
    ('media', 'media', true, null, '{image/*,video/*}'),
    ('posts', 'posts', true, null, '{image/*,video/*}'),
    ('ads', 'ads', true, null, '{image/*}')
ON CONFLICT (id) DO UPDATE SET 
    file_size_limit = null,
    public = true,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage Policies
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
    DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
    DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
    DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
    DROP POLICY IF EXISTS "Media is publicly accessible" ON storage.objects;
    DROP POLICY IF EXISTS "Users can upload media" ON storage.objects;
    DROP POLICY IF EXISTS "Users can update their media" ON storage.objects;
    DROP POLICY IF EXISTS "Users can delete their media" ON storage.objects;
    DROP POLICY IF EXISTS "Posts are publicly accessible" ON storage.objects;
    DROP POLICY IF EXISTS "Users can upload posts" ON storage.objects;
    DROP POLICY IF EXISTS "Ads are publicly accessible" ON storage.objects;
    DROP POLICY IF EXISTS "Admins can upload ads" ON storage.objects;
END $$;

CREATE POLICY "Avatar images are publicly accessible" ON storage.objects FOR SELECT TO public USING (bucket_id = 'avatars');
CREATE POLICY "Users can upload their own avatar" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars');
CREATE POLICY "Users can update their own avatar" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'avatars');
CREATE POLICY "Users can delete their own avatar" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'avatars');

CREATE POLICY "Media is publicly accessible" ON storage.objects FOR SELECT TO public USING (bucket_id = 'media');
CREATE POLICY "Users can upload media" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'media');
CREATE POLICY "Users can update their media" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'media');
CREATE POLICY "Users can delete their media" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'media');

CREATE POLICY "Posts are publicly accessible" ON storage.objects FOR SELECT TO public USING (bucket_id = 'posts');
CREATE POLICY "Users can upload posts" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'posts');

CREATE POLICY "Ads are publicly accessible" ON storage.objects FOR SELECT TO public USING (bucket_id = 'ads');
CREATE POLICY "Admins can upload ads" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'ads' AND (SELECT is_admin OR is_super_admin FROM public.profiles WHERE id = auth.uid()));

-- BACKFILL
INSERT INTO public.profiles (id, email, username, display_name, avatar_url)
SELECT 
    id, 
    email,
    LOWER(COALESCE(NULLIF(raw_user_meta_data->>'username', ''), SPLIT_PART(email, '@', 1) || '_' || SUBSTR(id::text, 1, 4))),
    COALESCE(NULLIF(raw_user_meta_data->>'display_name', ''), NULLIF(raw_user_meta_data->>'full_name', ''), 'Usuario'),
    COALESCE(NULLIF(raw_user_meta_data->>'avatar_url', ''), 'https://api.dicebear.com/7.x/avataaars/svg?seed=' || id)
FROM auth.users
ON CONFLICT (id) DO NOTHING;
