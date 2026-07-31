-- ====================================================================
-- TribeLink — Fail-Safe Auth Trigger & Username Generator
-- Run this script in your Supabase SQL Editor to fix signup triggers
-- ====================================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.generate_username(text);

CREATE OR REPLACE FUNCTION public.generate_username(p_name TEXT)
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  base_username TEXT;
  candidate     TEXT;
  counter       INT := 0;
BEGIN
  base_username := LOWER(REGEXP_REPLACE(COALESCE(p_name, 'user'), '[^a-zA-Z0-9]', '', 'g'));
  IF LENGTH(base_username) < 3 THEN
    base_username := 'user' || base_username;
  END IF;
  candidate := base_username;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = candidate) LOOP
    counter   := counter + 1;
    candidate := base_username || counter::TEXT;
  END LOOP;
  RETURN candidate;
EXCEPTION WHEN OTHERS THEN
  RETURN 'user_' || SUBSTRING(MD5(RANDOM()::TEXT), 1, 8);
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  u_name TEXT;
  u_username TEXT;
  u_avatar TEXT;
BEGIN
  u_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    'TribeLink User'
  );

  u_avatar := COALESCE(
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'picture'
  );

  u_username := public.generate_username(u_name);

  INSERT INTO public.profiles (id, name, username, avatar_url)
  VALUES (NEW.id, u_name, u_username, u_avatar)
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    avatar_url = COALESCE(public.profiles.avatar_url, EXCLUDED.avatar_url);

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();