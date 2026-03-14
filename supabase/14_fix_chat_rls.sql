-- NEXUS SOCIAL - MÓDULO 14: CORRECCIÓN DE POLÍTICAS DE CHAT Y REALTIME
-- Propósito: Permitir la actualización de mensajes (marcar como leídos) y conversaciones (último mensaje),
-- y asegurar que las notificaciones se actualicen en tiempo real.

-- 1. POLÍTICAS PARA LA TABLA MESSAGES
DROP POLICY IF EXISTS "Actualizar mensajes de mis chats" ON public.messages;
CREATE POLICY "Actualizar mensajes de mis chats" ON public.messages
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants
      WHERE conversation_id = public.messages.conversation_id AND user_id = auth.uid()
    )
  );

-- 2. POLÍTICAS PARA LA TABLA CONVERSATIONS
DROP POLICY IF EXISTS "Actualizar mis conversaciones" ON public.conversations;
CREATE POLICY "Actualizar mis conversaciones" ON public.conversations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants
      WHERE conversation_id = public.conversations.id AND user_id = auth.uid()
    )
  );

-- 3. ASEGURAR REALTIME PARA NOTIFICACIONES Y CONVERSACIONES
DO $$
BEGIN
  -- Notificaciones
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'notifications') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
  
  -- Participantes (para detectar nuevos chats)
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'conversation_participants') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_participants;
  END IF;
END $$;
