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

-- 100-coin bonus the first time a list has 20 different fighters. Set by the database itself, so it cannot be faked from the website.
alter table public.goat_lists add column if not exists bonus boolean not null default false;
create or replace function public.goat_bonus() returns trigger language plpgsql as $$
declare n int;
begin
  select count(distinct lower(btrim(x))) into n from jsonb_array_elements_text(new.list) x where btrim(x) <> '';
  new.bonus := coalesce(case when tg_op = 'UPDATE' then old.bonus end, false) or n >= 20;
  return new;
end $$;
drop trigger if exists goat_bonus on public.goat_lists;
create trigger goat_bonus before insert or update on public.goat_lists for each row execute function public.goat_bonus();

-- Give the bonus to lists that were already complete before this script ran (fires the trigger once for every row)
update public.goat_lists set list = list;
