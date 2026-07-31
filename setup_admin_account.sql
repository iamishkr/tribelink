-- =====================================================================
-- TribeLink — Admin Account Setup
-- Run this ONCE in your Supabase SQL Editor
-- Go to: https://supabase.com/dashboard → your project → SQL Editor
-- =====================================================================

-- Creates admin user in Supabase Auth with email + password
-- Password is set to: Admin@TribeLink2025
-- You can change it after first login in Supabase Auth → Users

SELECT auth.create_user(
  '{
    "email": "admin@tribelink.app",
    "password": "Admin@TribeLink2025",
    "email_confirm": true,
    "user_metadata": {
      "name": "TribeLink Admin",
      "role": "admin"
    }
  }'::jsonb
);
