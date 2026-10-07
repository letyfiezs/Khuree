alter type public.content_status add value if not exists 'failed';

alter table public.movies
  add column if not exists hls_key text,
  add column if not exists hls_bytes bigint not null default 0 check (hls_bytes >= 0),
  add column if not exists transcode_progress smallint not null default 0 check (transcode_progress between 0 and 100),
  add column if not exists transcode_error text,
  add column if not exists transcode_started_at timestamptz,
  add column if not exists transcode_finished_at timestamptz;

create index if not exists movies_pending_transcode_idx
  on public.movies (created_at)
  where status = 'processing' and hls_key is null;

comment on column public.movies.hls_key is 'Cloudflare R2 key for the adaptive HLS master playlist.';
comment on column public.movies.video_key is 'Original uploaded video key; retained for backwards compatibility and recovery.';
