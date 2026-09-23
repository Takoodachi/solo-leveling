-- Solo Leveling: water counter + customizable Home screen.
--
-- Run after 20260922000000_checkins.sql. Idempotent: safe to re-run.
-- Paste into Supabase → SQL Editor → Run.

-- Water is a daily check-in row ("water-YYYY-MM-DD") with a running amount in ml.
alter table public.checkins add column if not exists amount numeric;

alter table public.settings
  add column if not exists "homeWidgets" jsonb,
  add column if not exists "waterGoalMl" integer,
  add column if not exists "waterGlassMl" integer;

notify pgrst, 'reload schema';
