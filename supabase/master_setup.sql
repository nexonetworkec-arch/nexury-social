-- NEXUS SOCIAL - MASTER SETUP SCRIPT
-- Consolidates all modules: Profiles, Social, Chat, Notifications, Metrics, and Security.
-- Version: 4.0 (Consolidated & Perfected)

-- 0. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABLES
-- PROFILES
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

-- POSTS
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

-- LIKES
CREATE TABLE IF NOT EXISTS public.likes (
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, post_id)
);

-- FOLLOWS
CREATE TABLE IF NOT EXISTS public.follows (
    follower_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    following_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (follower_id, following_id),
    CONSTRAINT no_self_follow CHECK (follower_id <> following_id)
);

-- COMMENTS
CREATE TABLE IF NOT EXISTS public.comments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT comment_length CHECK (char_length(content) >= 1 AND char_length(content) <= 1000)
);

-- BOOKMARKS
CREATE TABLE IF NOT EXISTS public.bookmarks (
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, post_id)
);

-- CONVERSATIONS
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    last_message TEXT,
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CONVERSATION PARTICIPANTS
CREATE TABLE IF NOT EXISTS public.conversation_participants (
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (conversation_id, user_id)
);

-- MESSAGES
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
    sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    receiver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE, -- Agregado para facilitar consultas de no leídos
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    is_deleted_for_everyone BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL, -- Destinatario
    from_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL, -- Remitente
    type TEXT NOT NULL, -- 'like', 'comment', 'follow', 'message', 'appointment'
    post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
    content TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- METRICS: POST VIEWS
CREATE TABLE IF NOT EXISTS public.post_views (
    post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (post_id, user_id)
);

-- METRICS: PROFILE VIEWS
CREATE TABLE IF NOT EXISTS public.profile_views (
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    viewer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (profile_id, viewer_id)
);

-- APPOINTMENTS
CREATE TABLE IF NOT EXISTS public.appointments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    requester_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    receiver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    appointment_date TIMESTAMPTZ NOT NULL,
    status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'rejected', 'cancelled'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ADS
