-- New case prizes (peek token, duel boost, profile banner), cheaper themes, profile banner customisation.
-- Run AFTER supabase-boost.sql (and supabase-duel2.sql / supabase-duel3.sql). Safe to run more than once.
-- New case odds: 1% 500 coins (gold) | 1% coin boost (gold) | 2% free pick (red) | 8% 250 | 10% 100 coins | 10% peek token | 10% duel boost
--   12% profile banner | 8% theme | 5% sticker | 10% 25 coins | 10% another spin | 13% nothing   (reaction emojis are gone)

-- themes now cost 50 coins; the profile banner is a new item (won in the case, not for sale)
alter table public.shop_catalog drop constraint if exists shop_catalog_kind_check;
alter table public.shop_catalog add constraint shop_catalog_kind_check check (kind in ('emoji','theme','sticker','banner'));
update public.shop_catalog set price = 50 where kind = 'theme';
insert into public.shop_catalog(item, kind, price) values ('b_banner', 'banner', 99999) on conflict (item) do nothing;

alter table public.shop_profile add column if not exists banner_fighter text check (banner_fighter is null or char_length(banner_fighter) <= 60);
alter table public.shop_profile add column if not exists banner_color text check (banner_color is null or banner_color ~ '^#[0-9a-fA-F]{6}$');
alter table public.user_tokens add column if not exists peeks int not null default 0 check (peeks >= 0);
alter table public.user_tokens add column if not exists duel_boosts int not null default 0 check (duel_boosts >= 0);

create table if not exists public.peeks(
  user_id uuid not null references auth.users(id) on delete cascade,
  fight_id text not null check (char_length(fight_id) < 200),
  created_at timestamptz not null default now(),
  primary key (user_id, fight_id));
alter table public.peeks enable row level security;
drop policy if exists "peeks read own" on public.peeks;
create policy "peeks read own" on public.peeks for select to authenticated using (user_id = auth.uid());
revoke all on public.peeks from anon, authenticated;
grant select on public.peeks to authenticated;

-- Profile banner: only a player who owns the banner can choose the fighter and colour of their profile
drop function if exists public.set_banner(text, text);
create or replace function public.set_banner(p_fighter text, p_color text) returns void
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not logged in'; end if;
  if not exists (select 1 from public.shop_owned where user_id = uid and item = 'b_banner') then raise exception 'you do not own the profile banner'; end if;
  if coalesce(p_color, '') <> '' and p_color !~ '^#[0-9a-fA-F]{6}$' then raise exception 'bad colour'; end if;
  if coalesce(char_length(p_fighter), 0) > 60 then raise exception 'bad fighter'; end if;
  insert into public.shop_profile(user_id, banner_fighter, banner_color, updated_at)
    values (uid, nullif(p_fighter, ''), nullif(p_color, ''), now())
  on conflict (user_id) do update set banner_fighter = nullif(p_fighter, ''), banner_color = nullif(p_color, ''), updated_at = now();
end $$;

-- Peek token: see how many OTHER players picked each fighter in one fight (counts only, no names). Costs 1 token the first time.
drop function if exists public.peek_fight(text);
create or replace function public.peek_fight(p_fight text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); ev jsonb; f jsonb; fa text; fb text; na int; nb int; had boolean;
begin
  if uid is null then raise exception 'not logged in'; end if;
  select value into ev from public.site_data where key = 'events';
  select x into f from jsonb_array_elements(coalesce(ev->'next'->'fights', '[]'::jsonb)) x where x->>'id' = p_fight;
  if f is null then raise exception 'this fight is not part of this week''s event'; end if;
  fa := f->>'a'; fb := f->>'b';
  select exists(select 1 from public.peeks where user_id = uid and fight_id = p_fight) into had;
  if not had then
    if coalesce(f->>'live', '') in ('true', '1') then raise exception 'this fight already started'; end if;
    if exists (
      select 1 from (
        select fl.key as fid, fl.value as r from public.results x, jsonb_each(x.fights) fl
        union all
        select h.key, h.value from public.site_data s, jsonb_each(coalesce(s.value->'history', '{}'::jsonb)) h where s.key = 'events'
      ) z where z.fid = p_fight and (coalesce(z.r->>'w','') <> '' or coalesce(z.r->>'nc','') in ('1','true'))
    ) then raise exception 'this fight is already over'; end if;
    update public.user_tokens set peeks = peeks - 1 where user_id = uid and peeks > 0;
    if not found then raise exception 'no peek tokens'; end if;
    insert into public.peeks(user_id, fight_id) values (uid, p_fight);
  end if;
  select count(*) filter (where p.fights->p_fight->>'w' = fa), count(*) filter (where p.fights->p_fight->>'w' = fb)
    into na, nb from public.picks p where p.user_id <> uid and p.fights ? p_fight;
  return jsonb_build_object('a', fa, 'b', fb, 'na', na, 'nb', nb,
    'peeks', coalesce((select peeks from public.user_tokens where user_id = uid), 0));
