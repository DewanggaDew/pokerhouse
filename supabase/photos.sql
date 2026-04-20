-- PokerHouse · Session Photos
-- Idempotent migration. Safe to run multiple times in the Supabase SQL Editor.
-- Adds: session_photos table, a DB-enforced "max 2 photos per player per session"
-- rule, and a public storage bucket for the image files.

-- ---------------------------------------------------------------------------
-- 1. Table
-- ---------------------------------------------------------------------------
create table if not exists session_photos (
  id uuid default gen_random_uuid() primary key,
  session_id uuid not null references sessions(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  storage_path text not null unique,
  caption text,
  created_at timestamptz default now() not null
);

create index if not exists idx_session_photos_session on session_photos(session_id);
create index if not exists idx_session_photos_player on session_photos(player_id);
create index if not exists idx_session_photos_created on session_photos(created_at desc);

alter table session_photos enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'session_photos'
      and policyname = 'Allow all on session_photos'
  ) then
    create policy "Allow all on session_photos" on session_photos
      for all using (true) with check (true);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 2. Enforce the 2-photo-per-player-per-session limit at the DB layer
--    (fix at the cause, not only in the app)
-- ---------------------------------------------------------------------------
create or replace function enforce_session_photo_limit()
returns trigger
language plpgsql
as $$
declare
  existing_count int;
begin
  select count(*) into existing_count
  from session_photos
  where session_id = new.session_id
    and player_id = new.player_id;

  if existing_count >= 2 then
    raise exception 'PHOTO_LIMIT_REACHED: each player may upload at most 2 photos per session'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_session_photo_limit on session_photos;
create trigger trg_enforce_session_photo_limit
before insert on session_photos
for each row execute function enforce_session_photo_limit();

-- ---------------------------------------------------------------------------
-- 3. Storage bucket (public read, 5 MB max, images only)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'session-photos',
  'session-photos',
  true,
  5 * 1024 * 1024,
  array['image/jpeg','image/png','image/webp','image/gif','image/heic','image/heif']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Storage policies: permissive read/write/delete on the session-photos bucket
-- (matches the current single-host, no-auth model used by the other tables).
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'Public read session-photos'
  ) then
    create policy "Public read session-photos" on storage.objects
      for select using (bucket_id = 'session-photos');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'Anon upload session-photos'
  ) then
    create policy "Anon upload session-photos" on storage.objects
      for insert with check (bucket_id = 'session-photos');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'Anon update session-photos'
  ) then
    create policy "Anon update session-photos" on storage.objects
      for update using (bucket_id = 'session-photos')
      with check (bucket_id = 'session-photos');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'Anon delete session-photos'
  ) then
    create policy "Anon delete session-photos" on storage.objects
      for delete using (bucket_id = 'session-photos');
  end if;
end $$;
