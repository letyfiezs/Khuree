alter table public.movies
  add column if not exists trailer_url text;

alter table public.movies
  drop constraint if exists movies_trailer_url_provider_check;

alter table public.movies
  add constraint movies_trailer_url_provider_check
  check (
    trailer_url is null
    or trailer_url ~* '^https://(([a-z0-9-]+\.)?(youtube\.com|facebook\.com)|([a-z0-9-]+\.)?(youtu\.be|fb\.watch))/'
  );
