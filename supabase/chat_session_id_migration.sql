-- ============================================================
-- Add session_id column to chat_messages for identity tracking
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- Add nullable session_id column (existing rows will have NULL, that's fine)
alter table chat_messages
  add column if not exists session_id text;

