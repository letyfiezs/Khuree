alter table public.orphan_uploads drop constraint if exists orphan_uploads_owner_id_fkey;
alter table public.orphan_uploads alter column owner_id type text using owner_id::text;
alter table public.movies alter column created_by drop not null;
