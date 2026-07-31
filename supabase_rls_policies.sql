-- ====================================================================
-- TribeLink — Supabase Row-Level Security (RLS) & Table Policies SQL
-- Run this script in your Supabase SQL Editor to resolve RLS 42501 errors
-- ====================================================================

-- 1. Policies on `chats` table
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public insert chats" ON chats;
CREATE POLICY "Allow public insert chats"
ON chats FOR INSERT
TO public
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public select chats" ON chats;
CREATE POLICY "Allow public select chats"
ON chats FOR SELECT
TO public
USING (true);

-- 2. Policies on `chat_participants` table
ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public insert chat_participants" ON chat_participants;
CREATE POLICY "Allow public insert chat_participants"
ON chat_participants FOR INSERT
TO public
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public select chat_participants" ON chat_participants;
CREATE POLICY "Allow public select chat_participants"
ON chat_participants FOR SELECT
TO public
USING (true);

-- 3. Policies on `messages` table
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public insert messages" ON messages;
CREATE POLICY "Allow public insert messages"
ON messages FOR INSERT
TO public
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public select messages" ON messages;
CREATE POLICY "Allow public select messages"
ON messages FOR SELECT
TO public
USING (true);

-- 4. Policies on `follows` table
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public insert follows" ON follows;
CREATE POLICY "Allow public insert follows"
ON follows FOR INSERT
TO public
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public delete follows" ON follows;
CREATE POLICY "Allow public delete follows"
ON follows FOR DELETE
TO public
USING (true);

DROP POLICY IF EXISTS "Allow public select follows" ON follows;
CREATE POLICY "Allow public select follows"
ON follows FOR SELECT
TO public
USING (true);
