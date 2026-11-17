-- Settings → Units (November 2026): the unit every weight is shown and typed in (kg | lb) and
-- the height's (cm | ftin). Stored weights stay kg and heights cm; these only say how to show them.
-- Run before deploying: PostgREST turns away a settings row with columns it doesn't know.
alter table public.settings add column if not exists "weightUnit" text;
alter table public.settings add column if not exists "heightUnit" text;
