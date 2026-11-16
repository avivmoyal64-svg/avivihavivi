-- Push notifications. Run once in Supabase: SQL Editor -> New query -> paste -> Run
create table if not exists public.push_subs(
  endpoint text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  p256dh text not null,
  auth text not null,
  lang text not null default 'en',
  created_at timestamptz not null default now(),
  constraint push_limits check (char_length(endpoint) < 1000 and char_length(p256dh) < 200 and char_length(auth) < 100)
);
alter table public.push_subs enable row level security;   -- no policies: only the two functions below and the server can touch it

create or replace function public.push_register(p_endpoint text, p_p256dh text, p_auth text, p_lang text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not logged in'; end if;
  insert into public.push_subs(endpoint, user_id, p256dh, auth, lang)
  values (p_endpoint, auth.uid(), p_p256dh, p_auth, case when p_lang = 'he' then 'he' else 'en' end)
  on conflict (endpoint) do update set user_id = auth.uid(), p256dh = excluded.p256dh, auth = excluded.auth, lang = excluded.lang;
end $$;
create or replace function public.push_unregister(p_endpoint text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not logged in'; end if;
  delete from public.push_subs where endpoint = p_endpoint and user_id = auth.uid();
end $$;
revoke all on function public.push_register(text,text,text,text), public.push_unregister(text) from public, anon;
grant execute on function public.push_register(text,text,text,text), public.push_unregister(text) to authenticated;
