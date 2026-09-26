-- Solo Leveling: show or hide the search bar on Home (settings.showSearch).
--
-- Run after 20260927000000_theme_nav_avatar.sql. Idempotent: safe to re-run.
-- Paste into Supabase → SQL Editor → Run.
--
-- Run this BEFORE the app update goes live: PostgREST rejects unknown columns,
-- so until then settings changes won't sync (other tables are unaffected).

alter table public.settings
  add column if not exists "showSearch" boolean;

notify pgrst, 'reload schema';
