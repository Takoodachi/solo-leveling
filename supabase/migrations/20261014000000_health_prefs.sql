-- Solo Leveling: what the account remembers of the Android app's Samsung Health link
-- (settings."health": { steps, background }), so a fresh install can ask for access by itself.
--
-- Run after 20261013000000_card_style.sql. Idempotent: safe to re-run.
-- Paste into Supabase → SQL Editor → Run.
--
-- Run this BEFORE the app update goes live: PostgREST rejects unknown columns,
-- so until then settings changes won't sync (other tables are unaffected).

alter table public.settings
  add column if not exists "health" jsonb;

notify pgrst, 'reload schema';
