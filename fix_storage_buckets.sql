-- ====================================================================
-- TribeLink — Fix Supabase Storage Buckets & RLS Policies
-- Run this script in your Supabase SQL Editor to resolve "Bucket Not Found" errors
-- ====================================================================

-- 1. Create 'avatars' bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  TRUE,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = TRUE,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- 2. Create 'covers' bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'covers',
  'covers',
  TRUE,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = TRUE,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- 3. Storage Policies
DROP POLICY IF EXISTS "Public Storage Read Policy" ON storage.objects;
CREATE POLICY "Public Storage Read Policy" ON storage.objects
  FOR SELECT USING (bucket_id IN ('avatars', 'covers'));

DROP POLICY IF EXISTS "Authenticated User Storage Insert Policy" ON storage.objects;
CREATE POLICY "Authenticated User Storage Insert Policy" ON storage.objects
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
    AND bucket_id IN ('avatars', 'covers')
  );

DROP POLICY IF EXISTS "Authenticated User Storage Update Policy" ON storage.objects;
CREATE POLICY "Authenticated User Storage Update Policy" ON storage.objects
  FOR UPDATE USING (
    auth.role() = 'authenticated'
    AND bucket_id IN ('avatars', 'covers')
  );

DROP POLICY IF EXISTS "Authenticated User Storage Delete Policy" ON storage.objects;
CREATE POLICY "Authenticated User Storage Delete Policy" ON storage.objects
  FOR DELETE USING (
    auth.role() = 'authenticated'
    AND bucket_id IN ('avatars', 'covers')
  );
