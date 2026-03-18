-- ============================================================
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
-- Requires pg_cron extension — enable it first:
-- Dashboard → Database → Extensions → search "pg_cron" → enable
-- ============================================================

-- Step 1: enable pg_cron (safe to run even if already enabled)
create extension if not exists pg_cron;

-- Step 2: schedule daily cleanup at midnight Bangladesh time (UTC+6)
-- midnight BD = 18:00 UTC, so cron runs at 18:00 UTC every day
select cron.schedule(
  'delete-old-visits',           -- job name (unique identifier)
  '0 18 * * *',                  -- 18:00 UTC = 00:00 Asia/Dhaka (UTC+6)
  $$
    delete from visits
    where (visited_at at time zone 'Asia/Dhaka')::date
        < (now() at time zone 'Asia/Dhaka')::date;
  $$
);
