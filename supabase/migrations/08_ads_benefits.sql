-- ADS & BENEFITS MODULE

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
    name TEXT NOT NULL,
    slug TEXT UNIQUE,
    description TEXT,
    icon_name TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- VERIFIED BENEFITS USERS
CREATE TABLE IF NOT EXISTS public.verified_benefits_users (
    benefit_id UUID REFERENCES public.verified_benefits(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    activated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (benefit_id, user_id)
);

-- RLS
ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verified_benefits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verified_benefits_users ENABLE ROW LEVEL SECURITY;

-- CLEANUP POLICIES
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "ads_read_all" ON public.ads;
    DROP POLICY IF EXISTS "benefits_read_all" ON public.verified_benefits;
    DROP POLICY IF EXISTS "benefits_users_read_self" ON public.verified_benefits_users;
END $$;

-- POLICIES
CREATE POLICY "ads_read_all" ON public.ads FOR SELECT USING (true);
CREATE POLICY "benefits_read_all" ON public.verified_benefits FOR SELECT USING (true);
CREATE POLICY "benefits_users_read_self" ON public.verified_benefits_users FOR SELECT USING (auth.uid() = user_id);
