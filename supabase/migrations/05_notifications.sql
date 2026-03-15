-- NOTIFICATIONS MODULE
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

-- RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- CLEANUP POLICIES
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "notifications_read_self" ON public.notifications;
    DROP POLICY IF EXISTS "notifications_insert_auth" ON public.notifications;
    DROP POLICY IF EXISTS "notifications_manage_self" ON public.notifications;
END $$;

-- POLICIES
CREATE POLICY "notifications_read_self" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "notifications_insert_auth" ON public.notifications FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "notifications_manage_self" ON public.notifications FOR ALL USING (auth.uid() = user_id);
