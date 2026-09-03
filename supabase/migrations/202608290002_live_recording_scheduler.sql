create table if not exists public.live_recordings (
  id uuid primary key default gen_random_uuid(), channel_id text not null, channel_name text not null,
  stream_url text not null, title text not null, scheduled_at timestamptz not null,
  duration_minutes integer check (duration_minutes between 1 and 720),
  status text not null default 'scheduled' check (status in ('scheduled','recording','uploading','completed','failed','cancelled')),
  object_key text, bytes bigint not null default 0, started_at timestamptz, ends_at timestamptz, finished_at timestamptz,
  error_message text, worker_id text, created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists live_recordings_due_idx on public.live_recordings(status, scheduled_at);
alter table public.live_recordings enable row level security;
revoke all on public.live_recordings from anon, authenticated;

alter table public.live_recordings alter column duration_minutes drop not null;
alter table public.live_recordings add column if not exists ends_at timestamptz;
