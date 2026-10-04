-- Solo Leveling: a note per exercise (machine settings, grip, cues).
--
-- Run after 20260921000000_sync_v2.sql. Idempotent: safe to re-run.
-- Paste into Supabase → SQL Editor → Run.
--
-- Until this runs, notes stay on the device (pending) and sync reports an
-- error for this table only; everything else keeps syncing.

create table if not exists public.exercise_notes (
  uuid text not null,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  "exerciseId" text,
  text text,
  "updatedAt" bigint not null default 0,
  "serverUpdatedAt" bigint not null default 0,
  deleted boolean not null default false,
  primary key (user_id, uuid)
);

alter table public.exercise_notes enable row level security;
drop policy if exists sl_owner_only on public.exercise_notes;
create policy sl_owner_only on public.exercise_notes for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
grant select, insert, update, delete on public.exercise_notes to authenticated;

-- Same last-write-wins stamp as every other synced table (function from sync_v2).
drop trigger if exists sl_stamp on public.exercise_notes;
create trigger sl_stamp before insert or update on public.exercise_notes
  for each row execute function public.sl_stamp_row();
create index if not exists exercise_notes_sl_sync_idx on public.exercise_notes (user_id, "serverUpdatedAt");

notify pgrst, 'reload schema';
