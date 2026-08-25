create table if not exists public.analytics_events (
  id bigint generated always as identity primary key,
  movie_id uuid not null references public.movies(id) on delete cascade,
  viewer_id uuid not null,
  event_type text not null default 'play' check (event_type in ('play')),
  created_at timestamptz not null default now()
);
create index if not exists analytics_events_created_at_idx on public.analytics_events(created_at desc);
create index if not exists analytics_events_movie_id_idx on public.analytics_events(movie_id);
alter table public.analytics_events enable row level security;
