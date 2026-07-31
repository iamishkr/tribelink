-- ═══════════════════════════════════════════════════════════════
-- TribeLink — Migration 014: Communities Realtime, Roles & Security
-- ═══════════════════════════════════════════════════════════════

-- 1. Ensure columns exist on posts, chats, and community_members
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS community_id UUID REFERENCES public.communities(id) ON DELETE CASCADE;

ALTER TABLE public.chats ADD COLUMN IF NOT EXISTS community_id UUID REFERENCES public.communities(id) ON DELETE CASCADE;

ALTER TABLE public.community_members ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'member'
  CHECK (role IN ('owner', 'admin', 'moderator', 'member'));

-- 2. Trigger to automatically add Community Creator as Owner
CREATE OR REPLACE FUNCTION public.handle_new_community_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.community_members (community_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner')
  ON CONFLICT (community_id, user_id) DO UPDATE SET role = 'owner';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_community_created_add_owner ON public.communities;
CREATE TRIGGER on_community_created_add_owner
  AFTER INSERT ON public.communities
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_community_owner();

-- 3. RLS Policies for Communities Module
ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;

-- Communities RLS: Public communities readable by all; private readable by members or public search
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'communities' AND policyname = 'communities_read_public') THEN
    CREATE POLICY communities_read_public ON public.communities FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'communities' AND policyname = 'communities_insert_auth') THEN
    CREATE POLICY communities_insert_auth ON public.communities FOR INSERT WITH CHECK (auth.uid() = owner_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'communities' AND policyname = 'communities_update_owner_admin') THEN
    CREATE POLICY communities_update_owner_admin ON public.communities FOR UPDATE
      USING (EXISTS (SELECT 1 FROM public.community_members WHERE community_id = communities.id AND user_id = auth.uid() AND role IN ('owner', 'admin')));
  END IF;
END $$;

-- Community Posts RLS: Private community posts hidden from non-members
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'posts' AND policyname = 'posts_select_community_security') THEN
    CREATE POLICY posts_select_community_security ON public.posts FOR SELECT
      USING (
        community_id IS NULL OR
        EXISTS (SELECT 1 FROM public.communities c WHERE c.id = posts.community_id AND c.type = 'public') OR
        EXISTS (SELECT 1 FROM public.community_members cm WHERE cm.community_id = posts.community_id AND cm.user_id = auth.uid())
      );
  END IF;
END $$;
