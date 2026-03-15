-- LIVE MODULE

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

-- RLS
ALTER TABLE public.live_streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_messages ENABLE ROW LEVEL SECURITY;

-- CLEANUP POLICIES
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "live_streams_read_all" ON public.live_streams;
    DROP POLICY IF EXISTS "live_streams_self_manage" ON public.live_streams;
    DROP POLICY IF EXISTS "live_messages_read_all" ON public.live_messages;
    DROP POLICY IF EXISTS "live_messages_insert_auth" ON public.live_messages;
END $$;

-- POLICIES
CREATE POLICY "live_streams_read_all" ON public.live_streams FOR SELECT USING (true);
CREATE POLICY "live_streams_self_manage" ON public.live_streams FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "live_messages_read_all" ON public.live_messages FOR SELECT USING (true);
CREATE POLICY "live_messages_insert_auth" ON public.live_messages FOR INSERT WITH CHECK (auth.role() = 'authenticated');
