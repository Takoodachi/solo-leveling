-- Solo Leveling: colour theme, bottom-bar tabs and profile photo on settings.
--
-- Run after 20260921000000_sync_v2.sql. Idempotent: safe to re-run.
-- Paste into Supabase → SQL Editor → Run.
--
-- Run this BEFORE the app update goes live: PostgREST rejects unknown columns,
-- so until then settings changes won't sync (other tables are unaffected).
-- The photo also reaches friends inside the existing leaderboard snapshot
-- (jsonb), so the leaderboard table needs no change.

alter table public.settings
  add column if not exists "theme" text,
  add column if not exists "navTabs" jsonb,
  add column if not exists "avatar" text;

notify pgrst, 'reload schema';
