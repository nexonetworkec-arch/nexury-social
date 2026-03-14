-- NEXURY SOCIAL - MASTER DATABASE SETUP SCRIPT
-- Purpose: Complete database schema, security rules (RLS), triggers, and storage configuration.
-- Language: English (as requested for Supabase/Firebase compatibility)

-- ===============================================================
-- 0. EXTENSIONS
-- ===============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===============================================================
-- 1. CORE TABLES (Identity & Profiles)
-- ===============================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  is_super_admin BOOLEAN DEFAULT FALSE,
  is_verified BOOLEAN DEFAULT FALSE,
  is_blocked BOOLEAN DEFAULT FALSE,
  is_online BOOLEAN DEFAULT FALSE,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  followers_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  total_likes_received INTEGER DEFAULT 0,
  permissions JSONB DEFAULT '{
    "can_manage_users": true,
    "can_manage_posts": true,
    "can_manage_appointments": true,
    "can_view_stats": true,
    "can_manage_settings": false
  }'::JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ===============================================================
-- 2. SOCIAL MODULE (Posts, Comments, Likes, Follows)
-- ===============================================================

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

CREATE TABLE IF NOT EXISTS public.bookmarks (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  PRIMARY KEY (user_id, post_id)
);

-- ===============================================================
-- 3. MESSAGING MODULE (Conversations & Messages)
-- ===============================================================

CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  last_message TEXT,
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.conversation_participants (
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ===============================================================
-- 4. BUSINESS & UTILITY MODULES (Appointments, Ads, Notifications)
-- ===============================================================

CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  receiver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  appointment_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  from_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL, -- 'like', 'comment', 'follow', 'appointment'
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  title TEXT,
  content TEXT,
  link TEXT,
  read INTEGER DEFAULT 0, -- 0: unread, 1: read
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.ads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  target_url TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.verified_benefits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    icon_name TEXT NOT NULL DEFAULT 'Star',
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.verified_benefits_users (
    benefit_id UUID REFERENCES public.verified_benefits(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (benefit_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.post_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(post_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.push_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  token TEXT NOT NULL,
  device_type TEXT DEFAULT 'web',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id, token)
);

CREATE TABLE IF NOT EXISTS public.app_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  maintenance_mode BOOLEAN DEFAULT FALSE,
  registrations_open BOOLEAN DEFAULT TRUE,
  email_notifications BOOLEAN DEFAULT TRUE,
  ai_moderation BOOLEAN DEFAULT TRUE,
  smart_feed_enabled BOOLEAN DEFAULT TRUE,
  verified_boost NUMERIC DEFAULT 1.5,
  admin_boost NUMERIC DEFAULT 3.0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  CONSTRAINT single_row CHECK (id = 1)
);

-- Insert default settings
INSERT INTO public.app_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- ===============================================================
-- 5. VIEWS
-- ===============================================================

CREATE OR REPLACE VIEW public.posts_with_profiles AS
SELECT 
    p.*, 
    pr.username, 
    pr.display_name, 
    pr.avatar_url, 
    pr.is_verified
FROM public.posts p
JOIN public.profiles pr ON p.user_id = pr.id;

-- ===============================================================
-- 6. SECURITY FUNCTIONS (Admin & SuperAdmin)
-- ===============================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND (is_admin = TRUE OR is_super_admin = TRUE)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND is_super_admin = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===============================================================
-- 7. TRIGGERS & AUTOMATION
-- ===============================================================

-- A. Automatic Profile Creation on Signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  base_username TEXT;
  final_username TEXT;
BEGIN
  base_username := LOWER(SPLIT_PART(NEW.email, '@', 1));
  IF base_username = '' OR base_username IS NULL THEN base_username := 'user'; END IF;
  final_username := base_username || SUBSTRING(NEW.id::TEXT, 1, 4);

  INSERT INTO public.profiles (id, email, username, display_name, avatar_url, is_super_admin)
  VALUES (
    NEW.id,
    NEW.email,
    final_username,
    COALESCE(NEW.raw_user_meta_data->>'display_name', base_username),
    'https://api.dicebear.com/7.x/avataaars/svg?seed=' || NEW.id,
    (NEW.email = 'salitroso07@gmail.com') -- Bootstrap Super Admin
  ) ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- B. Post Counters (Likes & Comments)
CREATE OR REPLACE FUNCTION handle_post_counters() RETURNS TRIGGER AS $$
BEGIN
  IF (TG_TABLE_NAME = 'likes') THEN
    IF (TG_OP = 'INSERT') THEN
      UPDATE public.posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
    ELSIF (TG_OP = 'DELETE') THEN
      UPDATE public.posts SET likes_count = likes_count - 1 WHERE id = OLD.post_id;
    END IF;
  ELSIF (TG_TABLE_NAME = 'comments') THEN
    IF (TG_OP = 'INSERT') THEN
      UPDATE public.posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
    ELSIF (TG_OP = 'DELETE') THEN
      UPDATE public.posts SET comments_count = comments_count - 1 WHERE id = OLD.post_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_like_change ON public.likes;
CREATE TRIGGER on_like_change AFTER INSERT OR DELETE ON public.likes FOR EACH ROW EXECUTE PROCEDURE handle_post_counters();

DROP TRIGGER IF EXISTS on_comment_change ON public.comments;
CREATE TRIGGER on_comment_change AFTER INSERT OR DELETE ON public.comments FOR EACH ROW EXECUTE PROCEDURE handle_post_counters();

-- C. Profile Counters (Followers & Total Likes)
CREATE OR REPLACE FUNCTION handle_profile_stats() RETURNS TRIGGER AS $$
DECLARE
  post_author_id UUID;
BEGIN
  IF (TG_TABLE_NAME = 'follows') THEN
    IF (TG_OP = 'INSERT') THEN
      UPDATE public.profiles SET followers_count = followers_count + 1 WHERE id = NEW.following_id;
      UPDATE public.profiles SET following_count = following_count + 1 WHERE id = NEW.follower_id;
    ELSIF (TG_OP = 'DELETE') THEN
      UPDATE public.profiles SET followers_count = followers_count - 1 WHERE id = OLD.following_id;
      UPDATE public.profiles SET following_count = following_count - 1 WHERE id = OLD.follower_id;
    END IF;
  ELSIF (TG_TABLE_NAME = 'likes') THEN
    IF (TG_OP = 'INSERT') THEN
      SELECT user_id INTO post_author_id FROM public.posts WHERE id = NEW.post_id;
      UPDATE public.profiles SET total_likes_received = total_likes_received + 1 WHERE id = post_author_id;
    ELSIF (TG_OP = 'DELETE') THEN
      SELECT user_id INTO post_author_id FROM public.posts WHERE id = OLD.post_id;
      UPDATE public.profiles SET total_likes_received = total_likes_received - 1 WHERE id = post_author_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_follow_change_stats ON public.follows;
CREATE TRIGGER on_follow_change_stats AFTER INSERT OR DELETE ON public.follows FOR EACH ROW EXECUTE PROCEDURE handle_profile_stats();

DROP TRIGGER IF EXISTS on_like_change_profile_stats ON public.likes;
CREATE TRIGGER on_like_change_profile_stats AFTER INSERT OR DELETE ON public.likes FOR EACH ROW EXECUTE PROCEDURE handle_profile_stats();

-- D. Chat Updates
CREATE OR REPLACE FUNCTION public.update_conversation_last_message()
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

DROP TRIGGER IF EXISTS on_new_message_update_info ON public.messages;
CREATE TRIGGER on_new_message_update_info
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE PROCEDURE public.update_conversation_last_message();

-- ===============================================================
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- ===============================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verified_benefits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verified_benefits_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins have full access to profiles" ON public.profiles FOR ALL USING (public.is_admin());

-- Posts
CREATE POLICY "Posts are viewable by everyone" ON public.posts FOR SELECT USING (true);
CREATE POLICY "Users can create posts" ON public.posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own posts" ON public.posts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users or Admins can delete posts" ON public.posts FOR DELETE USING (auth.uid() = user_id OR public.is_admin());

-- Comments
CREATE POLICY "Comments are viewable by everyone" ON public.comments FOR SELECT USING (true);
CREATE POLICY "Users can create comments" ON public.comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users or Admins can delete comments" ON public.comments FOR DELETE USING (auth.uid() = user_id OR public.is_admin());

-- Likes, Follows, Bookmarks
CREATE POLICY "Users can manage own likes" ON public.likes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own follows" ON public.follows FOR ALL USING (auth.uid() = follower_id);
CREATE POLICY "Users can manage own bookmarks" ON public.bookmarks FOR ALL USING (auth.uid() = user_id);

-- Chat (Swiss Watch Anti-Recursion Logic)
CREATE POLICY "Participants are viewable by authenticated users" ON public.conversation_participants FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can join conversations" ON public.conversation_participants FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can view their conversations" ON public.conversations FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.conversation_participants WHERE conversation_id = id AND user_id = auth.uid())
);
CREATE POLICY "Authenticated users can start conversations" ON public.conversations FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can read their messages" ON public.messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.conversation_participants WHERE conversation_id = messages.conversation_id AND user_id = auth.uid())
);
CREATE POLICY "Users can send messages" ON public.messages FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Appointments
CREATE POLICY "Users can view their appointments" ON public.appointments FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = receiver_id);
CREATE POLICY "Users can create appointments" ON public.appointments FOR INSERT WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "Users can update their appointments" ON public.appointments FOR UPDATE USING (auth.uid() = requester_id OR auth.uid() = receiver_id);

