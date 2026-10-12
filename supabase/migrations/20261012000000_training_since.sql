-- Solo Leveling: when the user started training (settings."trainingSince", YYYY-MM-DD).
-- The weekly set-volume targets take their level (beginner / intermediate / advanced) from it.
--
-- Run after 20261011000000_exercise_unit.sql. Idempotent: safe to re-run.
-- Paste into Supabase → SQL Editor → Run.
--
-- Run this BEFORE the app update goes live: PostgREST rejects unknown columns,
-- so until then settings changes won't sync (other tables are unaffected).

alter table public.settings
  add column if not exists "trainingSince" text;

notify pgrst, 'reload schema';
