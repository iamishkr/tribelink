-- ═══════════════════════════════════════════════════════════════
-- TribeLink — Migration 013: Realtime Chat, Triggers & Schema Upgrade
-- ═══════════════════════════════════════════════════════════════

-- 1. Enable Supabase Realtime Publication for Chat Tables
DO $$
BEGIN
  -- Add messages table to realtime publication
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chats;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_participants;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN OTHERS THEN NULL;
END $$;

-- 2. Add Voice Notes, Reactions, and Deletion columns to messages
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS reactions JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS audio_url TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS media_duration INT;

-- 3. Add unread_count column to chat_participants
ALTER TABLE public.chat_participants ADD COLUMN IF NOT EXISTS unread_count INT DEFAULT 0;
ALTER TABLE public.chat_participants ADD COLUMN IF NOT EXISTS last_read_at TIMESTAMPTZ DEFAULT NOW();

-- 4. Function & Trigger to update chats.last_message_at on new message
CREATE OR REPLACE FUNCTION public.handle_new_chat_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER AS $$
BEGIN
  -- Update last_message_at on chats table
  UPDATE public.chats
  SET last_message_at = NEW.created_at
  WHERE id = NEW.chat_id;

  -- Increment unread_count for other participants
  UPDATE public.chat_participants
  SET unread_count = COALESCE(unread_count, 0) + 1
  WHERE chat_id = NEW.chat_id AND user_id != NEW.sender_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_chat_message_created ON public.messages;
CREATE TRIGGER on_chat_message_created
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_chat_message();

-- 5. RLS Policies for Chat Module
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Chats RLS
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chats' AND policyname = 'chats_select_participant') THEN
    CREATE POLICY chats_select_participant ON public.chats FOR SELECT
      USING (EXISTS (SELECT 1 FROM public.chat_participants WHERE chat_id = chats.id AND user_id = auth.uid()));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chats' AND policyname = 'chats_insert_auth') THEN
    CREATE POLICY chats_insert_auth ON public.chats FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- Chat Participants RLS
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chat_participants' AND policyname = 'participants_select') THEN
    CREATE POLICY participants_select ON public.chat_participants FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chat_participants' AND policyname = 'participants_insert') THEN
    CREATE POLICY participants_insert ON public.chat_participants FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chat_participants' AND policyname = 'participants_update') THEN
    CREATE POLICY participants_update ON public.chat_participants FOR UPDATE USING (user_id = auth.uid());
  END IF;
END $$;

-- Messages RLS
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'messages_select_participant') THEN
    CREATE POLICY messages_select_participant ON public.messages FOR SELECT
      USING (EXISTS (SELECT 1 FROM public.chat_participants WHERE chat_id = messages.chat_id AND user_id = auth.uid()));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'messages_insert_participant') THEN
    CREATE POLICY messages_insert_participant ON public.messages FOR INSERT
      WITH CHECK (EXISTS (SELECT 1 FROM public.chat_participants WHERE chat_id = messages.chat_id AND user_id = auth.uid()));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'messages_update_owner_or_participant') THEN
    CREATE POLICY messages_update_owner_or_participant ON public.messages FOR UPDATE
      USING (EXISTS (SELECT 1 FROM public.chat_participants WHERE chat_id = messages.chat_id AND user_id = auth.uid()));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'messages_delete_owner') THEN
    CREATE POLICY messages_delete_owner ON public.messages FOR DELETE USING (sender_id = auth.uid());
  END IF;
END $$;

-- 6. Storage Bucket for Chat Media & Audio
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-media', 'chat-media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage Policies for chat-media
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'chat_media_public_read') THEN
    CREATE POLICY chat_media_public_read ON storage.objects FOR SELECT USING (bucket_id = 'chat-media');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'chat_media_auth_insert') THEN
    CREATE POLICY chat_media_auth_insert ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'chat-media' AND auth.uid() IS NOT NULL);
  END IF;
END $$;
