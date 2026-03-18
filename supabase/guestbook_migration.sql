-- guestbook table
create table guestbook (
  id bigint generated always as identity primary key,
  name text not null default 'anon',
  message text not null,
  created_at timestamptz not null default now()
);

-- enable RLS
alter table guestbook enable row level security;

-- allow anyone to read
create policy "allow public read"
  on guestbook for select
  using (true);

-- allow anyone to post
create policy "allow public insert"
  on guestbook for insert
  with check (true);
