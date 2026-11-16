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

-- Comments on GOAT lists
create table if not exists public.goat_comments(
  id bigint generated always as identity primary key,
  list_user uuid not null references auth.users(id) on delete cascade,
  author uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 300),
  created_at timestamptz not null default now()
);
create index if not exists goat_comments_list on public.goat_comments(list_user, created_at);
alter table public.goat_comments enable row level security;
drop policy if exists "gc read" on public.goat_comments;
create policy "gc read" on public.goat_comments for select to authenticated using (true);
drop policy if exists "gc insert own" on public.goat_comments;
create policy "gc insert own" on public.goat_comments for insert to authenticated with check (author = auth.uid());
drop policy if exists "gc delete" on public.goat_comments;
create policy "gc delete" on public.goat_comments for delete to authenticated using (author = auth.uid() or list_user = auth.uid());
-- slow down spam: one comment per 3 seconds per person
create or replace function public.gc_rate() returns trigger language plpgsql as $$
begin
  if exists (select 1 from public.goat_comments where author = new.author and created_at > now() - interval '3 seconds') then
    raise exception 'slow down';
  end if;
  return new;
end $$;
drop trigger if exists gc_rate on public.goat_comments;
create trigger gc_rate before insert on public.goat_comments for each row execute function public.gc_rate();
