-- NEXUS SOCIAL - MÓDULO 13: LIVE STREAMING & MEJORAS DE VISTA
-- Propósito: Soporte para transmisiones en vivo y asegurar que las vistas tengan todos los campos necesarios.

-- 1. EXTENDER TABLA PROFILES
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='is_live') THEN
        ALTER TABLE public.profiles ADD COLUMN is_live BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- 2. TABLA DE TRANSMISIONES EN VIVO
CREATE TABLE IF NOT EXISTS public.live_streams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  viewer_count INTEGER DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  ended_at TIMESTAMP WITH TIME ZONE
);

-- 3. HABILITAR RLS PARA LIVE STREAMS
ALTER TABLE public.live_streams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lectura pública de streams activos" ON public.live_streams;
CREATE POLICY "Lectura pública de streams activos" ON public.live_streams FOR SELECT USING (true);

DROP POLICY IF EXISTS "Usuarios pueden gestionar sus propios streams" ON public.live_streams;
CREATE POLICY "Usuarios pueden gestionar sus propios streams" ON public.live_streams FOR ALL USING (auth.uid() = user_id);

-- 4. ACTUALIZAR VISTA posts_with_profiles
-- Incluimos is_super_admin e is_live para que el frontend no falle al pedirlos
DROP VIEW IF EXISTS public.posts_with_profiles CASCADE;
CREATE OR REPLACE VIEW public.posts_with_profiles AS
SELECT 
    p.*, 
    pr.username, 
    pr.display_name, 
    pr.avatar_url, 
    pr.is_verified,
    pr.is_super_admin,
    pr.is_live
FROM public.posts p
JOIN public.profiles pr ON p.user_id = pr.id;

-- 6. TABLA DE MENSAJES DE CHAT EN VIVO
CREATE TABLE IF NOT EXISTS public.live_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  stream_id UUID REFERENCES public.live_streams(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 7. HABILITAR RLS PARA LIVE MESSAGES
ALTER TABLE public.live_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lectura pública de mensajes de stream" ON public.live_messages;
CREATE POLICY "Lectura pública de mensajes de stream" ON public.live_messages FOR SELECT USING (true);

DROP POLICY IF EXISTS "Usuarios pueden enviar mensajes" ON public.live_messages;
CREATE POLICY "Usuarios pueden enviar mensajes" ON public.live_messages FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 8. HABILITAR REALTIME
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'live_streams') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.live_streams;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'live_messages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.live_messages;
  END IF;
END $$;
