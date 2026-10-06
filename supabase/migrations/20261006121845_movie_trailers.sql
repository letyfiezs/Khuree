alter table public.movies
  add column if not exists trailer_key text,
  add column if not exists trailer_duration_seconds integer not null default 300
    check (trailer_duration_seconds between 300 and 600);
