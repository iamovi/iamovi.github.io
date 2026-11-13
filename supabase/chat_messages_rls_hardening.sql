-- ============================================================
-- chat_messages RLS hardening
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================
--
-- Replaces the two blanket public policies from chat_messages_migration.sql:
--
--   allow_public_delete_chat   using (true)   -- anyone could delete ANY row
--   allow_public_insert_chat   with check (true)  -- anyone could post as 'bot'
--
-- The anon key is public, so those policies let anyone wipe the whole chat or
-- impersonate the bot straight against the Supabase REST API, bypassing the
-- Cloudflare Worker entirely.

-- ------------------------------------------------------------
-- DELETE: anonymous visitors may only remove rows older than 7 days
-- (the client-side purge); a signed-in admin may delete anything.
--
-- The admin panel authenticates with Supabase Auth, so auth.role() is
-- 'authenticated' there. That keeps an admin chat-moderation button working
-- once one is added to admin/index.html, and matches the guestbook's
-- "allow auth delete" policy.
-- ------------------------------------------------------------
drop policy if exists "allow_public_delete_chat" on chat_messages;
drop policy if exists "allow_public_delete_old_chat" on chat_messages;
create policy "allow_public_delete_old_chat"
  on chat_messages for delete
  using (
    created_at < now() - interval '7 days'
    or auth.role() = 'authenticated'
  );

-- ------------------------------------------------------------
-- INSERT: block the reserved 'bot' name so it cannot be impersonated.
--
-- The bot's replies are written by the Cloudflare Worker with the
-- service-role key, which bypasses RLS, so this does not affect the bot.
-- 'ovi' and the other reserved handles stay Worker-guarded (they are allowed
-- through only with a valid admin token), which RLS cannot see.
-- ------------------------------------------------------------
drop policy if exists "allow_public_insert_chat" on chat_messages;
create policy "allow_public_insert_chat"
  on chat_messages for insert
  with check (lower(btrim(name)) <> 'bot');
