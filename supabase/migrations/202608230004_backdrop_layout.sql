alter table public.movies add column if not exists backdrop_position_x smallint not null default 50 check (backdrop_position_x between 0 and 100);
alter table public.movies add column if not exists backdrop_position_y smallint not null default 50 check (backdrop_position_y between 0 and 100);
alter table public.movies add column if not exists backdrop_zoom smallint not null default 100 check (backdrop_zoom between 100 and 200);
