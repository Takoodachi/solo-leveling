-- Solo Leveling: adaptive targets (the weekly check-in) and training-day carbs.
--
-- Run after 20260921000000_sync_v2.sql. Idempotent: safe to re-run.
-- Paste into Supabase → SQL Editor → Run. Run it BEFORE deploying the app that syncs these
-- columns: PostgREST refuses unknown columns, so settings stop syncing until it runs.
--
-- goalPace: a cut's pace, % of body weight a week (0.25 / 0.5 / 0.75; null = 0.5).
-- trainingDayCarbs: carbs for fat on planned workout days (null = on).
-- The check-in's answers are check-ins (`targets-<Monday>`): no table of their own.

alter table public.settings add column if not exists "goalPace" numeric;
alter table public.settings add column if not exists "trainingDayCarbs" boolean;

notify pgrst, 'reload schema';
