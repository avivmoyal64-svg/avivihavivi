-- Free daily case (spinning reel) + free picks.
-- Run once in Supabase: SQL Editor -> New snippet -> paste -> Run. Run it AFTER supabase-bets.sql (and goat + shop).
--
-- Once a day (Israel time) each player opens one free case. The draw is made here on the server:
--   1% free pick | 2% 500 coins | 8% 250 coins | 10% 100 coins | 5% free theme | 5% free sticker | 10% free emoji
--   10% 25 coins | 15% another spin (spin again right away) | 34% nothing (try again tomorrow)
-- (the percentages you gave added up to 101, so "nothing" + "another spin" together are 49 instead of 50)
-- If you already own every item of the kind you won, you get coins instead (emoji 100, theme/sticker 250).
-- A free pick lets a player change one locked pick for a fight of this week's event that is not over yet.

create table if not exists public.case_opens(
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  prize text not null,
  item text,
  amount int not null default 0,
  created_at timestamptz not null default now(),
  primary key (user_id, day));
alter table public.case_opens enable row level security;
drop policy if exists "case read" on public.case_opens;
create policy "case read" on public.case_opens for select to authenticated using (true);
do $$ begin alter publication supabase_realtime add table public.case_opens; exception when others then null; end $$;

create table if not exists public.user_tokens(
  user_id uuid primary key references auth.users(id) on delete cascade,
  free_picks int not null default 0 check (free_picks >= 0));
alter table public.user_tokens enable row level security;
drop policy if exists "tokens read own" on public.user_tokens;
create policy "tokens read own" on public.user_tokens for select to authenticated using (user_id = auth.uid());

-- Coins earned now include coins won from cases
create or replace function public.earned_coins(p_uid uuid) returns int
language plpgsql stable security definer set search_path = public as $$
declare e int := 0; g int := 0; has_leg boolean;
begin
  select exists(select 1 from public.site_data where key = 'legacy_main') into has_leg;
  with hist as (
    select h.key as fid, h.value as r
    from public.site_data s, jsonb_each(coalesce(s.value->'history', '{}'::jsonb)) h
    where s.key = 'events'
  ), leg as (
    select jsonb_array_elements_text(value) as fid from public.site_data where key = 'legacy_main'
  ), res as (
    select f.key as fid, f.value as r from public.results x, jsonb_each(x.fights) f
  ), allr as (
    select coalesce(rs.fid, h.fid) as fid, coalesce(rs.r, h.r) as r,
           case when coalesce(h.r->>'main', '0') in ('1','true')
                 and (not has_leg or coalesce(rs.fid, h.fid) in (select fid from leg)) then 1 else 0 end as main
    from res rs full join hist h on h.fid = rs.fid
  )
  select coalesce(sum(
    case
      when pf.value->>'w' = ar.r->>'w' then
        (100 + case when coalesce(ar.r->>'m','') <> '' and replace(pf.value->>'m','TKO/KO','KO/TKO') = ar.r->>'m'
                     then 50 + case when ar.r->>'m' = 'DEC' or coalesce(ar.r->>'r','') = '' or (pf.value->>'r') = (ar.r->>'r') then 50 else 0 end
                     else 0 end) * (1 + ar.main) * (case when b.stake is not null then 2 else 1 end)
      else - coalesce(b.stake, 0)
    end
  ), 0)::int into e
  from public.picks p
  cross join lateral jsonb_each(p.fights) pf
  join allr ar on ar.fid = pf.key
  left join public.bets b on b.user_id = p.user_id and b.fight_id = pf.key
  where p.user_id = p_uid
    and coalesce(ar.r->>'w','') <> ''
    and coalesce(ar.r->>'nc','') not in ('1','true');
  begin
    select case when bonus then 100 else 0 end into g from public.goat_lists where user_id = p_uid;
  exception when others then g := 0;
  end;
  return coalesce(e,0) + coalesce(g,0)
         + coalesce((select sum(amount) from public.case_opens where user_id = p_uid and prize = 'coins'), 0)::int;
end $$;

create or replace function public.case_status() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare uid uuid := auth.uid(); d date := (now() at time zone 'Asia/Jerusalem')::date; o record;
begin
  if uid is null then raise exception 'not logged in'; end if;
  select * into o from public.case_opens where user_id = uid and day = d;
  return jsonb_build_object(
    'opened', (found and o.prize <> 'spin'),
    'prize', o.prize, 'item', o.item, 'amount', coalesce(o.amount, 0),
    'free_picks', coalesce((select free_picks from public.user_tokens where user_id = uid), 0),
    'next_at', (((d + 1)::timestamp) at time zone 'Asia/Jerusalem'));
end $$;

