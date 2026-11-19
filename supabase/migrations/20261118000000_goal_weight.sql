-- Profile → Body & goals (November 2026): a goal weight, kept in kg and shown in the account's
-- unit; the weight page says how far the trend is from it and roughly when it gets there.
-- Run before deploying: PostgREST turns away a settings row with columns it doesn't know.
alter table public.settings add column if not exists "goalWeightKg" numeric;
