-- Solo Leveling: reminders (what to be reminded of) and their delivery by web push.
--
-- Run after 20260921000000_sync_v2.sql. Idempotent: safe to re-run.
-- Paste into Supabase → SQL Editor → Run.
--
-- Run it BEFORE deploying the app version with Settings → Reminders: that version syncs a
-- new `reminders` column, and settings stop syncing until the column exists.
--
-- The tables alone send nothing. The push job (pg_cron + the send-reminders Edge Function)
-- is set up separately: see README, "Reminder notifications".

alter table public.settings add column if not exists reminders jsonb;

-- A browser or home-screen app that asked for reminders. The endpoint and keys are all a push
-- needs, so they're readable only by the account they belong to.
create table if not exists public.push_subscriptions (
  endpoint text primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  p256dh text not null,
  auth text not null,
  "updatedAt" bigint not null default 0
);

alter table public.push_subscriptions enable row level security;
drop policy if exists sl_owner_only on public.push_subscriptions;
create policy sl_owner_only on public.push_subscriptions for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
grant select, insert, update, delete on public.push_subscriptions to authenticated;
create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);

-- The coming reminders, worked out on the user's own device (it knows the timezone and what
-- has already been logged that day). The push job sends the due ones and deletes them.
create table if not exists public.push_queue (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  key text not null,
  "fireAt" bigint not null,
  title text not null,
  body text,
  url text,
  primary key (user_id, key)
);

alter table public.push_queue enable row level security;
drop policy if exists sl_owner_only on public.push_queue;
create policy sl_owner_only on public.push_queue for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
grant select, insert, update, delete on public.push_queue to authenticated;
create index if not exists push_queue_fire_idx on public.push_queue ("fireAt");

-- The push job: hands what's due to the send-reminders Edge Function and clears it from the
-- queue. Scheduled every minute by pg_cron with the project's function URL and anon key (see
-- README). It only reaches the network when something is due.
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

create or replace function public.sl_send_due_pushes(function_url text, anon_key text)
returns void
language plpgsql
set search_path = public
as $$
declare
  now_ms bigint := (extract(epoch from now()) * 1000)::bigint;
  messages jsonb;
begin
  with due as (
    delete from public.push_queue where "fireAt" <= now_ms
    returning user_id, key, "fireAt", title, body, url
  )
  select jsonb_agg(jsonb_build_object(
           'endpoint', s.endpoint, 'p256dh', s.p256dh, 'auth', s.auth,
           'title', d.title, 'body', d.body, 'url', d.url, 'tag', d.key))
    into messages
    from due d
    join public.push_subscriptions s on s.user_id = d.user_id
   -- More than an hour late (the job was down): the moment has passed
   where d."fireAt" > now_ms - 3600000;

  if messages is not null then
    perform net.http_post(
      url := function_url,
      headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || anon_key),
      body := jsonb_build_object('messages', messages)
    );
  end if;

  -- Devices refresh their subscription daily; one silent for two months is gone
  delete from public.push_subscriptions where "updatedAt" < now_ms - 5184000000;
end
$$;

-- Only the scheduler runs it: it reads every account's due reminders (as the table owner)
revoke execute on function public.sl_send_due_pushes(text, text) from public, anon, authenticated;

notify pgrst, 'reload schema';
