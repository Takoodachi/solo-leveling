-- workout_sets.reps, duration and rpe were created as integer before 20260921000000_sync_v2.sql,
-- whose `add column if not exists ... numeric` left them as they were. A set of 7.5 (a cardio
-- entry's minutes, half a rep) was then refused, and with it every set pushed alongside it.
-- Idempotent: altering a numeric column to numeric changes nothing.
alter table public.workout_sets
  alter column reps type numeric,
  alter column duration type numeric,
  alter column rpe type numeric;
