-- Solo Leveling: high-fives on friends' highlights.
--
-- Run after 20261103000000_adaptive_targets.sql. Idempotent: safe to re-run.
--
-- One row per high-five: who gave it, whose highlight, and which one (its key,
-- "kind:name:date", as the app builds it). Kept from being a bother here, not
-- only in the app: only between people on the leaderboard, never to yourself,
-- once per highlight (the primary key), at most 40 a day per sender (trigger,
-- with the time stamped by the server so it can't be back-dated). Each person
-- reads only the high-fives they gave or got. Nothing is pushed: the app shows
-- them on the leaderboard and in at most one toast a day.

create table if not exists public.high_fives (
  from_user uuid not null default auth.uid() references auth.users (id) on delete cascade,
  to_user uuid not null references auth.users (id) on delete cascade,
  highlight text not null check (char_length(highlight) between 1 and 120),
  "createdAt" timestamptz not null default now(),
  primary key (from_user, to_user, highlight),
  check (from_user <> to_user)
);

create index if not exists high_fives_to_user on public.high_fives (to_user, "createdAt");

alter table public.high_fives enable row level security;

drop policy if exists sl_high_fives_read on public.high_fives;
create policy sl_high_fives_read on public.high_fives for select to authenticated
  using (from_user = (select auth.uid()) or to_user = (select auth.uid()));

drop policy if exists sl_high_fives_give on public.high_fives;
create policy sl_high_fives_give on public.high_fives for insert to authenticated
  with check (
    from_user = (select auth.uid())
    and exists (select 1 from public.leaderboard l where l.user_id = high_fives.from_user and l.visible)
    and exists (select 1 from public.leaderboard l where l.user_id = high_fives.to_user and l.visible)
  );

drop policy if exists sl_high_fives_take_back on public.high_fives;
create policy sl_high_fives_take_back on public.high_fives for delete to authenticated
  using (from_user = (select auth.uid()));

revoke all on public.high_fives from anon, authenticated;
grant select, insert, delete on public.high_fives to authenticated;

create or replace function public.sl_high_five_limit() returns trigger
language plpgsql set search_path = '' as $$
begin
  if (select count(*) from public.high_fives h
      where h.from_user = new.from_user and h."createdAt" > now() - interval '1 day') >= 40 then
    raise exception 'high-five limit reached' using errcode = 'P0001', hint = 'At most 40 a day';
  end if;
  new."createdAt" := now();
  return new;
end $$;

drop trigger if exists sl_high_five_limit on public.high_fives;
create trigger sl_high_five_limit before insert on public.high_fives
  for each row execute function public.sl_high_five_limit();

notify pgrst, 'reload schema';
