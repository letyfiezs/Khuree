create extension if not exists pgcrypto;
create type public.app_role as enum ('user','admin');
create type public.content_status as enum ('draft','processing','published');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null, display_name text, role public.app_role not null default 'user',
  adult_enabled boolean not null default false, parental_pin_hash text, adult_unlocked_until timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create function public.handle_new_user() returns trigger language plpgsql security definer set search_path = '' as $$
begin insert into public.profiles(id,email,display_name) values(new.id,new.email,coalesce(new.raw_user_meta_data->>'name',split_part(new.email,'@',1))); return new; end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

create table public.genres (id uuid primary key default gen_random_uuid(), name text not null unique, slug text not null unique, created_at timestamptz not null default now());
create table public.series (id uuid primary key default gen_random_uuid(), title text not null, slug text not null unique, description text not null default '', poster_url text, backdrop_url text, age_rating text not null default '13+', status public.content_status not null default 'published', created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.seasons (id uuid primary key default gen_random_uuid(), series_id uuid not null references public.series(id) on delete cascade, number int not null check(number > 0), title text not null, unique(series_id,number));
create table public.movies (
  id uuid primary key default gen_random_uuid(), title text not null, slug text not null unique, description text not null default '', poster_url text, backdrop_url text,
  video_key text, original_filename text, content_type text, bytes bigint not null default 0, release_year int check(release_year between 1888 and 2200), duration text,
  rating numeric(3,1) not null default 0 check(rating between 0 and 10), age_rating text not null default '13+', status public.content_status not null default 'published', featured boolean not null default false,
  kind text not null default 'movie' check(kind in ('movie','series')), series_id uuid references public.series(id) on delete cascade, season_id uuid references public.seasons(id) on delete cascade,
  season_number int, episode_number int, created_by uuid references public.profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.movie_genres (movie_id uuid references public.movies(id) on delete cascade, genre_id uuid references public.genres(id) on delete cascade, primary key(movie_id,genre_id));
create table public.subtitles (id uuid primary key default gen_random_uuid(), movie_id uuid not null references public.movies(id) on delete cascade, label text not null, language text not null, object_key text not null, original_filename text not null);
create table public.orphan_uploads (object_key text primary key, owner_id text not null, upload_id text, created_at timestamptz not null default now());

alter table public.profiles enable row level security; alter table public.movies enable row level security; alter table public.genres enable row level security; alter table public.movie_genres enable row level security; alter table public.series enable row level security; alter table public.seasons enable row level security; alter table public.subtitles enable row level security; alter table public.orphan_uploads enable row level security;
create policy "profile read own" on public.profiles for select using(auth.uid()=id);
create policy "published movies readable" on public.movies for select using(status='published' or exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));
create policy "genres readable" on public.genres for select using(true); create policy "movie genres readable" on public.movie_genres for select using(true);
create policy "series readable" on public.series for select using(status='published' or exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));
create policy "seasons readable" on public.seasons for select using(true); create policy "subtitles authenticated read" on public.subtitles for select using(auth.uid() is not null);

insert into public.genres(name,slug) values ('Адал явдал','adventure'),('Драма','drama'),('Инээдмийн','comedy'),('Триллер','thriller'),('Гэмт хэрэг','crime'),('Түүхэн','history'),('Гэр бүлийн','family'),('Баримтат','documentary') on conflict do nothing;
