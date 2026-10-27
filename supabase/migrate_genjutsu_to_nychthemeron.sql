-- Migration: Update legacy 'genjutsu' reactions to 'nychthemeron'
-- Run this in your Supabase SQL Editor if you want to permanently rename the records in the database.

UPDATE reactions
SET target_id = 'nychthemeron'
WHERE target_type = 'project' AND target_id = 'genjutsu';
