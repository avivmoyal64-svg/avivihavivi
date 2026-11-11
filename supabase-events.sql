-- Run once in Supabase: SQL Editor -> New snippet -> paste -> Run
create table if not exists public.site_data(
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now());
alter table public.site_data enable row level security;
drop policy if exists "site_data readable" on public.site_data;
create policy "site_data readable" on public.site_data for select using (true);
-- (only the update function, which uses the service key, can write)

create extension if not exists pg_cron;
create extension if not exists pg_net;
