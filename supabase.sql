-- Run this once in Supabase: SQL Editor -> New query -> paste -> Run
create table if not exists public.picks(
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text, fights jsonb not null default '{}', t bigint);
create table if not exists public.results(
  event_id text primary key, fights jsonb not null default '{}');
create table if not exists public.admins(
  user_id uuid primary key references auth.users(id) on delete cascade);

alter table public.picks enable row level security;
alter table public.results enable row level security;
alter table public.admins enable row level security;

create policy "picks readable" on public.picks for select using (true);
create policy "own pick insert" on public.picks for insert with check (auth.uid() = user_id);
create policy "own pick update" on public.picks for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "results readable" on public.results for select using (true);
create policy "admin results insert" on public.results for insert with check (exists(select 1 from public.admins a where a.user_id = auth.uid()));
create policy "admin results update" on public.results for update using (exists(select 1 from public.admins a where a.user_id = auth.uid()));
create policy "admin check own row" on public.admins for select using (auth.uid() = user_id);

alter publication supabase_realtime add table public.picks, public.results;

-- AFTER you create your own account on the site, make yourself the owner (who can save official results):
-- insert into public.admins(user_id) select id from auth.users where email = 'YOUR_EMAIL_HERE';
