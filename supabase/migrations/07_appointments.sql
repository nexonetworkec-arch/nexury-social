-- APPOINTMENTS MODULE
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

-- RLS
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- CLEANUP POLICIES
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "appointments_self_manage" ON public.appointments;
END $$;

-- POLICIES
CREATE POLICY "appointments_self_manage" ON public.appointments FOR ALL USING (auth.uid() = requester_id OR auth.uid() = receiver_id);
