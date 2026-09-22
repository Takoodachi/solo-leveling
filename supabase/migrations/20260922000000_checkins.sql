-- Solo Leveling: daily check-ins (creatine) + settings.creatineEnabled.
--
-- Run after 20260921000000_sync_v2.sql. Idempotent: safe to re-run.
-- Paste into Supabase → SQL Editor → Run.
--
-- Strength ranks need no server changes: they're computed on-device from
-- workouts, weigh-ins and settings.sex, which already sync.

create table if not exists public.checkins (
  uuid text not null,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  date text,
  key text,
  done boolean not null default false,
  "updatedAt" bigint not null default 0,
  "serverUpdatedAt" bigint not null default 0,
  deleted boolean not null default false,
  primary key (user_id, uuid)
);

alter table public.checkins enable row level security;
drop policy if exists sl_owner_only on public.checkins;
create policy sl_owner_only on public.checkins for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
grant select, insert, update, delete on public.checkins to authenticated;

-- Same last-write-wins stamp as every other synced table (function from sync_v2).
drop trigger if exists sl_stamp on public.checkins;
create trigger sl_stamp before insert or update on public.checkins
  for each row execute function public.sl_stamp_row();
create index if not exists checkins_sl_sync_idx on public.checkins (user_id, "serverUpdatedAt");

alter table public.settings add column if not exists "creatineEnabled" boolean;

notify pgrst, 'reload schema';
