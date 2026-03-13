-- NEXUS SOCIAL - MÓDULO 03: CITAS Y NEGOCIO
-- Propósito: Gestión de citas entre usuarios.

-- 1. TABLA DE CITAS
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

-- 2. RLS
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Limpieza de políticas (CORREGIDO PARA EVITAR ERROR NULL)
DO $$ 
DECLARE
    pol_cmd TEXT;
BEGIN
    SELECT string_agg('DROP POLICY IF EXISTS ' || quote_ident(policyname) || ' ON ' || quote_ident(tablename) || ';', ' ')
    INTO pol_cmd
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename IN ('appointments');

    IF pol_cmd IS NOT NULL THEN
        EXECUTE pol_cmd;
    END IF;
END $$;

-- Políticas Citas
CREATE POLICY "Lectura de citas propias" ON public.appointments FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = receiver_id);
CREATE POLICY "Creación de citas" ON public.appointments FOR INSERT WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "Actualización de citas propias" ON public.appointments FOR UPDATE USING (auth.uid() = requester_id OR auth.uid() = receiver_id);

-- 3. ÍNDICES DE RENDIMIENTO
CREATE INDEX IF NOT EXISTS idx_appointments_requester ON public.appointments(requester_id);
CREATE INDEX IF NOT EXISTS idx_appointments_receiver ON public.appointments(receiver_id);
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON public.posts(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON public.comments(post_id);
