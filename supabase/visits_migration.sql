-- visits table — one row per page visit
create table if not exists visits (
  id bigint generated always as identity primary key,
  visited_at timestamptz not null default now()
);

-- index for fast daily count queries
create index if not exists visits_visited_at_idx on visits (visited_at);

alter table visits enable row level security;

-- anyone can insert (record a visit)
create policy "Anyone can insert visits"
  on visits for insert
  with check (true);

-- anyone can read (for the count display)
create policy "Anyone can read visits"
  on visits for select
  using (true);

-- RPC function: returns today's visit count using Bangladesh time (UTC+6)
create or replace function get_today_visit_count()
returns bigint
language sql
security definer
as $$
  select count(*) from visits
  where (visited_at at time zone 'Asia/Dhaka')::date = (now() at time zone 'Asia/Dhaka')::date;
$$;
