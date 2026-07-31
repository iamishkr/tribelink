-- ═══════════════════════════════════════════════════════════════
-- TribeLink — Migration 007: Gamification (XP, Badges, Streaks)
-- ═══════════════════════════════════════════════════════════════

-- ─── Badges master list ────────────────────────────────────────
CREATE TABLE public.badges (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  icon        TEXT NOT NULL,
  color       TEXT NOT NULL DEFAULT '#7C3AED',
  xp_value    INTEGER NOT NULL DEFAULT 0,
  rarity      TEXT NOT NULL DEFAULT 'common'
                CHECK (rarity IN ('common','rare','epic','legendary'))
);

-- Seed badges
INSERT INTO public.badges (name, description, icon, color, xp_value, rarity) VALUES
  ('First Steps',     'Completed your profile',            '👣', '#10B981', 50,   'common'),
  ('Tribe Starter',   'Joined your first community',       '🏘️', '#6366F1', 30,   'common'),
  ('Connector',       'Made 10 connections',               '🔗', '#7C3AED', 100,  'rare'),
  ('Social Butterfly','Made 50 connections',               '🦋', '#EC4899', 300,  'epic'),
  ('Event Goer',      'Attended your first event',         '🎉', '#F59E0B', 80,   'common'),
  ('Storyteller',     'Created 10 posts',                  '📝', '#06B6D4', 100,  'rare'),
  ('Mentor',          'Helped 5 people',                   '🧠', '#8B5CF6', 200,  'epic'),
  ('Tribe Legend',    'Reached level 10',                  '👑', '#F59E0B', 500,  'legendary'),
  ('Early Bird',      'Joined in the first month',         '🐦', '#10B981', 200,  'legendary'),
  ('Streak Master',   '30-day login streak',               '🔥', '#EF4444', 300,  'epic');

-- ─── User achievements ─────────────────────────────────────────
CREATE TABLE public.achievements (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  badge_id   UUID NOT NULL REFERENCES public.badges(id),
  xp_earned  INTEGER NOT NULL DEFAULT 0,
  earned_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, badge_id)
);

CREATE INDEX achievements_user_idx ON public.achievements(user_id);

-- ─── XP log ────────────────────────────────────────────────────
CREATE TABLE public.xp_log (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action     TEXT NOT NULL,
  xp_amount  INTEGER NOT NULL,
  metadata   JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX xp_log_user_idx ON public.xp_log(user_id, created_at DESC);

-- ─── Award XP function ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION award_xp(
  p_user_id UUID,
  p_action  TEXT,
  p_xp      INTEGER,
  p_meta    JSONB DEFAULT '{}'
)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
  new_xp    INTEGER;
  new_level SMALLINT;
BEGIN
  -- Log the action
  INSERT INTO public.xp_log (user_id, action, xp_amount, metadata)
  VALUES (p_user_id, p_action, p_xp, p_meta);

  -- Update XP
  UPDATE public.profiles
  SET xp = xp + p_xp
  WHERE id = p_user_id
  RETURNING xp INTO new_xp;

  -- Recalculate level
  new_level := CASE
    WHEN new_xp >= 18000 THEN 10
    WHEN new_xp >= 12000 THEN 9
    WHEN new_xp >= 8000  THEN 8
    WHEN new_xp >= 5500  THEN 7
    WHEN new_xp >= 3500  THEN 6
    WHEN new_xp >= 2000  THEN 5
    WHEN new_xp >= 1000  THEN 4
    WHEN new_xp >= 500   THEN 3
    WHEN new_xp >= 200   THEN 2
    ELSE 1
  END;

  UPDATE public.profiles SET level = new_level WHERE id = p_user_id;
END;
$$;

-- ─── Streaks ───────────────────────────────────────────────────
CREATE TABLE public.streaks (
  user_id       UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_active_date DATE,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Notifications ─────────────────────────────────────────────
CREATE TABLE public.notifications (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  actor_id   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  type       TEXT NOT NULL CHECK (type IN (
    'like','comment','follow','mention','message','community_invite',
    'event_reminder','ai_recommendation','achievement','weekly_summary'
  )),
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  data       JSONB DEFAULT '{}',
  is_read    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX notifications_user_idx     ON public.notifications(user_id, created_at DESC);
CREATE INDEX notifications_unread_idx   ON public.notifications(user_id, is_read) WHERE is_read = FALSE;

-- ─── Reports ───────────────────────────────────────────────────
CREATE TABLE public.reports (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('user','post','comment','community','message')),
  target_id   UUID NOT NULL,
  reason      TEXT NOT NULL,
  description TEXT,
  status      TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','reviewed','resolved','dismissed')),
  resolved_by UUID REFERENCES public.profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX reports_status_idx ON public.reports(status, created_at DESC);
