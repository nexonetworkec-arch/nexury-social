-- NEXUS SOCIAL - MÓDULO 12: TABLAS ADICIONALES (NOTIFICACIONES, MARCADORES, VISTAS)
-- Propósito: Completar el esquema para notificaciones, favoritos y métricas de vistas.

-- 1. TABLA DE NOTIFICACIONES
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  from_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL, -- 'like', 'comment', 'follow', 'appointment'
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  title TEXT, -- Título para notificaciones push
  content TEXT, -- Cuerpo del mensaje
  link TEXT, -- URL a la que redirigir al pulsar
  read INTEGER DEFAULT 0, -- 0: no leído, 1: leído
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. TABLA DE MARCADORES (BOOKMARKS)
CREATE TABLE IF NOT EXISTS public.bookmarks (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  PRIMARY KEY (user_id, post_id)
);

-- 3. TABLA DE VISTAS DE POSTS
CREATE TABLE IF NOT EXISTS public.post_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE, -- Opcional para vistas anónimas
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. HABILITAR RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_views ENABLE ROW LEVEL SECURITY;

-- 5. POLÍTICAS
-- Notificaciones: Solo el dueño puede ver y marcar como leídas
DROP POLICY IF EXISTS "Gestión de notificaciones propias" ON public.notifications;
CREATE POLICY "Gestión de notificaciones propias" 
ON public.notifications FOR ALL 
USING (auth.uid() = user_id);

-- Marcadores: Solo el dueño puede gestionar sus marcadores
DROP POLICY IF EXISTS "Gestión de marcadores propios" ON public.bookmarks;
CREATE POLICY "Gestión de marcadores propios" 
ON public.bookmarks FOR ALL 
USING (auth.uid() = user_id);

-- Vistas: Lectura pública (para conteo), Inserción permitida
DROP POLICY IF EXISTS "Lectura pública de vistas" ON public.post_views;
CREATE POLICY "Lectura pública de vistas" ON public.post_views FOR SELECT USING (true);

DROP POLICY IF EXISTS "Inserción de vistas" ON public.post_views;
CREATE POLICY "Inserción de vistas" ON public.post_views FOR INSERT WITH CHECK (true);

-- 6. FUNCIONES RPC ADICIONALES
-- Función para registrar vista única (evitar duplicados en corto tiempo)
CREATE OR REPLACE FUNCTION public.record_unique_view(p_viewer_id UUID, p_target_id UUID, p_target_type TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  IF p_target_type = 'post' THEN
    IF EXISTS (SELECT 1 FROM public.post_views WHERE post_id = p_target_id AND user_id = p_viewer_id AND created_at > NOW() - INTERVAL '24 hours') THEN
      RETURN FALSE;
    END IF;
    
    INSERT INTO public.post_views (post_id, user_id) VALUES (p_target_id, p_viewer_id);
    
    -- Actualizar contador en la tabla posts
    UPDATE public.posts SET views_count = views_count + 1 WHERE id = p_target_id;
    RETURN TRUE;
  END IF;
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
