-- ═══════════════════════════════════════════════════════════════
-- TribeLink — Migration 001: Core Users & Profiles
-- ═══════════════════════════════════════════════════════════════

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- for fuzzy search
CREATE EXTENSION IF NOT EXISTS "vector";  -- for AI embeddings

-- ─── Profiles table (extends auth.users) ───────────────────────
CREATE TABLE public.profiles (
  id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  username            TEXT UNIQUE,
  avatar_url          TEXT,
  cover_url           TEXT,
  bio                 TEXT,
  age                 SMALLINT CHECK (age >= 13 AND age <= 120),
  gender              TEXT CHECK (gender IN ('male','female','non_binary','prefer_not_to_say')),
  city                TEXT,
  state               TEXT,
  country             TEXT DEFAULT 'India',
  education           TEXT,
  occupation          TEXT,
  languages           TEXT[] DEFAULT '{}',
  availability        TEXT CHECK (availability IN ('weekdays','weekends','evenings','flexible')),
  is_verified         BOOLEAN NOT NULL DEFAULT FALSE,
  is_premium          BOOLEAN NOT NULL DEFAULT FALSE,
  is_online           BOOLEAN NOT NULL DEFAULT FALSE,
  last_seen           TIMESTAMPTZ DEFAULT NOW(),
  trust_score         SMALLINT NOT NULL DEFAULT 50 CHECK (trust_score BETWEEN 0 AND 100),
  xp                  INTEGER NOT NULL DEFAULT 0,
  level               SMALLINT NOT NULL DEFAULT 1,
  contribution_score  INTEGER NOT NULL DEFAULT 0,
  profile_complete    BOOLEAN NOT NULL DEFAULT FALSE,
  onboarding_complete BOOLEAN NOT NULL DEFAULT FALSE,
  -- Privacy
  show_location       BOOLEAN NOT NULL DEFAULT TRUE,
  show_age            BOOLEAN NOT NULL DEFAULT TRUE,
  allow_messages      TEXT NOT NULL DEFAULT 'everyone' CHECK (allow_messages IN ('everyone','connections','none')),
  -- AI
  embedding           vector(1536),  -- OpenAI embedding for AI matching
  -- Timestamps
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-generate username from name
CREATE OR REPLACE FUNCTION generate_username(p_name TEXT)
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  base_username TEXT;
  candidate     TEXT;
  counter       INT := 0;
BEGIN
  base_username := LOWER(REGEXP_REPLACE(p_name, '[^a-zA-Z0-9]', '', 'g'));
  IF LENGTH(base_username) < 3 THEN
    base_username := base_username || 'user';
  END IF;
  candidate := base_username;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = candidate) LOOP
    counter   := counter + 1;
    candidate := base_username || counter::TEXT;
  END LOOP;
  RETURN candidate;
END;
$$;

-- Trigger: auto-create profile on signup (bulletproof with fallback & exception safety)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  u_name TEXT;
  u_username TEXT;
BEGIN
  u_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'TribeLink User');
  IF u_name IS NULL OR LENGTH(TRIM(u_name)) = 0 THEN
    u_name := 'TribeLink User';
  END IF;

  u_username := LOWER(REGEXP_REPLACE(u_name, '[^a-zA-Z0-9]', '', 'g'));
  IF u_username IS NULL OR LENGTH(u_username) < 3 THEN
    u_username := 'user';
  END IF;
  u_username := u_username || '_' || SUBSTRING(REPLACE(NEW.id::text, '-', ''), 1, 6);

  INSERT INTO public.profiles (id, name, username)
  VALUES (NEW.id, u_name, u_username)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Trigger: update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();

-- ─── User locations (PostGIS) ───────────────────────────────────
CREATE TABLE public.user_locations (
  user_id       UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  location      GEOGRAPHY(POINT, 4326) NOT NULL, -- exact location (private)
  approx_location GEOGRAPHY(POINT, 4326),         -- fuzzy location (public)
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX user_locations_geog_idx ON public.user_locations USING GIST (location);
CREATE INDEX user_locations_approx_idx ON public.user_locations USING GIST (approx_location);

-- ─── Interests ─────────────────────────────────────────────────
CREATE TABLE public.user_interests (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  interest   TEXT NOT NULL,
  level      TEXT DEFAULT 'beginner' CHECK (level IN ('beginner','intermediate','expert')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, interest)
);

CREATE INDEX user_interests_user_idx ON public.user_interests(user_id);
CREATE INDEX user_interests_interest_idx ON public.user_interests(interest);

-- ─── Skills ────────────────────────────────────────────────────
CREATE TABLE public.user_skills (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  skill      TEXT NOT NULL,
  level      TEXT DEFAULT 'beginner' CHECK (level IN ('beginner','intermediate','expert')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, skill)
);

-- ─── Goals ─────────────────────────────────────────────────────
CREATE TABLE public.user_goals (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  goal        TEXT NOT NULL,
  target_date DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Follows ───────────────────────────────────────────────────
CREATE TABLE public.follows (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  follower_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (follower_id, following_id),
  CHECK (follower_id != following_id)
);

CREATE INDEX follows_follower_idx  ON public.follows(follower_id);
CREATE INDEX follows_following_idx ON public.follows(following_id);

-- ─── Discover users function (PostGIS + interest matching) ──────
CREATE OR REPLACE FUNCTION public.discover_users(
  p_user_id  UUID,
  p_max_km   FLOAT DEFAULT 25,
  p_interests TEXT[] DEFAULT '{}',
  p_sort_by  TEXT DEFAULT 'match',
  p_search   TEXT DEFAULT '',
  p_limit    INT DEFAULT 30
)
RETURNS SETOF public.profiles
LANGUAGE sql STABLE AS $$
  SELECT p.*
  FROM public.profiles p
  LEFT JOIN public.user_locations ul ON ul.user_id = p.id
  LEFT JOIN public.user_locations me_loc ON me_loc.user_id = p_user_id
  WHERE p.id != p_user_id
    AND p.onboarding_complete = TRUE
    AND (
      me_loc.location IS NULL
      OR ul.location IS NULL
      OR ST_DWithin(ul.location, me_loc.location, p_max_km * 1000)
    )
    AND (
      p_search = ''
      OR p.name ILIKE '%' || p_search || '%'
      OR p.bio  ILIKE '%' || p_search || '%'
    )
  ORDER BY
    CASE WHEN p_sort_by = 'recent'   THEN EXTRACT(EPOCH FROM p.created_at) END DESC,
    CASE WHEN p_sort_by = 'activity' THEN EXTRACT(EPOCH FROM p.last_seen) END DESC,
    p.trust_score DESC
  LIMIT p_limit;
$$;

-- ─── Nearby users RPC ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_nearby_users(
  p_user_id UUID,
  p_limit   INT DEFAULT 20
)
RETURNS SETOF public.profiles
LANGUAGE sql STABLE AS $$
  SELECT * FROM public.discover_users(p_user_id, 50, '{}', 'match', '', p_limit);
$$;
