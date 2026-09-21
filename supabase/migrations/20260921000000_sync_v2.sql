-- Solo Leveling — sync v2 schema.
--
-- Idempotent: safe to run on the restored project (tables already exist) or a
-- brand-new one, and safe to re-run. Paste into Supabase → SQL Editor → Run.
--
-- What it does:
--   * Every synced table gets `deleted` (tombstone) and `serverUpdatedAt`
--     (server clock, used as the pull cursor so offline edits aren't missed).
--   * Collection tables are keyed by (user_id, uuid) so two users can never
--     collide on the same row id (e.g. the same barcode food).
--   * A trigger stamps serverUpdatedAt and rejects stale writes (last-write-wins
--     on the client's "updatedAt").
--   * RLS: each user can only see/write their own rows. Any older policies on
--     these tables are dropped so nothing more permissive survives.
--
-- Column names are camelCase (quoted) because the app syncs its local rows as-is.

-- ── Helpers ──────────────────────────────────────────────────────────────────

create or replace function public.sl_now_ms() returns bigint
language sql volatile
set search_path = ''
as $$ select (extract(epoch from clock_timestamp()) * 1000)::bigint $$;

create or replace function public.sl_stamp_row() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE'
     and old."updatedAt" is not null
     and new."updatedAt" is not null
     and new."updatedAt" < old."updatedAt" then
    return null; -- stale write from a device that was offline: keep the newer row
  end if;
  new."serverUpdatedAt" := public.sl_now_ms();
  return new;
end $$;

-- Make `cols` the table's primary key (drops a different existing PK first).
create or replace function public.sl_set_pk(tbl text, cols text) returns void
language plpgsql as $$
declare
  pk_name text;
  pk_def  text;
begin
  select conname, pg_get_constraintdef(oid) into pk_name, pk_def
  from pg_constraint
  where conrelid = format('public.%I', tbl)::regclass and contype = 'p';

  if pk_def is distinct from format('PRIMARY KEY (%s)', cols) then
    if pk_name is not null then
      execute format('alter table public.%I drop constraint %I cascade', tbl, pk_name);
    end if;
    execute format('alter table public.%I add primary key (%s)', tbl, cols);
  end if;
end $$;

-- Common sync plumbing for one table: sync columns, owner column, RLS, trigger, index.
create or replace function public.sl_prepare(tbl text, pk_cols text) returns void
language plpgsql as $$
declare
  pol record;
begin
  execute format('alter table public.%I add column if not exists "updatedAt" bigint not null default 0', tbl);
  execute format('alter table public.%I add column if not exists "serverUpdatedAt" bigint not null default 0', tbl);
  execute format('alter table public.%I add column if not exists deleted boolean not null default false', tbl);
  execute format('alter table public.%I alter column user_id set default auth.uid()', tbl);
  -- Rows without an owner are unreachable through RLS anyway.
  execute format('delete from public.%I where user_id is null', tbl);
  execute format('alter table public.%I alter column user_id set not null', tbl);

  perform public.sl_set_pk(tbl, pk_cols);

  execute format('alter table public.%I enable row level security', tbl);
  for pol in select policyname from pg_policies where schemaname = 'public' and tablename = tbl loop
    execute format('drop policy %I on public.%I', pol.policyname, tbl);
  end loop;
  execute format(
    'create policy sl_owner_only on public.%I for all to authenticated '
    'using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))',
    tbl
  );
  execute format('grant select, insert, update, delete on public.%I to authenticated', tbl);

  execute format('drop trigger if exists sl_stamp on public.%I', tbl);
  execute format(
    'create trigger sl_stamp before insert or update on public.%I '
    'for each row execute function public.sl_stamp_row()',
    tbl
  );
  execute format(
    'create index if not exists %I on public.%I (user_id, "serverUpdatedAt")',
    tbl || '_sl_sync_idx', tbl
  );
end $$;

-- ── Collection tables (one row per item, keyed by user_id + uuid) ────────────

create table if not exists public.foods (
  uuid text not null,
  user_id uuid not null default auth.uid() references auth.users on delete cascade
);
alter table public.foods
  add column if not exists name text,
  add column if not exists "kcalPerServing" numeric,
  add column if not exists protein numeric,
  add column if not exists carbs numeric,
  add column if not exists fat numeric,
  add column if not exists "servingSize" numeric,
  add column if not exists "servingUnit" text,
  add column if not exists "isCustom" boolean,
  add column if not exists "isFavorite" boolean,
  add column if not exists ingredients jsonb,
  add column if not exists notes text;

create table if not exists public.food_log (
  uuid text not null,
  user_id uuid not null default auth.uid() references auth.users on delete cascade
);
alter table public.food_log
  add column if not exists date text,
  add column if not exists "foodId" text,
  add column if not exists servings numeric,
  add column if not exists "mealType" text;

create table if not exists public.body_metrics (
  uuid text not null,
  user_id uuid not null default auth.uid() references auth.users on delete cascade
);
alter table public.body_metrics
  add column if not exists date text,
  add column if not exists "weightKg" numeric,
  add column if not exists notes text;

create table if not exists public.daily_activity (
  uuid text not null,
  user_id uuid not null default auth.uid() references auth.users on delete cascade
);
alter table public.daily_activity
  add column if not exists date text,
  add column if not exists steps integer;

create table if not exists public.achievements (
  uuid text not null,
  user_id uuid not null default auth.uid() references auth.users on delete cascade
);
alter table public.achievements
  add column if not exists key text,
  add column if not exists "unlockedAt" bigint,
  add column if not exists progress numeric;

create table if not exists public.exercises (
  uuid text not null,
  user_id uuid not null default auth.uid() references auth.users on delete cascade
);
alter table public.exercises
  add column if not exists name text,
  add column if not exists category text,
  add column if not exists type text,
  add column if not exists "defaultUnit" text,
  add column if not exists "isCustom" boolean,
  add column if not exists muscles jsonb,
  add column if not exists "musclesSecondary" jsonb,
  add column if not exists instructions text;

create table if not exists public.workouts (
  uuid text not null,
  user_id uuid not null default auth.uid() references auth.users on delete cascade
);
alter table public.workouts
  add column if not exists date text,
  add column if not exists name text,
  add column if not exists "routineId" text,
  add column if not exists notes text,
  add column if not exists "durationMin" numeric,
  add column if not exists "startedAt" bigint,
  add column if not exists "createdAt" bigint,
  add column if not exists "avgHeartRate" numeric,
  add column if not exists "kcalEst" numeric;

create table if not exists public.workout_sets (
  uuid text not null,
  user_id uuid not null default auth.uid() references auth.users on delete cascade
);
alter table public.workout_sets
  add column if not exists "workoutId" text,
  add column if not exists "exerciseId" text,
  add column if not exists "setIndex" integer,
  add column if not exists reps numeric,
  add column if not exists weight numeric,
  add column if not exists duration numeric,
  add column if not exists "distanceKm" numeric,
  add column if not exists rpe numeric;

create table if not exists public.routines (
  uuid text not null,
  user_id uuid not null default auth.uid() references auth.users on delete cascade
);
alter table public.routines
  add column if not exists name text,
  add column if not exists category text,
  add column if not exists level text,
  add column if not exists "estDurationMin" numeric,
  add column if not exists notes text,
  add column if not exists exercises jsonb,
  add column if not exists "scheduleDays" jsonb;

create table if not exists public.challenges (
  uuid text not null,
  user_id uuid not null default auth.uid() references auth.users on delete cascade
);
alter table public.challenges
  add column if not exists title text,
  add column if not exists metric text,
  add column if not exists target numeric,
  add column if not exists "startDate" text,
  add column if not exists "endDate" text,
  add column if not exists "createdAt" bigint;

-- daily_activity.uuid was created as a Postgres uuid; the app now uses text ids.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'daily_activity'
      and column_name = 'uuid' and data_type = 'uuid'
  ) then
    alter table public.daily_activity alter column uuid type text using uuid::text;
  end if;
end $$;

select public.sl_prepare(t, 'user_id, uuid')
from unnest(array[
  'foods', 'food_log', 'body_metrics', 'daily_activity', 'achievements',
  'exercises', 'workouts', 'workout_sets', 'routines', 'challenges'
]) as t;

-- ── Singleton tables (one row per user) ──────────────────────────────────────

create table if not exists public.targets (
  user_id uuid not null default auth.uid() references auth.users on delete cascade
);
alter table public.targets
  add column if not exists id integer default 1,
  add column if not exists "dailyKcal" numeric,
  add column if not exists "dailyProtein" numeric,
  add column if not exists "dailyCarbs" numeric,
  add column if not exists "dailyFat" numeric;

create table if not exists public.user_stats (
  user_id uuid not null default auth.uid() references auth.users on delete cascade
);
alter table public.user_stats
  add column if not exists id integer default 1,
  add column if not exists xp numeric,
  add column if not exists level integer,
  add column if not exists "currentStreak" integer,
  add column if not exists "longestStreak" integer,
  add column if not exists "lastLogDate" text,
  add column if not exists "streakFreezes" integer,
  add column if not exists "freezeWeek" text;

create table if not exists public.settings (
  user_id uuid not null default auth.uid() references auth.users on delete cascade
);
alter table public.settings
  add column if not exists id integer default 1,
  add column if not exists "displayName" text,
  add column if not exists "heightCm" numeric,
  add column if not exists sex text,
  add column if not exists "goalType" text,
  add column if not exists "dynamicTargetsEnabled" boolean,
  add column if not exists "activityWindowDays" integer,
  add column if not exists "dailyStepGoal" integer,
  add column if not exists "weeklyWorkoutGoal" integer,
  add column if not exists "defaultRestSeconds" integer,
  add column if not exists "reminderEnabled" boolean,
  add column if not exists "reminderTime" text,
  add column if not exists "reminderDays" text;

select public.sl_prepare(t, 'user_id')
from unnest(array['targets', 'user_stats', 'settings']) as t;

-- The helpers below were only needed while migrating.
drop function public.sl_prepare(text, text);
drop function public.sl_set_pk(text, text);

-- Make PostgREST pick up the new columns immediately.
notify pgrst, 'reload schema';
