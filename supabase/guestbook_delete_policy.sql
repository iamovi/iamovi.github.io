-- allow authenticated users (admin) to delete guestbook comments
create policy "allow auth delete"
  on guestbook for delete
  using (auth.role() = 'authenticated');
