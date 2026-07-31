-- ═══════════════════════════════════════════════════════════════
-- TribeLink — Migration 004: Posts & Comments
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE public.posts (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  community_id   UUID REFERENCES public.communities(id) ON DELETE SET NULL,
  type           TEXT NOT NULL DEFAULT 'text'
                   CHECK (type IN ('text','image','video','poll','event','article','question','code')),
  content        TEXT NOT NULL,
  media_urls     TEXT[] DEFAULT '{}',
  hashtags       TEXT[] DEFAULT '{}',
  mentions       UUID[] DEFAULT '{}',
  like_count     INTEGER NOT NULL DEFAULT 0,
  comment_count  INTEGER NOT NULL DEFAULT 0,
  share_count    INTEGER NOT NULL DEFAULT 0,
  bookmark_count INTEGER NOT NULL DEFAULT 0,
  is_pinned      BOOLEAN NOT NULL DEFAULT FALSE,
  is_edited      BOOLEAN NOT NULL DEFAULT FALSE,
  is_flagged     BOOLEAN NOT NULL DEFAULT FALSE,
  visibility     TEXT NOT NULL DEFAULT 'public'
                   CHECK (visibility IN ('public','connections','community')),
  search_vector  TSVECTOR GENERATED ALWAYS AS (
    TO_TSVECTOR('english', COALESCE(content,''))
  ) STORED,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX posts_author_idx   ON public.posts(author_id);
CREATE INDEX posts_community_idx ON public.posts(community_id);
CREATE INDEX posts_created_idx  ON public.posts(created_at DESC);
CREATE INDEX posts_search_idx   ON public.posts USING GIN (search_vector);
CREATE INDEX posts_hashtags_idx ON public.posts USING GIN (hashtags);

CREATE TRIGGER posts_updated_at
  BEFORE UPDATE ON public.posts
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();

-- ─── Reactions (likes) ─────────────────────────────────────────
CREATE TABLE public.reactions (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('post','comment')),
  target_id  UUID NOT NULL,
  emoji      TEXT NOT NULL DEFAULT '❤️',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, target_type, target_id)
);

-- Sync like_count
CREATE OR REPLACE FUNCTION sync_like_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.target_type = 'post' THEN
    UPDATE public.posts SET like_count = like_count + 1 WHERE id = NEW.target_id;
  ELSIF TG_OP = 'DELETE' AND OLD.target_type = 'post' THEN
    UPDATE public.posts SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.target_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER reactions_sync_count
  AFTER INSERT OR DELETE ON public.reactions
  FOR EACH ROW EXECUTE PROCEDURE sync_like_count();

-- ─── Comments ──────────────────────────────────────────────────
CREATE TABLE public.comments (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id    UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  author_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  parent_id  UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  content    TEXT NOT NULL,
  like_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX comments_post_idx   ON public.comments(post_id);
CREATE INDEX comments_author_idx ON public.comments(author_id);
CREATE INDEX comments_parent_idx ON public.comments(parent_id);

-- Sync comment_count on posts
CREATE OR REPLACE FUNCTION sync_comment_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER comments_sync_count
  AFTER INSERT OR DELETE ON public.comments
  FOR EACH ROW EXECUTE PROCEDURE sync_comment_count();

-- ─── Bookmarks ─────────────────────────────────────────────────
CREATE TABLE public.bookmarks (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_id    UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, post_id)
);
