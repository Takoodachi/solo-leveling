-- Solo Leveling: the unit an exercise is logged in (exercise_notes.unit: 'kg' or 'lb'; empty = kg).
-- Weights themselves are still stored in kg; this only says how the logger shows and takes them.
--
-- Run after 20260929000000_exercise_notes.sql. Idempotent: safe to re-run.
-- Paste into Supabase → SQL Editor → Run.
--
-- Run this BEFORE the app update goes live: PostgREST rejects unknown columns, so until
-- then exercise notes and units won't sync (other tables are unaffected).

alter table public.exercise_notes
  add column if not exists unit text;

notify pgrst, 'reload schema';
