-- ====================================================================
-- TribeLink — Seed Realistic Mock Coordinates for All Users
-- Run this script in your Supabase SQL Editor to populate distinct user locations
-- ====================================================================

-- 1. Ensure user_locations table exists
CREATE TABLE IF NOT EXISTS public.user_locations (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  location GEOGRAPHY(POINT, 4326),
  approx_location GEOGRAPHY(POINT, 4326),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Populate distinct offset locations for EVERY user in public.profiles based on UUID hash
-- Spreads users across realistic distance radii (0.5 km to 45 km)
INSERT INTO public.user_locations (user_id, location, approx_location, updated_at)
SELECT 
  p.id,
  ST_SetSRID(
    ST_MakePoint(
      72.8295 + ((abs(hashtext(p.id::text)) % 250) + 1) * 0.0015,  -- Longitude offset
      19.0596 + ((abs(hashtext(reverse(p.id::text))) % 250) + 1) * 0.0015 -- Latitude offset
    ),
    4326
  )::geography,
  ST_SetSRID(
    ST_MakePoint(
      72.8300 + ((abs(hashtext(p.id::text)) % 250) + 1) * 0.0015,
      19.0600 + ((abs(hashtext(reverse(p.id::text))) % 250) + 1) * 0.0015
    ),
    4326
  )::geography,
  NOW()
FROM public.profiles p
ON CONFLICT (user_id) DO UPDATE SET
  location = EXCLUDED.location,
  approx_location = EXCLUDED.approx_location,
  updated_at = NOW();
