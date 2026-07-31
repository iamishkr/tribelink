-- ═══════════════════════════════════════════════════════════════
-- TribeLink — Migration 003: Communities
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE public.communities (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         TEXT NOT NULL,
  slug         TEXT UNIQUE,
  description  TEXT,
  avatar_url   TEXT,
  cover_url    TEXT,
  category     TEXT NOT NULL DEFAULT 'general',
  tags         TEXT[] DEFAULT '{}',
  type         TEXT NOT NULL DEFAULT 'public'
                 CHECK (type IN ('public','private','invite_only')),
  member_count INTEGER NOT NULL DEFAULT 0,
  post_count   INTEGER NOT NULL DEFAULT 0,
  owner_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rules        TEXT[] DEFAULT '{}',
  is_verified  BOOLEAN NOT NULL DEFAULT FALSE,
  -- Search
  search_vector TSVECTOR GENERATED ALWAYS AS (
    TO_TSVECTOR('english', COALESCE(name,'') || ' ' || COALESCE(description,''))
  ) STORED,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX communities_search_idx ON public.communities USING GIN (search_vector);
CREATE INDEX communities_category_idx ON public.communities(category);
CREATE INDEX communities_type_idx ON public.communities(type);

-- Auto-generate slug
CREATE OR REPLACE FUNCTION generate_community_slug(p_name TEXT)
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  base_slug TEXT;
  candidate TEXT;
  counter   INT := 0;
BEGIN
  base_slug := LOWER(REGEXP_REPLACE(TRIM(p_name), '[^a-zA-Z0-9]+', '-', 'g'));
  candidate := base_slug;
  WHILE EXISTS (SELECT 1 FROM public.communities WHERE slug = candidate) LOOP
    counter   := counter + 1;
    candidate := base_slug || '-' || counter;
  END LOOP;
  RETURN candidate;
END;
$$;

CREATE OR REPLACE FUNCTION set_community_slug()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.slug IS NULL THEN
    NEW.slug := generate_community_slug(NEW.name);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER communities_set_slug
  BEFORE INSERT ON public.communities
  FOR EACH ROW EXECUTE PROCEDURE set_community_slug();

CREATE TRIGGER communities_updated_at
  BEFORE UPDATE ON public.communities
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();

-- ─── Community Members ─────────────────────────────────────────
CREATE TABLE public.community_members (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role         TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner','admin','moderator','member')),
  joined_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (community_id, user_id)
);

CREATE INDEX cm_community_idx ON public.community_members(community_id);
CREATE INDEX cm_user_idx      ON public.community_members(user_id);

-- Auto-increment member_count
CREATE OR REPLACE FUNCTION sync_member_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.communities SET member_count = member_count + 1 WHERE id = NEW.community_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.communities SET member_count = GREATEST(member_count - 1, 0) WHERE id = OLD.community_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER community_member_count
  AFTER INSERT OR DELETE ON public.community_members
  FOR EACH ROW EXECUTE PROCEDURE sync_member_count();

-- Auto-add owner as member on community create
CREATE OR REPLACE FUNCTION add_owner_as_member()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.community_members (community_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner');
  RETURN NEW;
END;
$$;

CREATE TRIGGER community_add_owner
  AFTER INSERT ON public.communities
  FOR EACH ROW EXECUTE PROCEDURE add_owner_as_member();
