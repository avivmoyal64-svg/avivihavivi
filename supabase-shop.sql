-- SHOP: reaction emojis, color themes and name stickers, paid for with coins.
-- Run once in Supabase: SQL Editor -> New query -> paste everything -> Run. Safe to run again.
-- (Run supabase-goat.sql first if you have not, so the GOAT bonus counts toward the wallet.)

create table if not exists public.shop_catalog(
  item text primary key,
  kind text not null check (kind in ('emoji','theme','sticker')),
  price int not null check (price >= 0)
);
insert into public.shop_catalog(item, kind, price) values
  ('e_thumb','emoji',0),('e_fire','emoji',50),('e_laugh','emoji',50),('e_clap','emoji',50),('e_eyes','emoji',50),
  ('e_skull','emoji',75),('e_clown','emoji',75),('e_shock','emoji',100),('e_ice','emoji',100),('e_rocket','emoji',100),
  ('e_crown','emoji',150),('e_goat','emoji',200),
  ('t_pink','theme',400),('t_blue','theme',400),('t_green','theme',400),
  ('s_champ','sticker',300),('s_ko','sticker',350),('s_pick','sticker',400),('s_goat','sticker',500),('s_one','sticker',600)
on conflict (item) do update set kind = excluded.kind, price = excluded.price;

create table if not exists public.shop_owned(
  user_id uuid not null references auth.users(id) on delete cascade,
  item text not null references public.shop_catalog(item),
  price int not null,
  created_at timestamptz not null default now(),
  primary key (user_id, item)
);
create table if not exists public.shop_profile(
  user_id uuid primary key references auth.users(id) on delete cascade,
  sticker text references public.shop_catalog(item),
  theme text references public.shop_catalog(item),
  updated_at timestamptz not null default now()
);
create table if not exists public.reactions(
  user_id uuid not null references auth.users(id) on delete cascade,
  target_id uuid not null references auth.users(id) on delete cascade,
  fight_id text not null check (char_length(fight_id) < 200),
  emoji text not null references public.shop_catalog(item),
  created_at timestamptz not null default now(),
  primary key (user_id, target_id, fight_id)
);

alter table public.shop_catalog enable row level security;
alter table public.shop_owned enable row level security;
alter table public.shop_profile enable row level security;
alter table public.reactions enable row level security;
drop policy if exists "catalog read" on public.shop_catalog;
create policy "catalog read" on public.shop_catalog for select to authenticated using (true);
drop policy if exists "owned read own" on public.shop_owned;
create policy "owned read own" on public.shop_owned for select to authenticated using (user_id = auth.uid());
drop policy if exists "profile read all" on public.shop_profile;
create policy "profile read all" on public.shop_profile for select to authenticated using (true);
drop policy if exists "reactions read all" on public.reactions;
create policy "reactions read all" on public.reactions for select to authenticated using (true);
-- no insert/update/delete policies: all changes go through the functions below

-- Coins a player has earned (same rules as the website: 100 winner, +50 method, +50 round, main event x2, +100 GOAT bonus)
create or replace function public.earned_coins(p_uid uuid) returns int
language plpgsql stable security definer set search_path = public as $$
declare e int := 0; g int := 0;
begin
  with hist as (
    select h.key as fid, h.value as r
    from public.site_data s, jsonb_each(coalesce(s.value->'history', '{}'::jsonb)) h
    where s.key = 'events'
  ), res as (
    select f.key as fid, f.value as r from public.results x, jsonb_each(x.fights) f
  ), allr as (
    select coalesce(rs.fid, h.fid) as fid, coalesce(rs.r, h.r) as r,
           case when coalesce(h.r->>'main', '0') in ('1','true') then 1 else 0 end as main
    from res rs full join hist h on h.fid = rs.fid
  )
  select coalesce(sum(
    (100 + case when coalesce(ar.r->>'m','') <> '' and replace(pf.value->>'m','TKO/KO','KO/TKO') = ar.r->>'m'
                 then 50 + case when ar.r->>'m' = 'DEC' or coalesce(ar.r->>'r','') = '' or (pf.value->>'r') = (ar.r->>'r') then 50 else 0 end
                 else 0 end) * (1 + ar.main)
  ), 0)::int into e
  from public.picks p
  cross join lateral jsonb_each(p.fights) pf
  join allr ar on ar.fid = pf.key
  where p.user_id = p_uid
    and coalesce(ar.r->>'w','') <> '' and pf.value->>'w' = ar.r->>'w'
    and coalesce(ar.r->>'nc','') not in ('1','true');
  begin
    select case when bonus then 100 else 0 end into g from public.goat_lists where user_id = p_uid;
  exception when others then g := 0;
  end;
  return coalesce(e,0) + coalesce(g,0);
