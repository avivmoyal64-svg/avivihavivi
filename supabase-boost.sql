-- Coin boost: a new GOLD prize in the daily case (1%). One boost = +20% coins on every pick of one week's event.
-- Run AFTER supabase-case.sql and supabase-duel2.sql. Safe to run more than once.
-- New case odds: 1% free pick | 1% coin boost | 2% 500 coins | 8% 250 | 10% 100 | 5% theme | 5% sticker | 10% emoji | 10% 25 coins | 15% another spin | 33% nothing

alter table public.user_tokens add column if not exists boosts int not null default 0 check (boosts >= 0);

create table if not exists public.coin_boosts(
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id text not null,
  fights text[] not null,
  created_at timestamptz not null default now(),
  primary key (user_id, event_id));
alter table public.coin_boosts enable row level security;
drop policy if exists "boost read" on public.coin_boosts;
create policy "boost read" on public.coin_boosts for select to authenticated using (true);
revoke all on public.coin_boosts from anon, authenticated;
grant select on public.coin_boosts to authenticated;
do $$ begin alter publication supabase_realtime add table public.coin_boosts; exception when others then null; end $$;

-- coins: +20% on every correct pick of a boosted event (stake losses are not changed)
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
        round((100 + case when coalesce(ar.r->>'m','') <> '' and replace(pf.value->>'m','TKO/KO','KO/TKO') = ar.r->>'m'
                     then 50 + case when ar.r->>'m' = 'DEC' or coalesce(ar.r->>'r','') = '' or (pf.value->>'r') = (ar.r->>'r') then 50 else 0 end
                     else 0 end) * (1 + ar.main) * (case when b.stake is not null then 2 else 1 end)
              * (case when exists(select 1 from public.coin_boosts cb where cb.user_id = p.user_id and pf.key = any(cb.fights)) then 1.2 else 1.0 end))
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
         + coalesce((select sum(amount) from public.case_opens where user_id = p_uid and prize = 'coins'), 0)::int
         + coalesce((select sum(reward) from public.trivia_games where winner = p_uid and rewarded), 0)::int;
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
    'boosts', coalesce((select boosts from public.user_tokens where user_id = uid), 0),
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
  elsif r < 2 then pr := 'boost';
  elsif r < 4 then pr := 'coins'; amt := 500;
  elsif r < 12 then pr := 'coins'; amt := 250;
  elsif r < 22 then pr := 'coins'; amt := 100;
  elsif r < 27 then pr := 'theme';
  elsif r < 32 then pr := 'sticker';
  elsif r < 42 then pr := 'emoji';
  elsif r < 52 then pr := 'coins'; amt := 25;
  elsif r < 67 then pr := 'spin';
  else pr := 'none';
  end if;

  if pr in ('theme', 'sticker', 'emoji') then
    pat := case pr when 'theme' then 't\_%' when 'sticker' then 's\_%' else 'e\_%' end;
    select c.item into it from public.shop_catalog c
      where c.item like pat escape '\' and c.price > 0
        and not exists (select 1 from public.shop_owned o where o.user_id = uid and o.item = c.item)
      order by random() limit 1;
    if it is null then
      amt := case pr when 'emoji' then 100 else 250 end; pr := 'coins';
    else
      insert into public.shop_owned(user_id, item, price) values (uid, it, 0);
    end if;
  elsif pr = 'pick' then
    insert into public.user_tokens(user_id, free_picks) values (uid, 1)
    on conflict (user_id) do update set free_picks = public.user_tokens.free_picks + 1;
  elsif pr = 'boost' then
    insert into public.user_tokens(user_id, boosts) values (uid, 1)
    on conflict (user_id) do update set boosts = public.user_tokens.boosts + 1;
  end if;

  if ex is null then
    insert into public.case_opens(user_id, day, prize, item, amount) values (uid, d, pr, it, amt);
  else
    update public.case_opens set prize = pr, item = it, amount = amt, created_at = now() where user_id = uid and day = d;
  end if;
  return jsonb_build_object('opened', pr <> 'spin', 'prize', pr, 'item', it, 'amount', amt,
    'free_picks', coalesce((select free_picks from public.user_tokens where user_id = uid), 0),
    'boosts', coalesce((select boosts from public.user_tokens where user_id = uid), 0),
    'next_at', (((d + 1)::timestamp) at time zone 'Asia/Jerusalem'));
end $$;

-- Use one boost on this week's event. Only before any fight of that event has started or ended.
create or replace function public.use_boost() returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); ev jsonb; nx jsonb; fl text[]; eid text; n int;
begin
  if uid is null then raise exception 'not logged in'; end if;
  select value into ev from public.site_data where key = 'events';
  nx := ev->'next';
  if nx is null then raise exception 'no event to boost'; end if;
  eid := nx->>'id';
  fl := array(select x->>'id' from jsonb_array_elements(coalesce(nx->'fights', '[]'::jsonb)) x);
  if eid is null or coalesce(array_length(fl, 1), 0) = 0 then raise exception 'no event to boost'; end if;
  if exists (select 1 from public.coin_boosts where user_id = uid and event_id = eid) then raise exception 'boost already active for this event'; end if;
  if exists (select 1 from jsonb_array_elements(nx->'fights') x where coalesce(x->>'live', '') in ('true', '1')) then raise exception 'this event already started'; end if;
  if exists (
    select 1 from (
      select fl2.key as fid, fl2.value as r from public.results x, jsonb_each(x.fights) fl2
      union all
      select h.key, h.value from public.site_data s, jsonb_each(coalesce(s.value->'history', '{}'::jsonb)) h where s.key = 'events'
    ) z where z.fid = any(fl) and (coalesce(z.r->>'w','') <> '' or coalesce(z.r->>'nc','') in ('1','true'))
  ) then raise exception 'this event already started'; end if;
  update public.user_tokens set boosts = boosts - 1 where user_id = uid and boosts > 0 returning boosts into n;
  if not found then raise exception 'no boosts'; end if;
  insert into public.coin_boosts(user_id, event_id, fights) values (uid, eid, fl);
  return jsonb_build_object('boosts', n, 'event', eid);
end $$;

revoke all on function public.case_status(), public.open_case(), public.use_boost() from public, anon;
grant execute on function public.case_status(), public.open_case(), public.use_boost() to authenticated;