end $$;

create or replace function public.case_status() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare uid uuid := auth.uid(); d date := (now() at time zone 'Asia/Jerusalem')::date; o record; t record;
begin
  if uid is null then raise exception 'not logged in'; end if;
  select * into o from public.case_opens where user_id = uid and day = d;
  select * into t from public.user_tokens where user_id = uid;
  return jsonb_build_object(
    'opened', (found and o.prize <> 'spin'),
    'prize', o.prize, 'item', o.item, 'amount', coalesce(o.amount, 0),
    'free_picks', coalesce(t.free_picks, 0), 'boosts', coalesce(t.boosts, 0),
    'peeks', coalesce(t.peeks, 0), 'duel_boosts', coalesce(t.duel_boosts, 0),
    'next_at', (((d + 1)::timestamp) at time zone 'Asia/Jerusalem'));
end $$;

create or replace function public.open_case() returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); d date := (now() at time zone 'Asia/Jerusalem')::date;
        r numeric := random() * 100; pr text; it text; amt int := 0; pat text; ex text; t record;
begin
  if uid is null then raise exception 'not logged in'; end if;
  select prize into ex from public.case_opens where user_id = uid and day = d;
  if ex is not null and ex <> 'spin' then raise exception 'already opened today'; end if;
  if r < 1 then pr := 'coins'; amt := 500;
  elsif r < 2 then pr := 'boost';
  elsif r < 4 then pr := 'pick';
  elsif r < 12 then pr := 'coins'; amt := 250;
  elsif r < 22 then pr := 'coins'; amt := 100;
  elsif r < 32 then pr := 'peek';
  elsif r < 42 then pr := 'duel';
  elsif r < 54 then pr := 'banner';
  elsif r < 62 then pr := 'theme';
  elsif r < 67 then pr := 'sticker';
  elsif r < 77 then pr := 'coins'; amt := 25;
  elsif r < 87 then pr := 'spin';
  else pr := 'none';
  end if;

  if pr in ('theme', 'sticker') then
    pat := case pr when 'theme' then 't\_%' else 's\_%' end;
    select c.item into it from public.shop_catalog c
      where c.item like pat escape '\' and c.price > 0
        and not exists (select 1 from public.shop_owned o where o.user_id = uid and o.item = c.item)
      order by random() limit 1;
    if it is null then amt := 250; pr := 'coins';
    else insert into public.shop_owned(user_id, item, price) values (uid, it, 0); end if;
  elsif pr = 'banner' then
    if exists (select 1 from public.shop_owned where user_id = uid and item = 'b_banner') then amt := 150; pr := 'coins';
    else it := 'b_banner'; insert into public.shop_owned(user_id, item, price) values (uid, it, 0); end if;
  elsif pr = 'pick' then
    insert into public.user_tokens(user_id, free_picks) values (uid, 1) on conflict (user_id) do update set free_picks = public.user_tokens.free_picks + 1;
  elsif pr = 'boost' then
    insert into public.user_tokens(user_id, boosts) values (uid, 1) on conflict (user_id) do update set boosts = public.user_tokens.boosts + 1;
  elsif pr = 'peek' then
    insert into public.user_tokens(user_id, peeks) values (uid, 1) on conflict (user_id) do update set peeks = public.user_tokens.peeks + 1;
  elsif pr = 'duel' then
    insert into public.user_tokens(user_id, duel_boosts) values (uid, 1) on conflict (user_id) do update set duel_boosts = public.user_tokens.duel_boosts + 1;
  end if;

  if ex is null then
    insert into public.case_opens(user_id, day, prize, item, amount) values (uid, d, pr, it, amt);
  else
    update public.case_opens set prize = pr, item = it, amount = amt, created_at = now() where user_id = uid and day = d;
  end if;
  select * into t from public.user_tokens where user_id = uid;
  return jsonb_build_object('opened', pr <> 'spin', 'prize', pr, 'item', it, 'amount', amt,
    'free_picks', coalesce(t.free_picks, 0), 'boosts', coalesce(t.boosts, 0), 'peeks', coalesce(t.peeks, 0), 'duel_boosts', coalesce(t.duel_boosts, 0),
    'next_at', (((d + 1)::timestamp) at time zone 'Asia/Jerusalem'));
