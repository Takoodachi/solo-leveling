-- Solo Leveling: the old address (solo-leveling.luongdtran06.workers.dev) no longer syncs.
--
-- That address stopped resolving in late October 2026, but a copy installed from it (a
-- home-screen app, a cached service worker) still ran and synced. At the owner's request
-- (2026-11-02), every Data API request that comes from that origin is refused before it runs.
-- Only the Data API (PostgREST) runs this; it is what sync and the leaderboard use.
--
-- Idempotent. To undo: alter role authenticator reset pgrst.db_pre_request; notify pgrst, 'reload config';

create or replace function public.sl_block_old_address() returns void
language plpgsql
set search_path = ''
as $$
begin
  if nullif(current_setting('request.headers', true), '')::json->>'origin' = 'https://solo-leveling.luongdtran06.workers.dev' then
    raise exception 'Solo Leveling has moved to https://solo-leveling.takoodachi.workers.dev'
      using errcode = '42501';
  end if;
end
$$;

grant execute on function public.sl_block_old_address() to anon, authenticated, service_role;

alter role authenticator set pgrst.db_pre_request = 'public.sl_block_old_address';
notify pgrst, 'reload config';
