-- Solo Leveling: what the app does by itself, each switchable in Settings → Extras
-- (settings."extras": { checkIn, recapBanner, caffeine, highFives, rankUps, haptics, workoutNotice },
-- false = off, a missing key = on).
--
-- Run after 20261104000000_high_fives.sql. Idempotent: safe to re-run.
-- Paste into Supabase → SQL Editor → Run.
--
-- Run this BEFORE the app update goes live: PostgREST rejects unknown columns,
-- so until then settings changes won't sync (other tables are unaffected).

alter table public.settings
  add column if not exists "extras" jsonb;

notify pgrst, 'reload schema';
