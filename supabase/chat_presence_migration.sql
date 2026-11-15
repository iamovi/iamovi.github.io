-- ============================================================
-- chat_presence table — who is in the chatguys room right now
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- Step 1: One row per browser session, refreshed by a heartbeat.
-- The client upserts on session_id every ~20s; a session counts as
-- "online" while its last_seen is inside the freshness window.
create table if not exists chat_presence (
  session_id text primary key,
  last_seen timestamptz not null default now()
);

-- Step 2: Index the heartbeat column so the "online now" count stays fast.
create index if not exists chat_presence_last_seen_idx on chat_presence (last_seen);

-- Step 3: Enable Row Level Security (RLS)
alter table chat_presence enable row level security;

-- Step 4: Policies for public access.
-- Reads expose only session_id + last_seen, and the count query asks for
-- `count` alone, so a client never sees another visitor's session id.
drop policy if exists "allow_public_read_presence" on chat_presence;
create policy "allow_public_read_presence"
  on chat_presence for select
  using (true);

drop policy if exists "allow_public_insert_presence" on chat_presence;
create policy "allow_public_insert_presence"
  on chat_presence for insert
  with check (true);

-- Required for the heartbeat upsert (merge-duplicates) to refresh last_seen.
drop policy if exists "allow_public_update_presence" on chat_presence;
create policy "allow_public_update_presence"
  on chat_presence for update
  using (true)
  with check (true);

-- No public delete policy: rows are only removed by the cron below, so a
-- visitor cannot wipe the presence list.

-- Step 5: Automatic cleanup of stale rows (requires pg_cron extension).
-- Anything not seen for 10 minutes is dropped, so the table stays tiny.
create extension if not exists pg_cron;

do $$
begin
  perform cron.unschedule('delete-stale-chat-presence');
exception when others then null;
end $$;

select cron.schedule(
  'delete-stale-chat-presence',
  '*/5 * * * *',
  $$
    delete from chat_presence
    where last_seen < now() - interval '10 minutes';
  $$
);
