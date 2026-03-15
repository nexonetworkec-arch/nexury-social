-- SYSTEM MODULE (TOKENS, SETTINGS, REPORTS, BLOCKS)

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

-- RLS
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

-- CLEANUP POLICIES
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "push_tokens_manage_self" ON public.push_tokens;
    DROP POLICY IF EXISTS "app_settings_read_all" ON public.app_settings;
    DROP POLICY IF EXISTS "app_settings_update_admin" ON public.app_settings;
    DROP POLICY IF EXISTS "user_reports_insert_auth" ON public.user_reports;
    DROP POLICY IF EXISTS "user_reports_read_self_admin" ON public.user_reports;
    DROP POLICY IF EXISTS "user_blocks_manage_self" ON public.user_blocks;
END $$;

-- POLICIES
CREATE POLICY "push_tokens_manage_self" ON public.push_tokens FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "app_settings_read_all" ON public.app_settings FOR SELECT USING (true);
CREATE POLICY "app_settings_update_admin" ON public.app_settings FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (is_admin = true OR is_super_admin = true))
);

-- INITIAL SETTINGS
INSERT INTO public.app_settings (id, maintenance_mode, registrations_open)
VALUES ('global', false, true)
ON CONFLICT (id) DO NOTHING;
CREATE POLICY "user_reports_insert_auth" ON public.user_reports FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "user_reports_read_self_admin" ON public.user_reports FOR SELECT USING (auth.uid() = reporter_id OR (SELECT is_admin FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "user_blocks_manage_self" ON public.user_blocks FOR ALL USING (auth.uid() = blocker_id);
