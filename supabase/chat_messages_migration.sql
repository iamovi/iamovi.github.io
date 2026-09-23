-- ============================================================
-- chat_messages table & policies for chatguys section
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- Step 1: Create chat_messages table
create table if not exists chat_messages (
  id bigint generated always as identity primary key,
  name text not null,
  message text not null,
  created_at timestamptz not null default now()
);

-- Step 2: Enable Row Level Security (RLS)
alter table chat_messages enable row level security;

-- Step 3: Policies for public access (drop first to prevent duplicate policy errors)
drop policy if exists "allow_public_read_chat" on chat_messages;
create policy "allow_public_read_chat"
  on chat_messages for select
  using (true);

drop policy if exists "allow_public_insert_chat" on chat_messages;
create policy "allow_public_insert_chat"
  on chat_messages for insert
  with check (true);

drop policy if exists "allow_public_delete_chat" on chat_messages;
create policy "allow_public_delete_chat"
  on chat_messages for delete
  using (true);

-- Step 4: Automatic daily cleanup (requires pg_cron extension)
-- Deletes messages older than 7 days every night at midnight (00:00 UTC)
create extension if not exists pg_cron;

do $$
begin
  perform cron.unschedule('delete-old-chat-messages');
exception when others then null;
end $$;

select cron.schedule(
  'delete-old-chat-messages',
  '0 0 * * *',
  $$
    delete from chat_messages
    where created_at < now() - interval '7 days';
  $$
);

