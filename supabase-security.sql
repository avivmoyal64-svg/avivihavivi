-- Run once in Supabase: SQL Editor -> New query -> paste -> Run
-- 1) Account deletion: lets a logged-in user erase their own account (picks are removed automatically)
create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null then raise exception 'not logged in'; end if;
  delete from auth.users where id = auth.uid();
end $$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- 2) Data limits so nobody can store huge or junk data
alter table public.picks drop constraint if exists picks_limits;
alter table public.picks add constraint picks_limits check (
  char_length(coalesce(name,'')) <= 24 and pg_column_size(fights) < 4000);
alter table public.results drop constraint if exists results_limits;
alter table public.results add constraint results_limits check (pg_column_size(fights) < 4000);

-- 3) Contact form inbox (anyone can send, nobody can read from the website; you read it in Table Editor)
create table if not exists public.contact_messages(
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  email text check (email is null or char_length(email) <= 200),
  topic text check (char_length(topic) <= 40),
  message text not null check (char_length(message) between 1 and 2000));
alter table public.contact_messages enable row level security;
drop policy if exists "anyone can send" on public.contact_messages;
create policy "anyone can send" on public.contact_messages for insert to anon, authenticated with check (true);