create or replace function public.open_case() returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); d date := (now() at time zone 'Asia/Jerusalem')::date;
        r numeric := random() * 100; pr text; it text; amt int := 0; pat text; ex text;
begin
  if uid is null then raise exception 'not logged in'; end if;
  select prize into ex from public.case_opens where user_id = uid and day = d;
  if ex is not null and ex <> 'spin' then raise exception 'already opened today'; end if;
  if r < 1 then pr := 'pick';
  elsif r < 3 then pr := 'coins'; amt := 500;
  elsif r < 11 then pr := 'coins'; amt := 250;
  elsif r < 21 then pr := 'coins'; amt := 100;
  elsif r < 26 then pr := 'theme';
  elsif r < 31 then pr := 'sticker';
  elsif r < 41 then pr := 'emoji';
  elsif r < 51 then pr := 'coins'; amt := 25;
  elsif r < 66 then pr := 'spin';
  else pr := 'none';
  end if;

  if pr in ('theme', 'sticker', 'emoji') then
    pat := case pr when 'theme' then 't\_%' when 'sticker' then 's\_%' else 'e\_%' end;
    select c.item into it from public.shop_catalog c
      where c.item like pat escape '\' and c.price > 0
        and not exists (select 1 from public.shop_owned o where o.user_id = uid and o.item = c.item)
      order by random() limit 1;
    if it is null then
      amt := case pr when 'emoji' then 100 else 250 end; pr := 'coins';   -- owns everything of that kind
    else
      insert into public.shop_owned(user_id, item, price) values (uid, it, 0);
    end if;
  elsif pr = 'pick' then
    insert into public.user_tokens(user_id, free_picks) values (uid, 1)
    on conflict (user_id) do update set free_picks = public.user_tokens.free_picks + 1;
  end if;

  if ex is null then
    insert into public.case_opens(user_id, day, prize, item, amount) values (uid, d, pr, it, amt);
  else
    update public.case_opens set prize = pr, item = it, amount = amt, created_at = now() where user_id = uid and day = d;
  end if;
  return jsonb_build_object('opened', pr <> 'spin', 'prize', pr, 'item', it, 'amount', amt,
    'free_picks', coalesce((select free_picks from public.user_tokens where user_id = uid), 0),
    'next_at', (((d + 1)::timestamp) at time zone 'Asia/Jerusalem'));
end $$;

-- Use a free pick: change one existing pick of this week's event while that fight is not over yet
create or replace function public.use_free_pick(p_fight text, p_w text, p_m text, p_r int) returns int
language plpgsql security definer set search_path = public as $$
declare ev jsonb; f jsonb; n int; rounds int; r int := coalesce(p_r, 0);
begin
  if auth.uid() is null then raise exception 'not logged in'; end if;
  select value into ev from public.site_data where key = 'events';
  select x into f from jsonb_array_elements(coalesce(ev->'next'->'fights', '[]'::jsonb)) x where x->>'id' = p_fight;
  if f is null then raise exception 'this fight is not part of this week''s event'; end if;
  if coalesce(f->>'live', '') in ('true', '1') then raise exception 'this fight already started'; end if;
  if exists (
    select 1 from (
      select fl.key as fid, fl.value as r from public.results x, jsonb_each(x.fights) fl
      union all
      select h.key, h.value from public.site_data s, jsonb_each(coalesce(s.value->'history', '{}'::jsonb)) h where s.key = 'events'
    ) z where z.fid = p_fight and (coalesce(z.r->>'w','') <> '' or coalesce(z.r->>'nc','') in ('1','true'))
  ) then raise exception 'this fight is already over'; end if;
  if p_w is distinct from (f->>'a') and p_w is distinct from (f->>'b') then raise exception 'unknown fighter'; end if;
  if p_m not in ('DEC', 'KO/TKO', 'SUB') then raise exception 'unknown method'; end if;
  rounds := coalesce(nullif(f->>'rounds', '')::int, 5);
  if p_m = 'DEC' then r := 0; elsif r < 1 or r > rounds then raise exception 'unknown round'; end if;
  if not exists (select 1 from public.picks where user_id = auth.uid() and fights ? p_fight) then raise exception 'no pick to change'; end if;
  update public.user_tokens set free_picks = free_picks - 1 where user_id = auth.uid() and free_picks > 0 returning free_picks into n;
  if not found then raise exception 'no free picks'; end if;
  update public.picks set fights = jsonb_set(fights, array[p_fight], jsonb_build_object('w', p_w, 'm', p_m, 'r', r)) where user_id = auth.uid();
  return n;
end $$;

revoke all on function public.case_status(), public.open_case(), public.use_free_pick(text, text, text, int) from public, anon;
grant execute on function public.case_status(), public.open_case(), public.use_free_pick(text, text, text, int) to authenticated;
