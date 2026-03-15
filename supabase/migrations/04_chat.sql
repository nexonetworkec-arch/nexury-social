-- CHAT MODULE (CONVERSATIONS, MESSAGES)

-- CONVERSATIONS
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    last_message TEXT,
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CONVERSATION PARTICIPANTS
CREATE TABLE IF NOT EXISTS public.conversation_participants (
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (conversation_id, user_id)
);

-- MESSAGES
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
    sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    receiver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    is_deleted_for_everyone BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- POLICIES
CREATE POLICY "participants_select_safe" ON public.conversation_participants FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "participants_insert_safe" ON public.conversation_participants FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "participants_delete_self" ON public.conversation_participants FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "conversations_select_safe" ON public.conversations FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.conversation_participants WHERE conversation_id = id AND user_id = auth.uid()));
CREATE POLICY "conversations_insert_safe" ON public.conversations FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "conversations_update_safe" ON public.conversations FOR UPDATE 
USING (EXISTS (SELECT 1 FROM public.conversation_participants WHERE conversation_id = id AND user_id = auth.uid()));

CREATE POLICY "messages_select_safe" ON public.messages FOR SELECT 
USING (auth.uid() = sender_id OR auth.uid() = receiver_id OR EXISTS (SELECT 1 FROM public.conversation_participants WHERE conversation_id = messages.conversation_id AND user_id = auth.uid()));
CREATE POLICY "messages_insert_self" ON public.messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "messages_update_self" ON public.messages FOR UPDATE USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- TRIGGERS
CREATE OR REPLACE FUNCTION public.update_conversation_info()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.conversations
    SET 
        last_message = NEW.content,
        last_message_at = NEW.created_at
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_message_insert ON public.messages;
CREATE TRIGGER on_message_insert AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.update_conversation_info();

-- CLEANUP ORPHAN CONVERSATIONS
CREATE OR REPLACE FUNCTION public.clean_orphan_conversations()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.conversation_participants WHERE conversation_id = OLD.conversation_id) THEN
    DELETE FROM public.messages WHERE conversation_id = OLD.conversation_id;
    DELETE FROM public.conversations WHERE id = OLD.conversation_id;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_clean_orphans ON public.conversation_participants;
CREATE TRIGGER trigger_clean_orphans
AFTER DELETE ON public.conversation_participants
FOR EACH ROW EXECUTE FUNCTION public.clean_orphan_conversations();

-- RPCs
CREATE OR REPLACE FUNCTION public.create_chat_atomic(p_participant_ids UUID[])
RETURNS UUID AS $$
DECLARE
    v_conversation_id UUID;
    v_participant_id UUID;
BEGIN
    INSERT INTO public.conversations (last_message_at) VALUES (NOW()) RETURNING id INTO v_conversation_id;
    
    FOREACH v_participant_id IN ARRAY p_participant_ids
    LOOP
        INSERT INTO public.conversation_participants (conversation_id, user_id)
        VALUES (v_conversation_id, v_participant_id);
    END LOOP;
    
    RETURN v_conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.create_conversation_with_participants(p_participant_ids UUID[])
RETURNS UUID AS $$
BEGIN
    RETURN public.create_chat_atomic(p_participant_ids);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
