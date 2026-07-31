-- ═══════════════════════════════════════════════════════════════
-- TribeLink — Migration 012: Discover & AI Matching PostGIS Upgrade
-- Fail-safe self-contained script for user_locations & discover_users
-- ═══════════════════════════════════════════════════════════════

-- 1. Ensure PostGIS and pg_trgm extensions exist
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 2. Ensure public.user_locations table and columns exist
CREATE TABLE IF NOT EXISTS public.user_locations (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  location GEOGRAPHY(POINT, 4326),
  approx_location GEOGRAPHY(POINT, 4326),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure location & approx_location columns exist if table was created previously without PostGIS
ALTER TABLE public.user_locations ADD COLUMN IF NOT EXISTS location GEOGRAPHY(POINT, 4326);
ALTER TABLE public.user_locations ADD COLUMN IF NOT EXISTS approx_location GEOGRAPHY(POINT, 4326);
ALTER TABLE public.user_locations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Enable RLS and add basic policies
ALTER TABLE public.user_locations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_locations' AND policyname = 'user_locations_public_select'
  ) THEN
    CREATE POLICY user_locations_public_select ON public.user_locations FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_locations' AND policyname = 'user_locations_owner_all'
  ) THEN
    CREATE POLICY user_locations_owner_all ON public.user_locations FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- 3. If latitude / longitude columns exist in user_locations, auto-populate PostGIS location column
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'user_locations' AND column_name = 'latitude'
  ) THEN
    EXECUTE 'UPDATE public.user_locations SET location = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography WHERE location IS NULL AND latitude IS NOT NULL AND longitude IS NOT NULL';
  END IF;
END $$;

-- 4. Create Spatial & Search Indexes
CREATE INDEX IF NOT EXISTS user_locations_geog_idx ON public.user_locations USING GIST (location);
CREATE INDEX IF NOT EXISTS user_locations_approx_idx ON public.user_locations USING GIST (approx_location);

CREATE INDEX IF NOT EXISTS user_interests_user_idx ON public.user_interests(user_id);
CREATE INDEX IF NOT EXISTS user_interests_interest_idx ON public.user_interests(interest);

CREATE INDEX IF NOT EXISTS user_skills_user_idx ON public.user_skills(user_id);
CREATE INDEX IF NOT EXISTS user_skills_skill_idx ON public.user_skills(skill);

CREATE INDEX IF NOT EXISTS user_goals_user_idx ON public.user_goals(user_id);

-- 5. Drop old function signatures to prevent signature mismatch errors
DROP FUNCTION IF EXISTS public.discover_users(UUID, FLOAT, TEXT[], TEXT, TEXT, INT);
DROP FUNCTION IF EXISTS public.get_nearby_users(UUID, INT);

-- 6. Redefine discover_users function with distance_km & AI match_score
CREATE OR REPLACE FUNCTION public.discover_users(
  p_user_id     UUID,
  p_max_km      FLOAT DEFAULT 25,
  p_interests   TEXT[] DEFAULT '{}',
  p_sort_by     TEXT DEFAULT 'match',
  p_search      TEXT DEFAULT '',
  p_limit       INT DEFAULT 30
)
RETURNS TABLE (
  id                  UUID,
  name                TEXT,
  username            TEXT,
  avatar_url          TEXT,
  cover_url           TEXT,
  bio                 TEXT,
  age                 SMALLINT,
  gender              TEXT,
  city                TEXT,
  state               TEXT,
  country             TEXT,
  education           TEXT,
  occupation          TEXT,
  languages           TEXT[],
  availability        TEXT,
  is_verified         BOOLEAN,
  is_premium          BOOLEAN,
  is_online           BOOLEAN,
  last_seen           TIMESTAMPTZ,
  trust_score         SMALLINT,
  xp                  INTEGER,
  level               SMALLINT,
  contribution_score  INTEGER,
  profile_complete    BOOLEAN,
  onboarding_complete BOOLEAN,
  show_location       BOOLEAN,
  show_age            BOOLEAN,
  allow_messages      TEXT,
  created_at          TIMESTAMPTZ,
  updated_at          TIMESTAMPTZ,
  distance_km         FLOAT,
  match_score         INT,
  mutual_interests    INT
)
LANGUAGE plpgsql STABLE AS $$
DECLARE
  me_loc GEOGRAPHY(POINT, 4326);
  me_interests TEXT[];
  me_skills TEXT[];
  me_goals TEXT[];
  me_availability TEXT;
  me_languages TEXT[];
