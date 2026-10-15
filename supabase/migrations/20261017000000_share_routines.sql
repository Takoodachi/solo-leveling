-- Settings → Leaderboard → "Show my routines": off keeps routines out of the leaderboard snapshot.
alter table public.settings add column if not exists "shareRoutines" boolean;

notify pgrst, 'reload schema';
