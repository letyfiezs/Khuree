create table if not exists public.pricing_settings (
  id boolean primary key default true check (id),
  movie_price integer not null default 5900 check (movie_price > 0),
  series_price integer not null default 5900 check (series_price > 0),
  vertical_price integer not null default 5900 check (vertical_price > 0),
  adult_price integer not null default 5900 check (adult_price > 0),
  vip_price integer not null default 12900 check (vip_price > 0),
  plan_days integer not null default 30 check (plan_days between 1 and 365),
  default_rental_price integer not null default 5900 check (default_rental_price > 0),
  rental_hours integer not null default 72 check (rental_hours between 1 and 720),
  updated_at timestamptz not null default now()
);

insert into public.pricing_settings (id) values (true) on conflict (id) do nothing;

alter table public.movies add column if not exists is_free boolean not null default false;
alter table public.movies add column if not exists rental_price integer check (rental_price is null or rental_price > 0);
alter table public.series add column if not exists is_free boolean not null default false;
alter table public.series add column if not exists rental_price integer check (rental_price is null or rental_price > 0);
alter table public.series_shows add column if not exists is_free boolean not null default false;
alter table public.series_shows add column if not exists rental_price integer check (rental_price is null or rental_price > 0);

create table if not exists public.content_rentals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  movie_id uuid references public.movies(id) on delete cascade,
  series_id uuid references public.series(id) on delete cascade,
  order_id text not null unique,
  amount integer not null check (amount > 0),
  starts_at timestamptz not null default now(),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  check (num_nonnulls(movie_id, series_id) = 1),
  check (expires_at > starts_at)
);

create index if not exists content_rentals_user_id_idx on public.content_rentals (user_id);
create index if not exists content_rentals_movie_id_idx on public.content_rentals (movie_id);
create index if not exists content_rentals_series_id_idx on public.content_rentals (series_id);
create index if not exists content_rentals_expires_at_idx on public.content_rentals (expires_at);

alter table public.pricing_settings enable row level security;
alter table public.content_rentals enable row level security;

create policy "pricing is publicly readable" on public.pricing_settings
  for select to anon, authenticated using (true);
create policy "users read own rentals" on public.content_rentals
  for select to authenticated using ((select auth.uid()) = user_id);

grant select on public.pricing_settings to anon, authenticated;
grant select on public.content_rentals to authenticated;
