-- Drop sets, rest-pause and partials (November 2026): a set row that carries on the set before it,
-- with no rest between ('drop' | 'rest-pause' | 'partials'; null on an ordinary set). See
-- src/features/workouts/setKinds.ts. A set taken to failure needs no column: it's rpe 10.
-- Run before deploying: PostgREST turns away a set row with columns it doesn't know.
alter table public.workout_sets add column if not exists "kind" text;
