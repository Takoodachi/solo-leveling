-- Solo Leveling: weekly set-volume radar settings.
--
-- Run after 20260923000000_home_water.sql. Idempotent: safe to re-run.
-- Paste into Supabase → SQL Editor → Run.

alter table public.settings
  add column if not exists "trainingLevel" text,
  add column if not exists "radarMuscles" jsonb;

notify pgrst, 'reload schema';
