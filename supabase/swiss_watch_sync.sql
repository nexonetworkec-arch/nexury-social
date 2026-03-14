-- NEXURY SOCIAL - INTEGRAL SYNCHRONIZATION SCRIPT ("Reloj Suizo")
-- Purpose: Fix RLS recursion, enable real-time, and ensure perfect sync between App and Supabase.
-- Version: 2.0 (Anti-Recursion Fix)

-- 1. MASTER RESET (Security Cleanup)
-- Enable RLS on all ecosystem tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verified_benefits ENABLE ROW LEVEL SECURITY;

-- Delete absolutely all previous policies to avoid "noise"
DO $$ 
DECLARE r record;
BEGIN
    FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') 
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
    END LOOP;
END $$;

-- 2. IDENTITY CORE (Profiles)
CREATE POLICY "profiles_read_all" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_self_update" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 3. SOCIAL SYSTEM (Posts, Likes, Follows, Comments)
-- Posts
CREATE POLICY "posts_read_all" ON public.posts FOR SELECT USING (true);
CREATE POLICY "posts_self_manage" ON public.posts FOR ALL USING (auth.uid() = user_id);

-- Likes
CREATE POLICY "likes_read_all" ON public.likes FOR SELECT USING (true);
CREATE POLICY "likes_self_manage" ON public.likes FOR ALL USING (auth.uid() = user_id);

-- Follows
CREATE POLICY "follows_read_all" ON public.follows FOR SELECT USING (true);
CREATE POLICY "follows_self_manage" ON public.follows FOR ALL USING (auth.uid() = follower_id);

-- Comments
CREATE POLICY "comments_read_all" ON public.comments FOR SELECT USING (true);
CREATE POLICY "comments_self_manage" ON public.comments FOR ALL USING (auth.uid() = user_id);

-- 4. COMMUNICATION ENGINE (Conversations & Messages) - ANTI-RECURSION
-- Participants: The base of everything. Allows seeing who participates in your chats.
-- We use a simplified rule to avoid infinite recursion.
CREATE POLICY "participants_select_safe" ON public.conversation_participants 
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "participants_insert_safe" ON public.conversation_participants 
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Conversations: Allows seeing the "room" if you are part of it.
CREATE POLICY "conversations_select_safe" ON public.conversations 
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants 
    WHERE conversation_id = public.conversations.id 
    AND user_id = auth.uid()
  )
);

CREATE POLICY "conversations_insert_safe" ON public.conversations 
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Messages: Allows reading if you are in the conversation and sending if it's you.
CREATE POLICY "messages_select_safe" ON public.messages 
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants 
    WHERE conversation_id = public.messages.conversation_id 
    AND user_id = auth.uid()
  )
);

CREATE POLICY "messages_insert_self" ON public.messages 
FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- 5. ALERT SYSTEM (Notifications)
-- Reading: Only the recipient.
CREATE POLICY "notifications_read_self" ON public.notifications FOR SELECT 
USING (auth.uid() = user_id);

-- Insertion: Any authenticated user can notify another (e.g., when liking or following).
CREATE POLICY "notifications_insert_auth" ON public.notifications FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- Deletion/Update: Only the owner.
CREATE POLICY "notifications_manage_self" ON public.notifications FOR ALL 
USING (auth.uid() = user_id);

-- 6. UTILITIES (Benefits)
CREATE POLICY "benefits_read_all" ON public.verified_benefits FOR SELECT USING (true);

-- 7. REALTIME SYNCHRONIZATION (VITAL!)
-- This ensures Supabase sends changes to the app instantly.
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
    public.conversation_participants;
COMMIT;
