-- REALTIME CONFIGURATION
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE 
    public.posts, 
    public.likes, 
    public.comments, 
    public.messages, 
    public.notifications, 
    public.profiles,
    public.follows,
    public.conversations,
    public.conversation_participants;
COMMIT;
