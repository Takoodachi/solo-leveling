-- Solo Leveling: achievements picked as goals (settings."achievementGoals", a list of keys).
--
-- Run after 20261007000000_settings_tips_shortcuts_theme.sql. Idempotent: safe to re-run.
-- Paste into Supabase → SQL Editor → Run.
--
-- Run this BEFORE the app update goes live: PostgREST rejects unknown columns,
-- so until then settings changes won't sync (other tables are unaffected).

alter table public.settings
  add column if not exists "achievementGoals" jsonb;

notify pgrst, 'reload schema';
