-- ====================================================================
-- TribeLink — Fix Communities (SAFE TO RE-RUN)
-- Run this in your Supabase SQL Editor
-- ====================================================================

-- 1. Add community_id to chats table (missing from base schema)
ALTER TABLE public.chats ADD COLUMN IF NOT EXISTS community_id UUID REFERENCES public.communities(id) ON DELETE CASCADE;

-- 2. Ensure is_pinned exists on posts (already in 004, just safety)
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT FALSE;

-- 3. Index for fast community chat lookup
CREATE INDEX IF NOT EXISTS chats_community_idx ON public.chats(community_id);

-- 4. Drop conflicting trigger from 014 if it was created (conflicts with existing community_add_owner)
DROP TRIGGER IF EXISTS on_community_created_add_owner ON public.communities;
DROP FUNCTION IF EXISTS public.handle_new_community_owner();

-- 5. Fix posts_update RLS — allow community admins/owners to pin/update posts in their community
DROP POLICY IF EXISTS "posts_update_own" ON public.posts;
CREATE POLICY "posts_update_own" ON public.posts
  FOR UPDATE USING (
    auth.uid() = author_id
    OR (
      community_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.community_members
        WHERE community_id = posts.community_id
          AND user_id = auth.uid()
          AND role IN ('owner', 'admin', 'moderator')
      )
    )
  );

-- 6. Fix posts_delete RLS — allow community admins/owners to delete posts
DROP POLICY IF EXISTS "posts_delete_own" ON public.posts;
CREATE POLICY "posts_delete_own" ON public.posts
  FOR DELETE USING (
    auth.uid() = author_id
    OR (
      community_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.community_members
        WHERE community_id = posts.community_id
          AND user_id = auth.uid()
          AND role IN ('owner', 'admin')
      )
    )
  );

-- 7. Fix community_members DELETE — allow owners/admins to kick members
DROP POLICY IF EXISTS "cm_delete_own" ON public.community_members;
CREATE POLICY "cm_delete_own" ON public.community_members
  FOR DELETE USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.community_members AS cm
      WHERE cm.community_id = community_members.community_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('owner', 'admin')
    )
  );

-- 8. Allow owners/admins to update member roles (promote/demote)
DROP POLICY IF EXISTS "cm_update_role" ON public.community_members;
CREATE POLICY "cm_update_role" ON public.community_members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.community_members AS cm
      WHERE cm.community_id = community_members.community_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('owner', 'admin')
    )
  );

-- 9. Allow community admins to insert member rows (inviting)
DROP POLICY IF EXISTS "cm_insert_own" ON public.community_members;
CREATE POLICY "cm_insert_own" ON public.community_members
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.community_members AS cm
      WHERE cm.community_id = community_members.community_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('owner', 'admin')
    )
  );

-- 10. Ensure community chat select is visible to participants
-- (chats and chat_participants should already have RLS from 009)
-- Add community_id-based access for group chats
DROP POLICY IF EXISTS "chats_community_member_select" ON public.chats;
CREATE POLICY "chats_community_member_select" ON public.chats
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.chat_participants
      WHERE chat_id = chats.id AND user_id = auth.uid()
    )
    OR (
      community_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.community_members
        WHERE community_id = chats.community_id AND user_id = auth.uid()
      )
    )
  );
