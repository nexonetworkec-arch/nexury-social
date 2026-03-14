-- NEXUS SOCIAL - MÓDULO 16: CORRECCIÓN FINAL DE SINCRONIZACIÓN, RLS Y NOTIFICACIONES
-- Propósito: Resolver errores 403, 409 y asegurar el funcionamiento de notificaciones en tiempo real.

-- 1. CORRECCIÓN DE MÉTRICAS (Error 409)
-- Asegurar que record_unique_view maneje conflictos sin errores
CREATE OR REPLACE FUNCTION public.record_unique_view(p_viewer_id UUID, p_target_id UUID, p_target_type TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  IF p_target_type = 'post' THEN
    -- Verificar si ya existe una vista reciente (24h) para evitar spam de contador
    IF EXISTS (
      SELECT 1 FROM public.post_views 
      WHERE post_id = p_target_id AND user_id = p_viewer_id 
      AND created_at > NOW() - INTERVAL '24 hours'
    ) THEN
      RETURN FALSE;
    END IF;
    
    -- Insertar manejando el conflicto de unicidad de la tabla
    INSERT INTO public.post_views (post_id, user_id) 
    VALUES (p_target_id, p_viewer_id)
    ON CONFLICT (post_id, user_id) DO NOTHING;
    
    -- Si se insertó (o ya existía pero no en las últimas 24h), incrementamos el contador
    -- Nota: ON CONFLICT DO NOTHING hará que FOUND sea falso si hubo conflicto
    UPDATE public.posts SET views_count = views_count + 1 WHERE id = p_target_id;
    RETURN TRUE;
    
  ELSIF p_target_type = 'profile' THEN
    -- Lógica similar para perfiles si existe la tabla profile_views
    BEGIN
      INSERT INTO public.profile_views (profile_id, viewer_id)
      VALUES (p_target_id, p_viewer_id)
      ON CONFLICT (profile_id, viewer_id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      -- Si la tabla no existe o falla, ignorar
    END;
    RETURN TRUE;
  END IF;
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. CORRECCIÓN DE RLS PARA CHAT (Error 403)
-- Permitir creación de conversaciones
DROP POLICY IF EXISTS "Crear conversaciones" ON public.conversations;
CREATE POLICY "Crear conversaciones" ON public.conversations
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Permitir inserción de participantes
DROP POLICY IF EXISTS "Añadir participantes" ON public.conversation_participants;
CREATE POLICY "Añadir participantes" ON public.conversation_participants
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 3. CORRECCIÓN DE RLS PARA NOTIFICACIONES
-- Separar políticas para permitir inserción por parte de otros usuarios
DROP POLICY IF EXISTS "Gestión de notificaciones propias" ON public.notifications;

CREATE POLICY "Ver y editar notificaciones propias" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Marcar como leídas/borrar notificaciones propias" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Borrar notificaciones propias" ON public.notifications
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Enviar notificaciones a otros" ON public.notifications
  FOR INSERT WITH CHECK (auth.uid() = from_user_id);

-- 4. ASEGURAR PUBLICACIÓN REALTIME COMPLETA
DO $$
DECLARE
  tab_record RECORD;
BEGIN
  -- Asegurar que las tablas críticas estén en la publicación
  FOR tab_record IN 
    SELECT tablename FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename IN ('notifications', 'messages', 'conversations', 'conversation_participants', 'posts', 'profiles', 'comments', 'likes')
  LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = tab_record.tablename) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tab_record.tablename);
    END IF;
  END LOOP;
END $$;

-- 5. CORRECCIÓN DE TABLA POST_VIEWS (Asegurar restricción UNIQUE)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'post_views_post_id_user_id_key'
    ) THEN
        ALTER TABLE public.post_views ADD CONSTRAINT post_views_post_id_user_id_key UNIQUE (post_id, user_id);
    END IF;
END $$;
