-- Solo Leveling: friends leaderboard.
--
-- Run after 20260924000000_volume_radar.sql. Idempotent: safe to re-run.
-- Paste into Supabase → SQL Editor → Run.
--
-- Each account publishes one row: a snapshot of what it shares (name, level,
-- streak, ranks, bodygraph, best lifts, rank history, this week's training),
-- computed on the device. Food, body weight and notes are never in it.
-- Every signed-in user can read the rows marked visible; only the owner can
-- write their own. Switching sharing off publishes visible = false and an empty
-- snapshot, so nothing is left behind on the server.

create table if not exists public.leaderboard (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  "displayName" text not null default '',
  visible boolean not null default true,
  snapshot jsonb not null default '{}'::jsonb,
  "updatedAt" timestamptz not null default now()
);

alter table public.leaderboard enable row level security;

drop policy if exists sl_leaderboard_read on public.leaderboard;
create policy sl_leaderboard_read on public.leaderboard for select to authenticated
  using (visible or user_id = (select auth.uid()));

drop policy if exists sl_leaderboard_write on public.leaderboard;
create policy sl_leaderboard_write on public.leaderboard for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

grant select, insert, update, delete on public.leaderboard to authenticated;

-- Sharing switch (on unless the user turns it off).
alter table public.settings add column if not exists "shareOnLeaderboard" boolean;

notify pgrst, 'reload schema';
