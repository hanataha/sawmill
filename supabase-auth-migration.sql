-- Sawmill auth migration: run once in Supabase SQL Editor (or via psql)
-- Archive stays publicly readable; writing notes requires login.

alter table public.notes
  add column if not exists user_id uuid references auth.users (id) on delete set null;

create index if not exists notes_user_id_idx on public.notes (user_id);

alter table public.notes enable row level security;

drop policy if exists "Public read notes" on public.notes;
drop policy if exists "Auth insert own notes" on public.notes;
drop policy if exists "Auth update own notes" on public.notes;
drop policy if exists "Auth delete own notes" on public.notes;

create policy "Public read notes"
  on public.notes for select
  using (true);

create policy "Auth insert own notes"
  on public.notes for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Auth update own notes"
  on public.notes for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Auth delete own notes"
  on public.notes for delete
  to authenticated
  using (auth.uid() = user_id);

-- Storage: public read, authenticated upload to note-images
drop policy if exists "Public read note images" on storage.objects;
drop policy if exists "Auth upload note images" on storage.objects;
drop policy if exists "Auth update own note images" on storage.objects;
drop policy if exists "Auth delete own note images" on storage.objects;

create policy "Public read note images"
  on storage.objects for select
  using (bucket_id = 'note-images');

create policy "Auth upload note images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'note-images' and auth.role() = 'authenticated');

create policy "Auth update own note images"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'note-images' and auth.role() = 'authenticated');

create policy "Auth delete own note images"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'note-images' and auth.role() = 'authenticated');
