-- NEXUS SOCIAL - MÓDULO 10: INTEGRIDAD Y REALTIME INTEGRAL
-- Propósito: Asegurar que todas las interacciones se reflejen en tiempo real en toda la app.

-- 1. HABILITAR REALTIME PARA TABLAS FALTANTES
DO $$
BEGIN
  -- Posts
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'posts') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
  END IF;
  
  -- Comentarios
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'comments') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;
  END IF;
  
  -- Likes
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'likes') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.likes;
  END IF;
END $$;

-- 2. TRIGGER PARA CONTADOR DE COMENTARIOS EN POSTS
CREATE OR REPLACE FUNCTION public.handle_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE public.posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE public.posts SET comments_count = comments_count - 1 WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_comment_change ON public.comments;
CREATE TRIGGER on_comment_change
  AFTER INSERT OR DELETE ON public.comments
  FOR EACH ROW EXECUTE PROCEDURE public.handle_comment_count();

-- 3. MEJORAR TRIGGER DE CONVERSACIONES PARA INCLUIR EL ÚLTIMO MENSAJE
CREATE OR REPLACE FUNCTION public.update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.conversations
  SET 
    last_message = NEW.content,
    last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Reemplazar el trigger anterior si existe
DROP TRIGGER IF EXISTS on_new_message_update_timestamp ON public.messages;
CREATE TRIGGER on_new_message_update_info
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE PROCEDURE public.update_conversation_last_message();

-- 4. VISTA EXTENDIDA PARA POSTS (Asegurar que incluya todos los campos necesarios para el Feed)
-- Ya existe posts_with_profiles, pero nos aseguramos de que sea completa
CREATE OR REPLACE VIEW public.posts_with_profiles AS
SELECT 
    p.*, 
    pr.username, 
    pr.display_name, 
    pr.avatar_url, 
    pr.is_verified
FROM public.posts p
JOIN public.profiles pr ON p.user_id = pr.id;
