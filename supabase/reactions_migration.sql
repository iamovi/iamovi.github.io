-- reactions table
create table reactions (
  id bigint generated always as identity primary key,
  target_type text not null, -- 'blog', 'project', 'comment'
  target_id text not null,   -- post slug, project slug, or comment id
  reaction text not null,    -- 'skull', 'fire', 'alien', 'lol'
  created_at timestamptz not null default now()
);

-- index for fast count queries
create index on reactions (target_type, target_id, reaction);

-- enable RLS
alter table reactions enable row level security;

-- allow anyone to read
create policy "allow public read"
  on reactions for select
  using (true);

-- allow anyone to react
create policy "allow public insert"
  on reactions for insert
  with check (true);
