create table if not exists public.series_shows (
  id uuid primary key default gen_random_uuid(), title text not null, synopsis text not null,
  categories jsonb not null default '[]'::jsonb, age_rating text not null default '13+',
  created_at timestamptz not null default now()
);
create table if not exists public.series_seasons (
  id uuid primary key default gen_random_uuid(), series_id uuid not null references public.series_shows(id) on delete cascade,
  number integer not null check (number > 0), title text not null, created_at timestamptz not null default now(), unique(series_id, number)
);
alter table public.series_shows enable row level security;
alter table public.series_seasons enable row level security;