end $$;

-- Duel boost: the winner's next rewarded duel pays double (10 coins instead of 5)
create or replace function public.trivia_submit(p_game uuid, p_picks int[], p_ms int) returns int
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); g record; k int[]; sc int := 0; i int; ms int := least(greatest(coalesce(p_ms,0), 0), 600000);
        wn uuid; rw boolean := false; boosted boolean := false; today timestamptz := ((now() at time zone 'Asia/Jerusalem')::date)::timestamp at time zone 'Asia/Jerusalem';
begin
  select * into g from public.trivia_games where id = p_game for update;
  if not found or uid is null or (uid <> g.a and uid <> g.b) then raise exception 'no such game'; end if;
  if g.status in ('done','declined','cancelled') then raise exception 'game is over'; end if;
  if g.status <> 'active' then raise exception 'not accepted yet'; end if;
  if not g.ready then raise exception 'not ready yet'; end if;
  if coalesce(array_length(p_picks,1),0) <> 10 then raise exception 'bad answers'; end if;
  if (uid = g.a and g.a_score is not null) or (uid = g.b and g.b_score is not null) then raise exception 'already played'; end if;
  select case when g.mode = 'fav' and uid = g.b then answers_b else answers end into k from public.trivia_secret where game_id = p_game;
  for i in 1..10 loop if p_picks[i] = k[i] then sc := sc + 1; end if; end loop;
  if uid = g.a then g.a_score := sc; g.a_ms := ms; else g.b_score := sc; g.b_ms := ms; end if;
  if g.a_score is not null and g.b_score is not null then
    if g.a_score > g.b_score then wn := g.a;
    elsif g.b_score > g.a_score then wn := g.b;
    end if; -- equal score = draw, nobody gets coins
    if wn is not null then
      rw := (select count(*) from public.trivia_games where winner = wn and rewarded and finished_at >= today) < 6
        and (select count(*) from public.trivia_games where winner = wn and rewarded and finished_at >= today and (a = wn and b = (case when wn = g.a then g.b else g.a end) or b = wn and a = (case when wn = g.a then g.b else g.a end))) < 3;
    end if;
    if rw then   -- a duel boost doubles the reward of the winner's next rewarded win
      update public.user_tokens set duel_boosts = duel_boosts - 1 where user_id = wn and duel_boosts > 0;
      boosted := found;
    end if;
    update public.trivia_games set a_score = g.a_score, b_score = g.b_score, a_ms = g.a_ms, b_ms = g.b_ms, status = 'done',
      winner = wn, rewarded = rw, draw = (wn is null), finished_at = now(),
      reward = case when boosted then reward * 2 else reward end where id = p_game;
  else
    update public.trivia_games set a_score = g.a_score, b_score = g.b_score, a_ms = g.a_ms, b_ms = g.b_ms, status = 'active' where id = p_game;
  end if;
  return sc;
end $$;

revoke all on function public.set_banner(text, text), public.peek_fight(text), public.case_status(), public.open_case(), public.trivia_submit(uuid, int[], int) from public, anon;
grant execute on function public.set_banner(text, text), public.peek_fight(text), public.case_status(), public.open_case(), public.trivia_submit(uuid, int[], int) to authenticated;
