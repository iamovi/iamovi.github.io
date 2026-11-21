-- ============================================================
-- chat_messages soft delete (admin moderation tombstones)
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================
--
-- Deleting a chat message from admin/index.html keeps the row and blanks its
-- text, so the room can show "[ admin deleted this message ]" in place instead
-- of the message silently vanishing. The row is only treated as a tombstone
-- when deleted_at is set — never by name, because the reserved-name guard lives
-- in the Cloudflare Worker while RLS only blocks 'bot'. The anon key is public,
-- so anyone can POST name='system' straight to Supabase and bypass the Worker.
--
-- The message text is cleared on delete, not kept. Otherwise the moderation
-- removes nothing: the original text would stay readable through the public
-- read policy. There is no undo; a deleted message cannot be restored.

alter table chat_messages
  add column if not exists deleted_at timestamptz;

-- ------------------------------------------------------------
-- UPDATE: signed-in admin only.
--
-- No update policy exists on this table today, so RLS already blocks every
-- update; this adds exactly one, for the admin panel's PATCH. Anonymous
-- visitors get no update path, which is what keeps deleted_at unforgeable.
--
-- using/with check make a row go live -> deleted only: the using clause matches
-- rows that are not yet deleted, and the with check requires the result to be
-- deleted, so a tombstone can never be revived. Note that RLS cannot restrict
-- which columns an update touches, so this permits any column write by a
-- signed-in admin — acceptable, since that is the site owner.
-- ------------------------------------------------------------
drop policy if exists "allow auth update chat" on chat_messages;
create policy "allow auth update chat"
  on chat_messages for update
  using (auth.role() = 'authenticated' and deleted_at is null)
  with check (auth.role() = 'authenticated' and deleted_at is not null);

-- Matches the admin list's keyset cursor (order=created_at.desc,id.desc plus the
-- or=(created_at.lt...,and(created_at.eq...,id.lt...)) filter), so paging stays
-- an index walk rather than a sort. The chat room's own queries filter on
-- created_at/id and are served by the existing primary key.
create index if not exists chat_messages_created_at_id_idx
  on chat_messages (created_at desc, id desc);
