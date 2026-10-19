-- Solo Leveling: a routine can carry a photo of its own (routines."image", a JPEG data URL of
-- about 100 KB), shown behind it on Home, Workouts and its page. Never in the leaderboard snapshot.
--
-- Run after 20261017000000_share_routines.sql. Idempotent: safe to re-run.
-- Paste into Supabase → SQL Editor → Run.
--
-- Run this BEFORE the app update goes live: PostgREST rejects unknown columns,
-- so until then routines won't sync (other tables are unaffected).

alter table public.routines
  add column if not exists "image" text;

notify pgrst, 'reload schema';