BEGIN
  -- Fetch current user location & preferences
  SELECT location INTO me_loc FROM public.user_locations WHERE user_id = p_user_id;

  SELECT ARRAY_AGG(interest) INTO me_interests
  FROM public.user_interests WHERE user_id = p_user_id;

  SELECT ARRAY_AGG(skill) INTO me_skills
  FROM public.user_skills WHERE user_id = p_user_id;

  SELECT ARRAY_AGG(goal) INTO me_goals
  FROM public.user_goals WHERE user_id = p_user_id;

  SELECT p.availability, p.languages INTO me_availability, me_languages
  FROM public.profiles p WHERE p.id = p_user_id;

  me_interests := COALESCE(me_interests, '{}');
  me_skills    := COALESCE(me_skills, '{}');
  me_goals     := COALESCE(me_goals, '{}');
  me_languages := COALESCE(me_languages, '{}');

  RETURN QUERY
  WITH user_data AS (
    SELECT
      p.id,
      p.name,
      p.username,
      p.avatar_url,
      p.cover_url,
      p.bio,
      p.age,
      p.gender,
      p.city,
      p.state,
      p.country,
      p.education,
      p.occupation,
      p.languages,
      p.availability,
      p.is_verified,
      p.is_premium,
      p.is_online,
      p.last_seen,
      p.trust_score,
      p.xp,
      p.level,
      p.contribution_score,
      p.profile_complete,
      p.onboarding_complete,
      p.show_location,
      p.show_age,
      p.allow_messages,
      p.created_at,
      p.updated_at,

      -- True PostGIS distance in KM (rounded to 1 decimal place)
      CASE
        WHEN me_loc IS NOT NULL AND ul.location IS NOT NULL THEN
          ROUND((ST_Distance(ul.location, me_loc)::numeric / 1000.0), 1)::float
        ELSE NULL
      END AS calc_distance_km,

      -- Mutual interests count
      (
        SELECT COUNT(*)::int
        FROM public.user_interests ui
        WHERE ui.user_id = p.id AND ui.interest = ANY(me_interests)
      ) AS calc_mutual_interests,

      -- AI Recommendation Match Score Algorithm (40% to 100%)
      LEAST(100, GREATEST(40, (
        40
        + (SELECT COUNT(*)::int * 15 FROM public.user_interests ui WHERE ui.user_id = p.id AND ui.interest = ANY(me_interests))
        + (SELECT COUNT(*)::int * 12 FROM public.user_skills us WHERE us.user_id = p.id AND us.skill = ANY(me_skills))
        + (SELECT COUNT(*)::int * 10 FROM public.user_goals ug WHERE ug.user_id = p.id AND ug.goal = ANY(me_goals))
        + (CASE WHEN me_availability IS NOT NULL AND (p.availability = me_availability OR p.availability = 'flexible' OR me_availability = 'flexible') THEN 8 ELSE 0 END)
        + (CASE WHEN p.languages && me_languages THEN 5 ELSE 0 END)
      ))) AS calc_match_score
    FROM public.profiles p
    LEFT JOIN public.user_locations ul ON ul.user_id = p.id
    WHERE p.id != p_user_id
      AND p.onboarding_complete = TRUE
      -- Distance filter: if max_km > 0 and location is available, filter using ST_DWithin
      AND (
        me_loc IS NULL
        OR ul.location IS NULL
        OR p_max_km <= 0
        OR ST_DWithin(ul.location, me_loc, p_max_km * 1000)
      )
      -- Search filter matching name, bio, occupation, city, interests, or skills
      AND (
        p_search = ''
        OR p.name ILIKE '%' || p_search || '%'
        OR p.bio  ILIKE '%' || p_search || '%'
        OR p.occupation ILIKE '%' || p_search || '%'
        OR p.city ILIKE '%' || p_search || '%'
        OR EXISTS (
          SELECT 1 FROM public.user_interests ui
          WHERE ui.user_id = p.id AND ui.interest ILIKE '%' || p_search || '%'
        )
        OR EXISTS (
          SELECT 1 FROM public.user_skills us
          WHERE us.user_id = p.id AND us.skill ILIKE '%' || p_search || '%'
        )
      )
      -- Optional explicit interest array filter
      AND (
        CARDINALITY(p_interests) = 0
        OR EXISTS (
          SELECT 1 FROM public.user_interests ui
          WHERE ui.user_id = p.id AND ui.interest = ANY(p_interests)
        )
      )
  )
  SELECT
    ud.id,
    ud.name,
    ud.username,
    ud.avatar_url,
    ud.cover_url,
    ud.bio,
    ud.age,
    ud.gender,
    ud.city,
    ud.state,
    ud.country,
    ud.education,
    ud.occupation,
    ud.languages,
    ud.availability,
    ud.is_verified,
    ud.is_premium,
    ud.is_online,
    ud.last_seen,
    ud.trust_score,
    ud.xp,
    ud.level,
    ud.contribution_score,
    ud.profile_complete,
    ud.onboarding_complete,
    ud.show_location,
    ud.show_age,
    ud.allow_messages,
    ud.created_at,
    ud.updated_at,
    ud.calc_distance_km AS distance_km,
    ud.calc_match_score AS match_score,
    ud.calc_mutual_interests AS mutual_interests
  FROM user_data ud
  ORDER BY
    CASE WHEN p_sort_by = 'distance' THEN ud.calc_distance_km END ASC NULLS LAST,
    CASE WHEN p_sort_by = 'match'    THEN ud.calc_match_score  END DESC,
    CASE WHEN p_sort_by = 'activity' THEN EXTRACT(EPOCH FROM ud.last_seen) END DESC,
    CASE WHEN p_sort_by = 'recent'   THEN EXTRACT(EPOCH FROM ud.created_at) END DESC,
    ud.trust_score DESC
  LIMIT p_limit;
