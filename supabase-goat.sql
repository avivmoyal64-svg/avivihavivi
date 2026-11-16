-- GOAT list (top 20 fighters per player). Run once in Supabase: SQL Editor -> New query -> paste -> Run
create table if not exists public.goat_lists(
  user_id uuid primary key references auth.users(id) on delete cascade,
  list jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  constraint goat_limits check (jsonb_typeof(list) = 'array' and jsonb_array_length(list) <= 20 and pg_column_size(list) < 3000)
);
alter table public.goat_lists enable row level security;
drop policy if exists "goat read" on public.goat_lists;
create policy "goat read" on public.goat_lists for select to authenticated using (true);
drop policy if exists "goat insert own" on public.goat_lists;
create policy "goat insert own" on public.goat_lists for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "goat update own" on public.goat_lists;
create policy "goat update own" on public.goat_lists for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
