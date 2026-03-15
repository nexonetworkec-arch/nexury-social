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

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

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
    ('media', 'media', true, null, '{image/*,video/*}')
ON CONFLICT (id) DO UPDATE SET 
    file_size_limit = null,
    public = true,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage Policies
CREATE POLICY "Avatar images are publicly accessible" ON storage.objects FOR SELECT TO public USING (bucket_id = 'avatars');
CREATE POLICY "Users can upload their own avatar" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can update their own avatar" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can delete their own avatar" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Media is publicly accessible" ON storage.objects FOR SELECT TO public USING (bucket_id = 'media');
CREATE POLICY "Users can upload media" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'media');
CREATE POLICY "Users can update their media" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'media');
CREATE POLICY "Users can delete their media" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'media');

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