CREATE TABLE IF NOT EXISTS public.ads (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT,
    image_url TEXT,
    link_url TEXT,
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- VERIFIED BENEFITS
CREATE TABLE IF NOT EXISTS public.verified_benefits (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL, -- Cambiado de title a name
    slug TEXT UNIQUE, -- Agregado slug
    description TEXT,
    icon_name TEXT, -- Cambiado de icon a icon_name
    is_active BOOLEAN DEFAULT TRUE, -- Agregado is_active
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- VERIFIED BENEFITS USERS
CREATE TABLE IF NOT EXISTS public.verified_benefits_users (
    benefit_id UUID REFERENCES public.verified_benefits(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    activated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (benefit_id, user_id)
);

-- PUSH TOKENS
CREATE TABLE IF NOT EXISTS public.push_tokens (
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    token TEXT NOT NULL,
    device_type TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, token)
);

-- APP SETTINGS
CREATE TABLE IF NOT EXISTS public.app_settings (
    id TEXT PRIMARY KEY DEFAULT 'global',
    maintenance_mode BOOLEAN DEFAULT FALSE,
    registrations_open BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- USER REPORTS
CREATE TABLE IF NOT EXISTS public.user_reports (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    reporter_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    target_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'pending', -- 'pending', 'reviewed', 'resolved'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- USER BLOCKS
CREATE TABLE IF NOT EXISTS public.user_blocks (
    blocker_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    blocked_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (blocker_id, blocked_id)
);

-- LIVE STREAMS
CREATE TABLE IF NOT EXISTS public.live_streams (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    viewer_count INTEGER DEFAULT 0,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ
);

-- LIVE MESSAGES
CREATE TABLE IF NOT EXISTS public.live_messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    stream_id UUID REFERENCES public.live_streams(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. SECURITY (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verified_benefits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verified_benefits_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_messages ENABLE ROW LEVEL SECURITY;

-- CLEANUP OLD POLICIES
DO $$ 
DECLARE r record;
BEGIN
    FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') 
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
    END LOOP;
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- POLICIES: PROFILES
CREATE POLICY "profiles_read_all" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_self_update" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- POLICIES: POSTS
CREATE POLICY "posts_read_all" ON public.posts FOR SELECT USING (true);
CREATE POLICY "posts_self_manage" ON public.posts FOR ALL USING (auth.uid() = user_id OR is_admin());

-- POLICIES: LIKES
CREATE POLICY "likes_read_all" ON public.likes FOR SELECT USING (true);
CREATE POLICY "likes_self_manage" ON public.likes FOR ALL USING (auth.uid() = user_id);

-- POLICIES: FOLLOWS
CREATE POLICY "follows_read_all" ON public.follows FOR SELECT USING (true);
CREATE POLICY "follows_self_manage" ON public.follows FOR ALL USING (auth.uid() = follower_id);

-- POLICIES: COMMENTS
CREATE POLICY "comments_read_all" ON public.comments FOR SELECT USING (true);
CREATE POLICY "comments_self_manage" ON public.comments FOR ALL USING (auth.uid() = user_id OR is_admin());

-- POLICIES: CHAT (Anti-Recursion)
CREATE POLICY "participants_select_safe" ON public.conversation_participants FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "participants_insert_safe" ON public.conversation_participants FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "participants_delete_self" ON public.conversation_participants FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "conversations_select_safe" ON public.conversations FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.conversation_participants WHERE conversation_id = id AND user_id = auth.uid()));
CREATE POLICY "conversations_insert_safe" ON public.conversations FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "conversations_update_safe" ON public.conversations FOR UPDATE 
USING (EXISTS (SELECT 1 FROM public.conversation_participants WHERE conversation_id = id AND user_id = auth.uid()));

CREATE POLICY "messages_select_safe" ON public.messages FOR SELECT 
USING (auth.uid() = sender_id OR auth.uid() = receiver_id OR EXISTS (SELECT 1 FROM public.conversation_participants WHERE conversation_id = messages.conversation_id AND user_id = auth.uid()));
CREATE POLICY "messages_insert_self" ON public.messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "messages_update_self" ON public.messages FOR UPDATE USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- POLICIES: NOTIFICATIONS
CREATE POLICY "notifications_read_self" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "notifications_insert_auth" ON public.notifications FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "notifications_manage_self" ON public.notifications FOR ALL USING (auth.uid() = user_id);

-- POLICIES: OTHERS
CREATE POLICY "bookmarks_self_manage" ON public.bookmarks FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "appointments_self_manage" ON public.appointments FOR ALL USING (auth.uid() = requester_id OR auth.uid() = receiver_id);
CREATE POLICY "ads_read_all" ON public.ads FOR SELECT USING (true);
CREATE POLICY "benefits_read_all" ON public.verified_benefits FOR SELECT USING (true);
CREATE POLICY "live_streams_read_all" ON public.live_streams FOR SELECT USING (true);
CREATE POLICY "live_streams_self_manage" ON public.live_streams FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "live_messages_read_all" ON public.live_messages FOR SELECT USING (true);
CREATE POLICY "live_messages_insert_auth" ON public.live_messages FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 3. FUNCTIONS & TRIGGERS
-- AUTO-PROFILE ON SIGNUP
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_username TEXT;
    v_display_name TEXT;
    v_avatar_url TEXT;
BEGIN
    SET search_path = public;
    
    -- Extract metadata with fallbacks
    v_display_name := COALESCE(NULLIF(NEW.raw_user_meta_data->>'display_name', ''), NEW.raw_user_meta_data->>'full_name', 'Usuario');
    v_avatar_url := COALESCE(NULLIF(NEW.raw_user_meta_data->>'avatar_url', ''), 'https://api.dicebear.com/7.x/avataaars/svg?seed=' || NEW.id);
    
    -- Generate username from email or metadata
    v_username := LOWER(COALESCE(
        NULLIF(NEW.raw_user_meta_data->>'username', ''),
        SPLIT_PART(NEW.email, '@', 1) || '_' || SUBSTR(NEW.id::text, 1, 4)
    ));

    INSERT INTO public.profiles (id, email, username, display_name, avatar_url)
    VALUES (NEW.id, NEW.email, v_username, v_display_name, v_avatar_url)
    ON CONFLICT (id) DO NOTHING;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- STATS: LIKES COUNT
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_like_change ON public.likes;
CREATE TRIGGER on_like_change
    AFTER INSERT OR DELETE ON public.likes
    FOR EACH ROW EXECUTE FUNCTION public.handle_post_likes();

-- STATS: COMMENTS COUNT
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_comment_change ON public.comments;
CREATE TRIGGER on_comment_change
    AFTER INSERT OR DELETE ON public.comments
    FOR EACH ROW EXECUTE FUNCTION public.handle_post_comments();

-- STATS: FOLLOWS COUNT
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_follow_change ON public.follows;
CREATE TRIGGER on_follow_change
    AFTER INSERT OR DELETE ON public.follows
    FOR EACH ROW EXECUTE FUNCTION public.handle_follow_stats();

-- CHAT: LAST MESSAGE UPDATE
CREATE OR REPLACE FUNCTION public.update_conversation_info()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.conversations
    SET 
        last_message = NEW.content,
        last_message_at = NEW.created_at
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_message_insert ON public.messages;
CREATE TRIGGER on_message_insert
    AFTER INSERT ON public.messages
    FOR EACH ROW EXECUTE FUNCTION public.update_conversation_info();

-- 4. RPCs
-- ATOMIC CHAT CREATION
CREATE OR REPLACE FUNCTION public.create_chat_atomic(p_participant_ids UUID[])
RETURNS UUID AS $$
DECLARE
    v_conversation_id UUID;
    v_participant_id UUID;
BEGIN
    INSERT INTO public.conversations (last_message_at) VALUES (NOW()) RETURNING id INTO v_conversation_id;
    
    FOREACH v_participant_id IN ARRAY p_participant_ids
    LOOP
        INSERT INTO public.conversation_participants (conversation_id, user_id)
        VALUES (v_conversation_id, v_participant_id);
    END LOOP;
    
    RETURN v_conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.create_conversation_with_participants(p_participant_ids UUID[])
RETURNS UUID AS $$
BEGIN
    RETURN public.create_chat_atomic(p_participant_ids);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ATOMIC VIEW RECORDING
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. VIEWS
CREATE OR REPLACE VIEW public.posts_with_profiles AS
SELECT 
    p.*, 
    pr.username, 
    pr.display_name, 
    pr.avatar_url, 
    pr.is_verified
FROM public.posts p
JOIN public.profiles pr ON p.user_id = pr.id;

-- 6. REALTIME
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE 
    public.posts, 
    public.likes, 
    public.comments, 
    public.messages, 
    public.notifications, 
    public.profiles,
    public.follows,
    public.conversations,
    public.conversation_participants;
COMMIT;

-- 7. BACKFILL
INSERT INTO public.profiles (id, email, username, display_name, avatar_url)
SELECT 
    id, 
    email,
    LOWER(COALESCE(NULLIF(raw_user_meta_data->>'username', ''), SPLIT_PART(email, '@', 1) || '_' || SUBSTR(id::text, 1, 4))),
    COALESCE(NULLIF(raw_user_meta_data->>'display_name', ''), NULLIF(raw_user_meta_data->>'full_name', ''), 'Usuario'),
    COALESCE(NULLIF(raw_user_meta_data->>'avatar_url', ''), 'https://api.dicebear.com/7.x/avataaars/svg?seed=' || id)
FROM auth.users
ON CONFLICT (id) DO NOTHING;

