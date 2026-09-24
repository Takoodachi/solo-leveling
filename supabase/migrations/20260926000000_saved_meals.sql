-- Solo Leveling: saved meals (log a named set of foods in one tap).
--
-- Run after 20260921000000_sync_v2.sql. Idempotent: safe to re-run.
-- Paste into Supabase → SQL Editor → Run.
--
-- Until this runs, saved meals stay on the device (pending) and sync reports an
-- error for this table only; everything else keeps syncing.

create table if not exists public.saved_meals (
  uuid text not null,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text,
  items jsonb not null default '[]'::jsonb,
  "mealType" text,
  "updatedAt" bigint not null default 0,
  "serverUpdatedAt" bigint not null default 0,
  deleted boolean not null default false,
  primary key (user_id, uuid)
);

alter table public.saved_meals enable row level security;
drop policy if exists sl_owner_only on public.saved_meals;
create policy sl_owner_only on public.saved_meals for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
grant select, insert, update, delete on public.saved_meals to authenticated;

-- Same last-write-wins stamp as every other synced table (function from sync_v2).
drop trigger if exists sl_stamp on public.saved_meals;
create trigger sl_stamp before insert or update on public.saved_meals
  for each row execute function public.sl_stamp_row();
create index if not exists saved_meals_sl_sync_idx on public.saved_meals (user_id, "serverUpdatedAt");

notify pgrst, 'reload schema';
