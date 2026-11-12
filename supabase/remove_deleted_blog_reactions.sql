-- Migration: Remove reactions for deleted blog posts ('dear-brain', 'commit-like-a-pro')
-- Run this in your Supabase SQL Editor to clean up orphaned rows left behind
-- after the posts were removed from blog.json.

delete from reactions
where target_type = 'blog'
  and target_id in ('dear-brain', 'commit-like-a-pro');
