create table if not exists public.user_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  sender_role text not null check (sender_role in ('user', 'admin')),
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists user_messages_user_created_idx on public.user_messages(user_id, created_at desc);

alter table public.user_messages enable row level security;

create policy "messages read own or admin" on public.user_messages
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin')
  );

create policy "messages users send own" on public.user_messages
  for insert to authenticated
  with check (user_id = (select auth.uid()) and sender_role = 'user');
