create table if not exists public.live_movie_presence (
  viewer_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null,
  movie_id uuid not null references public.movies(id) on delete cascade,
  last_seen_at timestamptz not null default now(),
  primary key (viewer_id, session_id)
);

create index if not exists live_movie_presence_active_idx
  on public.live_movie_presence(last_seen_at desc, movie_id);
create index if not exists live_movie_presence_movie_id_idx
  on public.live_movie_presence(movie_id);

alter table public.live_movie_presence enable row level security;
revoke all on table public.live_movie_presence from anon, authenticated;
grant select, insert, update, delete on table public.live_movie_presence to service_role;
create policy "deny direct presence access"
  on public.live_movie_presence
  for all
  to anon, authenticated
  using (false)
  with check (false);