end $$;

create or replace function public.shop_wallet() returns int
language sql stable security definer set search_path = public as $$
  select public.earned_coins(auth.uid()) - coalesce((select sum(price) from public.shop_owned where user_id = auth.uid()), 0)::int
$$;

create or replace function public.shop_buy(p_item text) returns int
language plpgsql security definer set search_path = public as $$
declare c record; w int;
begin
  if auth.uid() is null then raise exception 'not logged in'; end if;
  select * into c from public.shop_catalog where item = p_item;
  if not found then raise exception 'unknown item'; end if;
  if exists (select 1 from public.shop_owned where user_id = auth.uid() and item = p_item) then raise exception 'already owned'; end if;
  w := public.shop_wallet();
  if w < c.price then raise exception 'not enough coins'; end if;
  insert into public.shop_owned(user_id, item, price) values (auth.uid(), p_item, c.price);
  return w - c.price;
end $$;

create or replace function public.shop_equip(p_kind text, p_item text) returns void
language plpgsql security definer set search_path = public as $$
declare c record;
begin
  if auth.uid() is null then raise exception 'not logged in'; end if;
  if p_kind not in ('sticker','theme') then raise exception 'bad kind'; end if;
  if coalesce(p_item,'') <> '' then
    select * into c from public.shop_catalog where item = p_item and kind = p_kind;
    if not found then raise exception 'unknown item'; end if;
    if c.price > 0 and not exists (select 1 from public.shop_owned where user_id = auth.uid() and item = p_item) then raise exception 'not owned'; end if;
  else p_item := null; end if;
  insert into public.shop_profile(user_id) values (auth.uid()) on conflict (user_id) do nothing;
  if p_kind = 'sticker' then update public.shop_profile set sticker = p_item, updated_at = now() where user_id = auth.uid();
  else update public.shop_profile set theme = p_item, updated_at = now() where user_id = auth.uid(); end if;
end $$;

create or replace function public.shop_react(p_target uuid, p_fight text, p_emoji text) returns void
language plpgsql security definer set search_path = public as $$
declare c record;
begin
  if auth.uid() is null then raise exception 'not logged in'; end if;
  if p_target = auth.uid() then raise exception 'cannot react to your own pick'; end if;
  if coalesce(p_emoji,'') = '' then
    delete from public.reactions where user_id = auth.uid() and target_id = p_target and fight_id = p_fight; return;
  end if;
  select * into c from public.shop_catalog where item = p_emoji and kind = 'emoji';
  if not found then raise exception 'unknown emoji'; end if;
  if c.price > 0 and not exists (select 1 from public.shop_owned where user_id = auth.uid() and item = p_emoji) then raise exception 'not owned'; end if;
  insert into public.reactions(user_id, target_id, fight_id, emoji) values (auth.uid(), p_target, p_fight, p_emoji)
  on conflict (user_id, target_id, fight_id) do update set emoji = excluded.emoji, created_at = now();
end $$;

revoke all on function public.earned_coins(uuid), public.shop_wallet(), public.shop_buy(text), public.shop_equip(text,text), public.shop_react(uuid,text,text) from public, anon;
grant execute on function public.shop_wallet(), public.shop_buy(text), public.shop_equip(text,text), public.shop_react(uuid,text,text) to authenticated;
