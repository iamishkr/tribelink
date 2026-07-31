-- ═══════════════════════════════════════════════════════════════
-- TribeLink — Migration 005: Chat & Messages
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE public.chats (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type            TEXT NOT NULL DEFAULT 'direct' CHECK (type IN ('direct','group')),
  name            TEXT,
  avatar_url      TEXT,
  last_message_id UUID,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_by      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.chat_participants (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id    UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role       TEXT DEFAULT 'member' CHECK (role IN ('admin','member')),
  unread_count INTEGER NOT NULL DEFAULT 0,
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (chat_id, user_id)
);

CREATE INDEX chat_participants_chat_idx ON public.chat_participants(chat_id);
CREATE INDEX chat_participants_user_idx ON public.chat_participants(user_id);

CREATE TABLE public.messages (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id           UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  sender_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type              TEXT NOT NULL DEFAULT 'text'
                      CHECK (type IN ('text','image','video','file','voice','system')),
  content           TEXT NOT NULL DEFAULT '',
  media_url         TEXT,
  duration          INTEGER, -- voice message duration in seconds
  read_by           UUID[] DEFAULT '{}',
  reactions         JSONB DEFAULT '[]',
  parent_message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  is_deleted        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX messages_chat_idx    ON public.messages(chat_id, created_at DESC);
CREATE INDEX messages_sender_idx  ON public.messages(sender_id);
CREATE INDEX messages_parent_idx  ON public.messages(parent_message_id);

-- Update last_message_at on chat
CREATE OR REPLACE FUNCTION update_chat_last_message()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.chats
  SET last_message_id = NEW.id,
      last_message_at = NEW.created_at
  WHERE id = NEW.chat_id;

  -- Increment unread for all participants except sender
  UPDATE public.chat_participants
  SET unread_count = unread_count + 1
  WHERE chat_id = NEW.chat_id
    AND user_id != NEW.sender_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER messages_update_chat
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE PROCEDURE update_chat_last_message();

-- Helper: get or create direct chat between two users
CREATE OR REPLACE FUNCTION get_or_create_direct_chat(p_user1 UUID, p_user2 UUID)
RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE
  chat_id UUID;
BEGIN
  -- Find existing direct chat
  SELECT c.id INTO chat_id
  FROM public.chats c
  JOIN public.chat_participants cp1 ON cp1.chat_id = c.id AND cp1.user_id = p_user1
  JOIN public.chat_participants cp2 ON cp2.chat_id = c.id AND cp2.user_id = p_user2
  WHERE c.type = 'direct'
  LIMIT 1;

  IF chat_id IS NULL THEN
    INSERT INTO public.chats (type, created_by)
    VALUES ('direct', p_user1)
    RETURNING id INTO chat_id;

    INSERT INTO public.chat_participants (chat_id, user_id)
    VALUES (chat_id, p_user1), (chat_id, p_user2);
  END IF;

  RETURN chat_id;
END;
$$;
