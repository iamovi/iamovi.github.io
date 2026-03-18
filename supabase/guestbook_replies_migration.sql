-- add reply support to guestbook
alter table guestbook
  add column parent_id bigint references guestbook(id) on delete cascade;
