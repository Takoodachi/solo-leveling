-- Solo Leveling: three more settings.
--   "workoutTips"   show or hide the weight/rep tips in the workout logger
--   "appShortcuts"  the long-press actions on the Android app's icon, in order
--   "customTheme"   the palette a user mixed themselves (used when theme = 'custom')
--
-- Run after 20260930000000_reminders_push.sql. Idempotent: safe to re-run.
-- Paste into Supabase → SQL Editor → Run.
--
-- Run this BEFORE the app update goes live: PostgREST rejects unknown columns,
-- so until then settings changes won't sync (other tables are unaffected).

alter table public.settings
  add column if not exists "workoutTips" boolean,
  add column if not exists "appShortcuts" jsonb,
  add column if not exists "customTheme" jsonb;

notify pgrst, 'reload schema';
