-- Solo Leveling: a custom food can be removed (foods."removed"). The row stays, flagged,
-- because every total is worked out from the food behind each log.
--
-- Run after 20261014000000_health_prefs.sql. Idempotent: safe to re-run.
-- Paste into Supabase → SQL Editor → Run.
--
-- Run this BEFORE the app update goes live: PostgREST rejects unknown columns,
-- so until then foods (favorites, custom foods) won't sync (other tables are unaffected).

alter table public.foods
  add column if not exists "removed" boolean;

notify pgrst, 'reload schema';
