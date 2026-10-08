alter table public.movies
  add column if not exists trailer_aspect text not null default '16:9';

alter table public.movies
  drop constraint if exists movies_trailer_aspect_check;

alter table public.movies
  add constraint movies_trailer_aspect_check
  check (trailer_aspect in ('16:9', '9:16'));

update public.movies
set trailer_aspect = '9:16'
where id in (
  '859e82c2-f330-4665-bb00-7c48179f9b9a',
  'f8f42868-f9ed-4a04-82c2-0e0c758ca791'
);
