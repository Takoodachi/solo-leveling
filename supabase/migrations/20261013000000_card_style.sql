-- Solo Leveling: how cards are drawn (settings."cardStyle": solid, glass, outline, glow or bold).
--
-- Run after 20261012000000_training_since.sql. Idempotent: safe to re-run.
-- Paste into Supabase → SQL Editor → Run.
--
-- Run this BEFORE the app update goes live: PostgREST rejects unknown columns,
-- so until then settings changes won't sync (other tables are unaffected).

alter table public.settings
  add column if not exists "cardStyle" text;

notify pgrst, 'reload schema';