END;
$$;

-- 7. Re-create get_nearby_users helper RPC
CREATE OR REPLACE FUNCTION public.get_nearby_users(
  p_user_id UUID,
  p_limit   INT DEFAULT 20
)
RETURNS TABLE (
  id                  UUID,
  name                TEXT,
  username            TEXT,
  avatar_url          TEXT,
  cover_url           TEXT,
  bio                 TEXT,
  age                 SMALLINT,
  gender              TEXT,
  city                TEXT,
  state               TEXT,
  country             TEXT,
  education           TEXT,
  occupation          TEXT,
  languages           TEXT[],
  availability        TEXT,
  is_verified         BOOLEAN,
  is_premium          BOOLEAN,
  is_online           BOOLEAN,
  last_seen           TIMESTAMPTZ,
  trust_score         SMALLINT,
  xp                  INTEGER,
  level               SMALLINT,
  contribution_score  INTEGER,
  profile_complete    BOOLEAN,
  onboarding_complete BOOLEAN,
  show_location       BOOLEAN,
  show_age            BOOLEAN,
  allow_messages      TEXT,
  created_at          TIMESTAMPTZ,
  updated_at          TIMESTAMPTZ,
  distance_km         FLOAT,
  match_score         INT,
  mutual_interests    INT
)
LANGUAGE plpgsql STABLE AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM public.discover_users(p_user_id, 50, '{}', 'distance', '', p_limit);
END;
$$;
