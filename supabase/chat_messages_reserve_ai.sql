-- ============================================================
-- Reserve the 'ai' name in chat_messages
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================
--
-- The @ai replies are written by the Cloudflare Worker with the service-role key,
-- which bypasses RLS. This extends the 'bot' insert guard so a client hitting the
-- Supabase REST API directly (with the public anon key) cannot impersonate the AI.
--
-- Mirrors chat_messages_rls_hardening.sql, which blocks 'bot'.

drop policy if exists "allow_public_insert_chat" on chat_messages;
create policy "allow_public_insert_chat"
  on chat_messages for insert
  with check (lower(btrim(name)) not in ('bot', 'ai'));
