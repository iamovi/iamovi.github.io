-- status table (single row)
create table status (
  id bigint generated always as identity primary key,
  message text not null default '',
  updated_at timestamptz not null default now()
);

-- insert the one row
insert into status (message) values ('building something cool');

-- enable RLS
alter table status enable row level security;

-- anyone can read
create policy "allow public read"
  on status for select
  using (true);

-- only authenticated users (you) can update
create policy "allow auth update"
  on status for update
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- auto-update updated_at on change
create or replace function update_status_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger status_updated
  before update on status
  for each row execute function update_status_timestamp();
