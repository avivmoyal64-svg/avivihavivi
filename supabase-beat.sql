-- Who Beat Who: two fighters appear, both players tap the one that has a win over the other. First correct tap wins the round.
-- First to 5 round wins (max 9 rounds). The server picks the pairs and decides who was first. Safe to re-run.
-- Pairs: supabase-beat-pool.sql
create table if not exists public.bt_pool(w text not null, l text not null, primary key (w, l));
create table if not exists public.bt_games (
  id uuid primary key default gen_random_uuid(),
  a uuid not null references auth.users(id) on delete cascade,
  b uuid not null references auth.users(id) on delete cascade,
  status text not null default 'invited',      -- invited | active | done | declined | cancelled
  round int not null default 1,
  wa int not null default 0, wb int not null default 0,
  rstart timestamptz, round_done boolean not null default false, next_start timestamptz,
  rwin uuid, last_w text, last_l text,
  lock_a timestamptz, lock_b timestamptz,
  winner uuid, draw boolean not null default false,
  notified boolean not null default false,
  touched timestamptz not null default now(),
  created_at timestamptz not null default now(), finished_at timestamptz
);
create table if not exists public.bt_secret(game_id uuid primary key references public.bt_games(id) on delete cascade, picks jsonb not null);
alter table public.bt_pool enable row level security;
alter table public.bt_games enable row level security;
alter table public.bt_secret enable row level security;
drop policy if exists "bt read own" on public.bt_games;
create policy "bt read own" on public.bt_games for select to authenticated using (a = auth.uid() or b = auth.uid());
revoke all on public.bt_pool, public.bt_games, public.bt_secret from anon, authenticated;
grant select on public.bt_games to authenticated;

create or replace function public.bt_finish(g public.bt_games, p_winner uuid) returns void
language plpgsql security definer set search_path = public as $$
declare pk jsonb; na int := g.wa; nb int := g.wb; over boolean;
begin
  select picks->(g.round - 1) into pk from public.bt_secret where game_id = g.id;
  if p_winner = g.a then na := na + 1; elsif p_winner = g.b then nb := nb + 1; end if;
  over := na >= 5 or nb >= 5 or g.round >= 9;
  update public.bt_games set wa = na, wb = nb, round_done = true, rwin = p_winner, last_w = pk->>'w', last_l = pk->>'l',
    next_start = case when over then null else now() + interval '3 seconds' end,
    status = case when over then 'done' else 'active' end,
    finished_at = case when over then now() else null end,
    winner = case when over and na > nb then g.a when over and nb > na then g.b else null end,
    draw = (over and na = nb)
  where id = g.id;
end $$;

create or replace function public.bt_advance(p_game uuid) returns void
language plpgsql security definer set search_path = public as $$
declare g public.bt_games;
begin
  select * into g from public.bt_games where id = p_game for update;
  if not found or g.status <> 'active' then return; end if;
  if g.touched < now() - interval '10 minutes' then update public.bt_games set status = 'cancelled', finished_at = now() where id = p_game; return; end if;
  if not g.round_done and g.rstart is not null and now() >= g.rstart + interval '10 seconds' then
    perform public.bt_finish(g, null);
    select * into g from public.bt_games where id = p_game;
  end if;
  if g.status = 'active' and g.round_done and g.next_start is not null and now() >= g.next_start then
    update public.bt_games set round = round + 1, rstart = g.next_start, round_done = false, rwin = null, next_start = null where id = p_game;
  end if;
end $$;

create or replace function public.bt_create(p_to uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); gid uuid; today timestamptz := ((now() at time zone 'Asia/Jerusalem')::date)::timestamp at time zone 'Asia/Jerusalem';
begin
  if me is null then raise exception 'not logged in'; end if;
  if public.invite_pending(me) then raise exception 'you already have a pending invite'; end if;
  if p_to is null or p_to = me or not exists(select 1 from auth.users where id = p_to) then raise exception 'pick another player'; end if;
  if exists(select 1 from public.bt_games where status in ('invited','active') and touched > now() - interval '10 minutes' and ((a = me and b = p_to) or (a = p_to and b = me))) then raise exception 'a game with this player is already open'; end if;
  if exists(select 1 from public.bt_games where a = me and status = 'invited' and created_at > now() - interval '10 seconds') then raise exception 'wait a few seconds before sending another invite'; end if;
  if (select count(*) from public.bt_games where a = me and created_at >= today) >= 10 then raise exception 'too many challenges today'; end if;
  update public.bt_games set status = 'cancelled', finished_at = now() where status in ('invited','active') and ((a = me and b = p_to) or (a = p_to and b = me));
  insert into public.bt_games(a, b) values (me, p_to) returning id into gid;
  return gid;
end $$;

create or replace function public.bt_accept(p_game uuid) returns void
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); g public.bt_games; pk jsonb;
begin
  select * into g from public.bt_games where id = p_game for update;
  if not found or me is null or me <> g.b then raise exception 'no such game'; end if;
  if g.status <> 'invited' then raise exception 'game is not open'; end if;
  select jsonb_agg(jsonb_build_object('w', w, 'l', l, 'f', random() < 0.5)) into pk from (select w, l from public.bt_pool order by random() limit 9) s;
  if pk is null or jsonb_array_length(pk) < 9 then raise exception 'not enough fighters'; end if;
  insert into public.bt_secret(game_id, picks) values (p_game, pk) on conflict (game_id) do update set picks = excluded.picks;
  update public.bt_games set status = 'active', round = 1, rstart = now() + interval '4 seconds', touched = now() where id = p_game;
end $$;

