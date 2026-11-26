-- Per-user time zone: daily things (the daily case, daily challenge limits) reset at
-- midnight in the player's own time zone instead of always at midnight in Israel.
-- The site reports the phone's time zone through set_tz(); unknown users stay on Israel time.

create table if not exists public.user_tz (
  user_id uuid primary key references auth.users(id) on delete cascade,
  tz text not null,
  updated_at timestamptz not null default now()
);
alter table public.user_tz enable row level security;
revoke all on public.user_tz from anon, authenticated;

create or replace function public.user_tzname(p_uid uuid)
returns text language sql stable security definer set search_path = public as $$
  select coalesce((select tz from public.user_tz where user_id = p_uid), 'Asia/Jerusalem')
$$;

-- Day of the daily case. Never goes backwards: after flying west the next case waits
-- until the local date passes the day of the last case, so changing time zone can't add cases.
create or replace function public.case_day(p_uid uuid)
returns date language sql stable security definer set search_path = public as $$
  select greatest((now() at time zone public.user_tzname(p_uid))::date,
                  coalesce((select max(day) from public.case_opens where user_id = p_uid), '-infinity'::date))
$$;

-- Called by the site with the phone's IANA time zone (e.g. 'America/New_York').
-- Changes are accepted at most once every 3 hours.
create or replace function public.set_tz(p_tz text)
returns text language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); cur record;
begin
  if uid is null then return null; end if;
  if p_tz is null or not exists (select 1 from pg_timezone_names where name = p_tz) then
    return public.user_tzname(uid);
  end if;
  select * into cur from public.user_tz where user_id = uid;
  if not found then
    insert into public.user_tz(user_id, tz) values (uid, p_tz);
  elsif cur.tz <> p_tz and cur.updated_at < now() - interval '3 hours' then
    update public.user_tz set tz = p_tz, updated_at = now() where user_id = uid;
  end if;
  return public.user_tzname(uid);
end $$;

revoke all on function public.user_tzname(uuid) from public, anon, authenticated;
revoke all on function public.case_day(uuid) from public, anon, authenticated;
revoke all on function public.set_tz(text) from public, anon;
grant execute on function public.set_tz(text) to authenticated;

-- Rewrite every function that hard-coded Israel time to use the caller's time zone.
do $$
declare r record; def text;
begin
  for r in select p.oid from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.prokind = 'f'
             and pg_get_functiondef(p.oid) like '%''Asia/Jerusalem''%'
             and p.proname not in ('user_tzname') loop
    def := pg_get_functiondef(r.oid);
    def := replace(def, 'd date := (now() at time zone ''Asia/Jerusalem'')::date', 'd date := public.case_day(auth.uid())');
    def := replace(def, '''Asia/Jerusalem''', 'public.user_tzname(auth.uid())');
    execute def;
  end loop;
end $$;