-- Notifications
CREATE POLICY "Users can view their notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Authenticated users can create notifications" ON public.notifications FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can manage their own notifications" ON public.notifications FOR ALL USING (auth.uid() = user_id);

-- Ads
CREATE POLICY "Active ads are viewable by everyone" ON public.ads FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage ads" ON public.ads FOR ALL USING (public.is_admin());
CREATE POLICY "Users can update ad metrics" ON public.ads FOR UPDATE USING (true) WITH CHECK (true);

-- Verified Benefits
CREATE POLICY "Active benefits are viewable by everyone" ON public.verified_benefits FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage benefits" ON public.verified_benefits FOR ALL USING (public.is_admin());

-- Post Views
CREATE POLICY "Post views are viewable by everyone" ON public.post_views FOR SELECT USING (true);
CREATE POLICY "Users can record views" ON public.post_views FOR INSERT WITH CHECK (true);

-- Push Tokens
CREATE POLICY "Users can manage their push tokens" ON public.push_tokens FOR ALL USING (auth.uid() = user_id);

-- App Settings
CREATE POLICY "Public read access for app_settings" ON public.app_settings FOR SELECT USING (true);
CREATE POLICY "Admins can update app_settings" ON public.app_settings FOR UPDATE USING (public.is_admin());

-- ===============================================================
-- 9. STORAGE BUCKETS & POLICIES
-- ===============================================================

-- Create buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('posts', 'posts', true) ON CONFLICT (id) DO NOTHING;

-- Avatars Policies
CREATE POLICY "Public Access to Avatars" ON storage.objects FOR SELECT USING ( bucket_id = 'avatars' );
CREATE POLICY "Users can upload avatars" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'avatars' AND auth.role() = 'authenticated' );
CREATE POLICY "Users can update avatars" ON storage.objects FOR UPDATE USING ( bucket_id = 'avatars' AND auth.role() = 'authenticated' );

-- Posts Policies
CREATE POLICY "Public Access to Post Media" ON storage.objects FOR SELECT USING ( bucket_id = 'posts' );
CREATE POLICY "Users can upload post media" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'posts' AND auth.role() = 'authenticated' );
CREATE POLICY "Users can manage their post media" ON storage.objects FOR ALL USING ( bucket_id = 'posts' AND auth.role() = 'authenticated' );

-- ===============================================================
-- 10. REALTIME CONFIGURATION
-- ===============================================================

BEGIN;
  -- Drop publication if exists to recreate
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime;
COMMIT;

ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.likes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- ===============================================================
-- 11. RPC FUNCTIONS
-- ===============================================================

CREATE OR REPLACE FUNCTION public.record_unique_view(p_post_id UUID, p_user_id UUID DEFAULT NULL)
RETURNS VOID AS $$
BEGIN
  -- Insert view if it doesn't exist (unique by post_id and user_id/ip-placeholder)
  -- For simplicity in this script, we use user_id. If user_id is null, we could use IP but that's harder in SQL.
  -- The app currently sends auth.uid()
  IF p_user_id IS NOT NULL THEN
    INSERT INTO public.post_views (post_id, user_id)
    VALUES (p_post_id, p_user_id)
    ON CONFLICT DO NOTHING;
    
    -- Update post counter
    IF FOUND THEN
      UPDATE public.posts SET views_count = views_count + 1 WHERE id = p_post_id;
    END IF;
  ELSE
    -- Anonymous view
    UPDATE public.posts SET views_count = views_count + 1 WHERE id = p_post_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.record_ad_impression(p_ad_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.ads SET impressions = impressions + 1 WHERE id = p_ad_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.record_ad_click(p_ad_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.ads SET clicks = clicks + 1 WHERE id = p_ad_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===============================================================
-- 12. INITIAL DATA BOOTSTRAP
-- ===============================================================

INSERT INTO public.verified_benefits (slug, name, description, icon_name, is_active)
VALUES 
('prioritized_support', 'Soporte Prioritario', 'Atención al cliente 24/7 con respuesta en menos de 1 hora.', 'Headphones', true),
('exclusive_badge', 'Insignia Dorada', 'Distintivo exclusivo en tu perfil que resalta tu estatus verificado.', 'Award', true),
('hd_video', 'Video HD', 'Capacidad para subir videos en alta resolución (1080p).', 'Video', true),
('no_ads', 'Sin Publicidad', 'Navegación fluida sin anuncios en toda la plataforma.', 'ShieldOff', true),
('custom_themes', 'Temas Personalizados', 'Acceso a paletas de colores y temas exclusivos para tu perfil.', 'Palette', true),
('appointments', 'Sistema de Citas', 'Permite que otros usuarios soliciten citas directamente desde tus publicaciones y perfil.', 'Calendar', true)
ON CONFLICT (slug) DO NOTHING;