create or replace function public.bt_decline(p_game uuid) returns void
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); g public.bt_games;
begin
  select * into g from public.bt_games where id = p_game for update;
  if not found or me is null or (me <> g.a and me <> g.b) then raise exception 'no such game'; end if;
  if g.status = 'invited' then update public.bt_games set status = case when me = g.a then 'cancelled' else 'declined' end, finished_at = now() where id = p_game;
  elsif g.status = 'active' then update public.bt_games set status = 'cancelled', finished_at = now() where id = p_game; end if;
end $$;

create or replace function public.bt_forfeit(p_game uuid) returns void
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); g public.bt_games;
begin
  select * into g from public.bt_games where id = p_game for update;
  if not found or me is null or (me <> g.a and me <> g.b) then raise exception 'no such game'; end if;
  if g.status <> 'active' then return; end if;
  update public.bt_games set status = 'done', finished_at = now(), round_done = true, draw = false,
    winner = case when me = g.a then g.b else g.a end,
    wa = case when me = g.a then wa else greatest(wa, 5) end, wb = case when me = g.b then wb else greatest(wb, 5) end
  where id = p_game;
end $$;

-- the two names are shown in a fixed order (f flips it); which one won is never sent until the round is over
create or replace function public.bt_view(p_game uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); g public.bt_games; me_a boolean; pk jsonb; x text; y text;
begin
  select * into g from public.bt_games where id = p_game;
  if not found or me is null or (me <> g.a and me <> g.b) then raise exception 'no such game'; end if;
  if g.status = 'active' then update public.bt_games set touched = now() where id = p_game; perform public.bt_advance(p_game); select * into g from public.bt_games where id = p_game; end if;
  me_a := (me = g.a);
  if g.status = 'active' and not g.round_done and now() >= g.rstart - interval '1 second' then
    select picks->(g.round - 1) into pk from public.bt_secret where game_id = p_game;
    if (pk->>'f')::boolean then x := pk->>'l'; y := pk->>'w'; else x := pk->>'w'; y := pk->>'l'; end if;
  end if;
  return jsonb_build_object('status', g.status, 'round', g.round, 'me', case when me_a then g.wa else g.wb end, 'opp', case when me_a then g.wb else g.wa end,
    'now', (extract(epoch from clock_timestamp()) * 1000)::bigint, 'rstart', (extract(epoch from g.rstart) * 1000)::bigint,
    'next', (extract(epoch from g.next_start) * 1000)::bigint, 'done', g.round_done,
    'rwin', case when g.rwin is null then null when g.rwin = me then 'me' else 'opp' end,
    'x', x, 'y', y,
    'w', case when g.round_done or g.status = 'done' then g.last_w else null end, 'l', case when g.round_done or g.status = 'done' then g.last_l else null end,
    'lock', (extract(epoch from case when me_a then g.lock_a else g.lock_b end) * 1000)::bigint,
    'winner', case when g.winner is null then null when g.winner = me then 'me' else 'opp' end, 'draw', g.draw);
end $$;

create or replace function public.bt_pick(p_game uuid, p_name text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); g public.bt_games; me_a boolean; pk jsonb; lk timestamptz;
begin
  select * into g from public.bt_games where id = p_game for update;
  if not found or me is null or (me <> g.a and me <> g.b) then raise exception 'no such game'; end if;
  if g.status <> 'active' then return jsonb_build_object('hit', false, 'why', 'over'); end if;
  perform public.bt_advance(p_game);
  select * into g from public.bt_games where id = p_game;
  if g.status <> 'active' or g.round_done or now() < g.rstart then return jsonb_build_object('hit', false, 'why', 'wait'); end if;
  me_a := (me = g.a);
  lk := case when me_a then g.lock_a else g.lock_b end;
  if lk is not null and lk > now() then return jsonb_build_object('hit', false, 'why', 'locked'); end if;
  select picks->(g.round - 1) into pk from public.bt_secret where game_id = p_game;
  if p_name = pk->>'w' then
    perform public.bt_finish(g, me);
    update public.bt_games set touched = now() where id = p_game;
    return jsonb_build_object('hit', true);
  elsif p_name <> pk->>'l' then return jsonb_build_object('hit', false, 'why', 'bad'); end if;
  if me_a then update public.bt_games set lock_a = now() + interval '2 seconds', touched = now() where id = p_game;
  else update public.bt_games set lock_b = now() + interval '2 seconds', touched = now() where id = p_game; end if;
  return jsonb_build_object('hit', false, 'why', 'wrong');
end $$;

create or replace function public.invite_pending(p_uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.trivia_games where a = p_uid and status = 'invited' and created_at > now() - interval '1 day')
      or exists(select 1 from public.guess_games where a = p_uid and status = 'invited' and created_at > now() - interval '1 day')
      or exists(select 1 from public.who_games where a = p_uid and status = 'invited' and created_at > now() - interval '1 day')
      or exists(select 1 from public.bt_games where a = p_uid and status = 'invited' and created_at > now() - interval '1 day')
$$;

revoke all on function public.bt_finish(public.bt_games, uuid), public.bt_advance(uuid) from public, anon, authenticated;
revoke all on function public.bt_create(uuid), public.bt_accept(uuid), public.bt_decline(uuid), public.bt_forfeit(uuid), public.bt_view(uuid), public.bt_pick(uuid, text) from public, anon;
grant execute on function public.bt_create(uuid), public.bt_accept(uuid), public.bt_decline(uuid), public.bt_forfeit(uuid), public.bt_view(uuid), public.bt_pick(uuid, text) to authenticated;

-- rematch series + coins (applied via migration beat_coins_and_series): bt_pool.n / bt_pool.tot = "fight n of tot" (primary key w,l,n);
-- bt_accept picks distinct pairs; bt_view returns n/tot (live) and wn/wtot (after the round); bt_wins() feeds the coin display;
-- earned_coins adds 5 per won Who Beat Who game (see supabase-who.sql for the full function).
