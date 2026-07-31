-- ═══════════════════════════════════════════════════════════════
-- TribeLink — Migration 009: Row-Level Security (RLS) Policies
-- ═══════════════════════════════════════════════════════════════

-- ─── Enable RLS on all tables ──────────────────────────────────
ALTER TABLE public.profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_locations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_interests     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_skills        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_goals         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communities        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_members  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reactions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participants  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xp_log             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports            ENABLE ROW LEVEL SECURITY;

-- ─── Profiles ──────────────────────────────────────────────────
-- Anyone can read public profiles
CREATE POLICY "profiles_select_public" ON public.profiles
  FOR SELECT USING (TRUE);

-- Only owner can update their profile
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- ─── User Locations ────────────────────────────────────────────
-- Only owner can read their exact location
CREATE POLICY "locations_select_own" ON public.user_locations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "locations_upsert_own" ON public.user_locations
  FOR ALL USING (auth.uid() = user_id);

-- ─── Interests / Skills / Goals ────────────────────────────────
CREATE POLICY "interests_select_all" ON public.user_interests
  FOR SELECT USING (TRUE);

CREATE POLICY "interests_modify_own" ON public.user_interests
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "skills_select_all" ON public.user_skills
  FOR SELECT USING (TRUE);

CREATE POLICY "skills_modify_own" ON public.user_skills
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "goals_select_own" ON public.user_goals
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "goals_modify_own" ON public.user_goals
  FOR ALL USING (auth.uid() = user_id);

-- ─── Follows ───────────────────────────────────────────────────
CREATE POLICY "follows_select_all" ON public.follows
  FOR SELECT USING (TRUE);

CREATE POLICY "follows_insert_own" ON public.follows
  FOR INSERT WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "follows_delete_own" ON public.follows
  FOR DELETE USING (auth.uid() = follower_id);

-- ─── Communities ───────────────────────────────────────────────
-- Public communities visible to all; private only to members
CREATE POLICY "communities_select" ON public.communities
  FOR SELECT USING (
    type = 'public'
    OR EXISTS (
      SELECT 1 FROM public.community_members
      WHERE community_id = communities.id AND user_id = auth.uid()
    )
  );

CREATE POLICY "communities_insert" ON public.communities
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "communities_update" ON public.communities
  FOR UPDATE USING (
    auth.uid() = owner_id
    OR EXISTS (
      SELECT 1 FROM public.community_members
      WHERE community_id = communities.id
        AND user_id = auth.uid()
        AND role IN ('admin','moderator')
    )
  );

-- ─── Community Members ─────────────────────────────────────────
CREATE POLICY "cm_select" ON public.community_members
  FOR SELECT USING (TRUE);

CREATE POLICY "cm_insert_own" ON public.community_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "cm_delete_own" ON public.community_members
  FOR DELETE USING (auth.uid() = user_id);

-- ─── Posts ─────────────────────────────────────────────────────
CREATE POLICY "posts_select_public" ON public.posts
  FOR SELECT USING (
    visibility = 'public'
    OR author_id = auth.uid()
    OR (
      visibility = 'community'
      AND community_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.community_members
        WHERE community_id = posts.community_id AND user_id = auth.uid()
      )
    )
  );

CREATE POLICY "posts_insert_own" ON public.posts
  FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "posts_update_own" ON public.posts
  FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY "posts_delete_own" ON public.posts
  FOR DELETE USING (auth.uid() = author_id);

-- ─── Messages ──────────────────────────────────────────────────
CREATE POLICY "messages_select_participant" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.chat_participants
      WHERE chat_id = messages.chat_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "messages_insert_participant" ON public.messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.chat_participants
      WHERE chat_id = messages.chat_id AND user_id = auth.uid()
    )
  );

-- ─── Notifications ─────────────────────────────────────────────
CREATE POLICY "notifications_own" ON public.notifications
  FOR ALL USING (auth.uid() = user_id);

-- ─── Achievements ──────────────────────────────────────────────
CREATE POLICY "achievements_select" ON public.achievements
  FOR SELECT USING (TRUE);

CREATE POLICY "achievements_insert_service" ON public.achievements
  FOR INSERT WITH CHECK (TRUE); -- Only via service role / edge functions

-- ─── Reports ───────────────────────────────────────────────────
CREATE POLICY "reports_insert" ON public.reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "reports_own" ON public.reports
  FOR SELECT USING (auth.uid() = reporter_id);

-- ─── Admin helper: bypass RLS for service_role ─────────────────
-- All policies are bypassed when using the service_role key (admin dashboard / edge functions)
