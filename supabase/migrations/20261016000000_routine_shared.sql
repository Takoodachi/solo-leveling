-- Solo Leveling: a routine can be shared with friends (routines."shared"). Shared routines
-- travel in the leaderboard snapshot, where friends find them and copy them.
--
-- Run after 20261015000000_food_removed.sql. Idempotent: safe to re-run.
-- Paste into Supabase → SQL Editor → Run.
--
-- Run this BEFORE the app update goes live: PostgREST rejects unknown columns,
-- so until then routines won't sync (other tables are unaffected).

alter table public.routines
  add column if not exists "shared" boolean;

notify pgrst, 'reload schema';
