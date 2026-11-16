-- Bets on fights + favorite fighter.
-- Run once in Supabase: SQL Editor -> New snippet -> paste -> Run. Run it AFTER supabase-goat.sql and supabase-shop.sql.
--
-- How a bet works
--   * You put 100 coins on one of your picks, before picks lock.
--   * Winner right: every right answer on that fight pays double (winner, method, round).
--   * Winner wrong: you lose the 100 coins.   No contest / draw: you get the 100 coins back.
--   * While the fight is not over the 100 coins are reserved (you cannot spend them in the shop or bet them twice).
--   * The old "main event pays double" rule stops for new events. Events that were already finished when you run this
--     script keep their double points, so nobody's coins go down.

-- 1) Favorite fighter shown on the profile
create table if not exists public.profile_fav(
  user_id uuid primary key references auth.users(id) on delete cascade,
  fighter text not null check (char_length(btrim(fighter)) between 1 and 60),
  updated_at timestamptz not null default now());
alter table public.profile_fav enable row level security;
drop policy if exists "fav read" on public.profile_fav;
create policy "fav read" on public.profile_fav for select to authenticated using (true);
drop policy if exists "fav insert own" on public.profile_fav;
create policy "fav insert own" on public.profile_fav for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "fav update own" on public.profile_fav;
create policy "fav update own" on public.profile_fav for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "fav delete own" on public.profile_fav;
create policy "fav delete own" on public.profile_fav for delete to authenticated using (user_id = auth.uid());

-- 2) Bets (nobody writes here directly: place_bet / cancel_bet below do it)
create table if not exists public.bets(
  user_id uuid not null references auth.users(id) on delete cascade,
  fight_id text not null,
  stake int not null check (stake = 100),
  created_at timestamptz not null default now(),
  primary key (user_id, fight_id));
alter table public.bets enable row level security;
drop policy if exists "bets read" on public.bets;
create policy "bets read" on public.bets for select to authenticated using (true);
do $$ begin alter publication supabase_realtime add table public.bets; exception when others then null; end $$;

-- 3) Remember which finished fights keep the old main-event double (frozen the first time this script runs)
insert into public.site_data(key, value)
select 'legacy_main', coalesce(jsonb_agg(h.key), '[]'::jsonb)
from public.site_data s, jsonb_each(coalesce(s.value->'history', '{}'::jsonb)) h
where s.key = 'events' and coalesce(h.value->>'main', '0') in ('1','true')
on conflict (key) do nothing;

-- 4) Coins a player has earned: points (with bets and the legacy main-event double) minus lost bets, plus the GOAT bonus
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
  return coalesce(e,0) + coalesce(g,0);
end $$;

-- 5) Coins reserved by bets on fights that are not over yet
create or replace function public.bet_reserved(p_uid uuid) returns int
language sql stable security definer set search_path = public as $$
  select coalesce(sum(b.stake), 0)::int
  from public.bets b
  where b.user_id = p_uid
    and not exists (
      select 1 from (
        select f.key as fid, f.value as r from public.results x, jsonb_each(x.fights) f
        union all
        select h.key, h.value from public.site_data s, jsonb_each(coalesce(s.value->'history', '{}'::jsonb)) h where s.key = 'events'
      ) z
      where z.fid = b.fight_id
        and (coalesce(z.r->>'w','') <> '' or coalesce(z.r->>'nc','') in ('1','true')));
$$;

-- 6) The wallet (what you can spend or bet) = earned - spent in the shop - reserved by open bets
create or replace function public.shop_wallet() returns int
language sql stable security definer set search_path = public as $$
  select public.earned_coins(auth.uid())
       - coalesce((select sum(price) from public.shop_owned where user_id = auth.uid()), 0)::int
       - public.bet_reserved(auth.uid())
$$;

-- 7) Place / take back a bet
create or replace function public.place_bet(p_fight text) returns int
language plpgsql security definer set search_path = public as $$
declare ev jsonb; lk numeric; w int;
begin
  if auth.uid() is null then raise exception 'not logged in'; end if;
  select value into ev from public.site_data where key = 'events';
  if ev is null or not exists (select 1 from jsonb_array_elements(coalesce(ev->'next'->'fights','[]'::jsonb)) f where f->>'id' = p_fight) then
    raise exception 'this fight is not open for bets';
  end if;
  lk := nullif(ev->'next'->>'lock','')::numeric;
  if lk is not null and extract(epoch from now()) * 1000 >= lk - 5 * 3600 * 1000 then raise exception 'picks are locked'; end if;
  if not exists (select 1 from public.picks where user_id = auth.uid() and fights ? p_fight) then raise exception 'lock in your pick first'; end if;
  if exists (select 1 from public.bets where user_id = auth.uid() and fight_id = p_fight) then raise exception 'you already bet on this fight'; end if;
  w := public.shop_wallet();
  if w < 100 then raise exception 'not enough coins'; end if;
  insert into public.bets(user_id, fight_id, stake) values (auth.uid(), p_fight, 100);
  return w - 100;
end $$;

create or replace function public.cancel_bet(p_fight text) returns int
language plpgsql security definer set search_path = public as $$
declare ev jsonb; lk numeric;
begin
  if auth.uid() is null then raise exception 'not logged in'; end if;
  select value into ev from public.site_data where key = 'events';
  lk := nullif(ev->'next'->>'lock','')::numeric;
  if lk is not null and extract(epoch from now()) * 1000 >= lk - 5 * 3600 * 1000 then raise exception 'picks are locked'; end if;
  delete from public.bets where user_id = auth.uid() and fight_id = p_fight;
  return public.shop_wallet();
end $$;

revoke all on function public.place_bet(text) from public, anon;
revoke all on function public.cancel_bet(text) from public, anon;
grant execute on function public.place_bet(text) to authenticated;
grant execute on function public.cancel_bet(text) to authenticated;
