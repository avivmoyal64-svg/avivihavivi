-- Flag Rush: 1v1. Seven fighters on the left, seven flags on the right; connect each fighter to his country's flag.
-- First to match all seven wins the round. First to 3 round wins (max 5 rounds, 60 seconds each). Safe to re-run.
-- The answers never leave the server: fm_pick only says right or wrong. Fighters: supabase-flags-pool.sql
create table if not exists public.fm_pool(n text primary key, c text not null);
create table if not exists public.fm_games (
  id uuid primary key default gen_random_uuid(),
  a uuid not null references auth.users(id) on delete cascade,
  b uuid not null references auth.users(id) on delete cascade,
  status text not null default 'invited',      -- invited | active | done | declined | cancelled
  round int not null default 1,
  wa int not null default 0, wb int not null default 0,
  rstart timestamptz, round_done boolean not null default false, next_start timestamptz,
  rwin uuid, ma jsonb not null default '[]', mb jsonb not null default '[]',
  lock_a timestamptz, lock_b timestamptz,
  winner uuid, draw boolean not null default false,
  notified boolean not null default false,
  touched timestamptz not null default now(),
  created_at timestamptz not null default now(), finished_at timestamptz
);
create table if not exists public.fm_secret(game_id uuid primary key references public.fm_games(id) on delete cascade, rounds jsonb not null);
alter table public.fm_pool enable row level security;
alter table public.fm_games enable row level security;
alter table public.fm_secret enable row level security;
drop policy if exists "fm read own" on public.fm_games;
create policy "fm read own" on public.fm_games for select to authenticated using (a = auth.uid() or b = auth.uid());
revoke all on public.fm_pool, public.fm_games, public.fm_secret from anon, authenticated;
grant select on public.fm_games to authenticated;

create or replace function public.fm_finish(g public.fm_games, p_winner uuid) returns void
language plpgsql security definer set search_path = public as $$
declare na int := g.wa; nb int := g.wb; over boolean;
begin
  if p_winner = g.a then na := na + 1; elsif p_winner = g.b then nb := nb + 1; end if;
  over := na >= 3 or nb >= 3 or g.round >= 5;
  update public.fm_games set wa = na, wb = nb, round_done = true, rwin = p_winner,
    next_start = case when over then null else now() + interval '5 seconds' end,
    status = case when over then 'done' else 'active' end,
    finished_at = case when over then now() else null end,
    winner = case when over and na > nb then g.a when over and nb > na then g.b else null end,
    draw = (over and na = nb)
  where id = g.id;
end $$;

create or replace function public.fm_advance(p_game uuid) returns void
language plpgsql security definer set search_path = public as $$
declare g public.fm_games; ca int; cb int;
begin
  select * into g from public.fm_games where id = p_game for update;
  if not found or g.status <> 'active' then return; end if;
  if g.touched < now() - interval '10 minutes' then update public.fm_games set status = 'cancelled', finished_at = now() where id = p_game; return; end if;
  if not g.round_done and g.rstart is not null and now() >= g.rstart + interval '60 seconds' then
    ca := jsonb_array_length(g.ma); cb := jsonb_array_length(g.mb);
    perform public.fm_finish(g, case when ca > cb then g.a when cb > ca then g.b else null end);
    select * into g from public.fm_games where id = p_game;
  end if;
  if g.status = 'active' and g.round_done and g.next_start is not null and now() >= g.next_start then
    update public.fm_games set round = round + 1, rstart = g.next_start + interval '3 seconds', round_done = false, rwin = null, ma = '[]', mb = '[]', next_start = null where id = p_game;
  end if;
end $$;

create or replace function public.fm_create(p_to uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); gid uuid; today timestamptz := ((now() at time zone 'Asia/Jerusalem')::date)::timestamp at time zone 'Asia/Jerusalem';
begin
  if me is null then raise exception 'not logged in'; end if;
  if public.invite_pending(me) then raise exception 'you already have a pending invite'; end if;
  if p_to is null or p_to = me or not exists(select 1 from auth.users where id = p_to) then raise exception 'pick another player'; end if;
  if exists(select 1 from public.fm_games where status in ('invited','active') and touched > now() - interval '10 minutes' and ((a = me and b = p_to) or (a = p_to and b = me))) then raise exception 'a game with this player is already open'; end if;
  if exists(select 1 from public.fm_games where a = me and status = 'invited' and created_at > now() - interval '10 seconds') then raise exception 'wait a few seconds before sending another invite'; end if;
  if (select count(*) from public.fm_games where a = me and created_at >= today) >= 10 then raise exception 'too many challenges today'; end if;
  update public.fm_games set status = 'cancelled', finished_at = now() where status in ('invited','active') and ((a = me and b = p_to) or (a = p_to and b = me));
  insert into public.fm_games(a, b) values (me, p_to) returning id into gid;
  return gid;
end $$;

-- five rounds of seven fighters from seven different countries; nobody repeats inside one game
create or replace function public.fm_accept(p_game uuid) returns void
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); g public.fm_games; rs jsonb := '[]'; used text[] := '{}'; pr jsonb; i int;
begin
  select * into g from public.fm_games where id = p_game for update;
  if not found or me is null or me <> g.b then raise exception 'no such game'; end if;
  if g.status <> 'invited' then raise exception 'game is not open'; end if;
  for i in 1..5 loop
    select jsonb_agg(jsonb_build_object('n', s.n, 'c', s.c)) into pr
      from (select n, c from (select distinct on (c) n, c from public.fm_pool where n <> all(used) order by c, random()) d order by random() limit 7) s;
    if pr is null or jsonb_array_length(pr) < 7 then raise exception 'not enough fighters'; end if;
    used := used || coalesce((select array_agg(x->>'n') from jsonb_array_elements(pr) x), '{}');
    rs := rs || jsonb_build_array(jsonb_build_object('p', pr,
      'l', (select jsonb_agg(x->>'n' order by random()) from jsonb_array_elements(pr) x),
      'r', (select jsonb_agg(x->>'c' order by random()) from jsonb_array_elements(pr) x)));
  end loop;
  insert into public.fm_secret(game_id, rounds) values (p_game, rs) on conflict (game_id) do update set rounds = excluded.rounds;
  update public.fm_games set status = 'active', round = 1, rstart = now() + interval '4 seconds', ma = '[]', mb = '[]', touched = now() where id = p_game;
end $$;

create or replace function public.fm_decline(p_game uuid) returns void
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); g public.fm_games;
begin
  select * into g from public.fm_games where id = p_game for update;
  if not found or me is null or (me <> g.a and me <> g.b) then raise exception 'no such game'; end if;
  if g.status = 'invited' then update public.fm_games set status = case when me = g.a then 'cancelled' else 'declined' end, finished_at = now() where id = p_game;
  elsif g.status = 'active' then update public.fm_games set status = 'cancelled', finished_at = now() where id = p_game; end if;
end $$;

create or replace function public.fm_forfeit(p_game uuid) returns void
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); g public.fm_games;
begin
  select * into g from public.fm_games where id = p_game for update;
  if not found or me is null or (me <> g.a and me <> g.b) then raise exception 'no such game'; end if;
  if g.status <> 'active' then return; end if;
  update public.fm_games set status = 'done', finished_at = now(), round_done = true, draw = false,
    winner = case when me = g.a then g.b else g.a end,
    wa = case when me = g.a then wa else greatest(wa, 3) end, wb = case when me = g.b then wb else greatest(wb, 3) end
  where id = p_game;
end $$;

-- left names and right flags are shuffled; only what I already matched is sent back (plus every answer once the round is over)
create or replace function public.fm_view(p_game uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); g public.fm_games; me_a boolean; rd jsonb; mine jsonb; theirs jsonb; l jsonb; r jsonb; mm jsonb; ans jsonb;
begin
  select * into g from public.fm_games where id = p_game;
  if not found or me is null or (me <> g.a and me <> g.b) then raise exception 'no such game'; end if;
  if g.status = 'active' then update public.fm_games set touched = now() where id = p_game; perform public.fm_advance(p_game); select * into g from public.fm_games where id = p_game; end if;
  me_a := (me = g.a);
  mine := case when me_a then g.ma else g.mb end; theirs := case when me_a then g.mb else g.ma end;
  if g.status in ('active','done') then
    select rounds->(least(g.round, 5) - 1) into rd from public.fm_secret where game_id = p_game;
  end if;
  if g.status = 'active' and not g.round_done and now() >= g.rstart - interval '1 second' then l := rd->'l'; r := rd->'r'; end if;
  if g.status = 'active' and not g.round_done then
    select coalesce(jsonb_agg(x), '[]') into mm from jsonb_array_elements(rd->'p') x where jsonb_exists(mine, x->>'n');
  end if;
  if g.round_done or g.status = 'done' then ans := rd->'p'; end if;
  return jsonb_build_object('status', g.status, 'round', g.round, 'me', case when me_a then g.wa else g.wb end, 'opp', case when me_a then g.wb else g.wa end,
    'now', (extract(epoch from clock_timestamp()) * 1000)::bigint, 'rstart', (extract(epoch from g.rstart) * 1000)::bigint,
    'next', (extract(epoch from g.next_start) * 1000)::bigint, 'done', g.round_done,
    'rwin', case when g.rwin is null then null when g.rwin = me then 'me' else 'opp' end,
    'l', l, 'r', r, 'mm', mm, 'mc', jsonb_array_length(mine), 'oc', jsonb_array_length(theirs), 'ans', ans,
    'lock', (extract(epoch from case when me_a then g.lock_a else g.lock_b end) * 1000)::bigint,
    'winner', case when g.winner is null then null when g.winner = me then 'me' else 'opp' end, 'draw', g.draw);
end $$;

create or replace function public.fm_pick(p_game uuid, p_name text, p_cc text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); g public.fm_games; me_a boolean; rd jsonb; lk timestamptz; mine jsonb; hit boolean; n int;
begin
  select * into g from public.fm_games where id = p_game for update;
  if not found or me is null or (me <> g.a and me <> g.b) then raise exception 'no such game'; end if;
  if g.status <> 'active' then return jsonb_build_object('ok', false, 'why', 'over'); end if;
  perform public.fm_advance(p_game);
  select * into g from public.fm_games where id = p_game;
  if g.status <> 'active' or g.round_done or now() < g.rstart then return jsonb_build_object('ok', false, 'why', 'wait'); end if;
  me_a := (me = g.a);
  lk := case when me_a then g.lock_a else g.lock_b end;
  if lk is not null and lk > now() then return jsonb_build_object('ok', false, 'why', 'locked'); end if;
  select rounds->(g.round - 1) into rd from public.fm_secret where game_id = p_game;
  mine := case when me_a then g.ma else g.mb end;
  if not exists(select 1 from jsonb_array_elements(rd->'p') x where x->>'n' = p_name) or p_cc is null then return jsonb_build_object('ok', false, 'why', 'bad'); end if;
  if jsonb_exists(mine, p_name) or exists(select 1 from jsonb_array_elements(rd->'p') x where jsonb_exists(mine, x->>'n') and x->>'c' = p_cc) then return jsonb_build_object('ok', false, 'why', 'dup'); end if;
  select exists(select 1 from jsonb_array_elements(rd->'p') x where x->>'n' = p_name and x->>'c' = p_cc) into hit;
  if hit then
    mine := mine || to_jsonb(p_name); n := jsonb_array_length(mine);
    if me_a then update public.fm_games set ma = mine, touched = now() where id = p_game; else update public.fm_games set mb = mine, touched = now() where id = p_game; end if;
    if n >= 7 then select * into g from public.fm_games where id = p_game; perform public.fm_finish(g, me); end if;
    return jsonb_build_object('ok', true, 'n', n);
  end if;
  if me_a then update public.fm_games set lock_a = now() + interval '2 seconds', touched = now() where id = p_game;
  else update public.fm_games set lock_b = now() + interval '2 seconds', touched = now() where id = p_game; end if;
  return jsonb_build_object('ok', false, 'why', 'wrong');
end $$;

create or replace function public.fm_wins() returns table(winner uuid, n bigint)
language sql stable security definer set search_path = public as $$
  select winner, count(*) from public.fm_games where status = 'done' and winner is not null group by winner
$$;

create or replace function public.invite_pending(p_uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.trivia_games where a = p_uid and status = 'invited' and created_at > now() - interval '1 day')
      or exists(select 1 from public.guess_games where a = p_uid and status = 'invited' and created_at > now() - interval '1 day')
      or exists(select 1 from public.who_games where a = p_uid and status = 'invited' and created_at > now() - interval '1 day')
      or exists(select 1 from public.bt_games where a = p_uid and status = 'invited' and created_at > now() - interval '1 day')
      or exists(select 1 from public.fm_games where a = p_uid and status = 'invited' and created_at > now() - interval '1 day')
$$;

revoke all on function public.fm_finish(public.fm_games, uuid), public.fm_advance(uuid) from public, anon, authenticated;
revoke all on function public.fm_create(uuid), public.fm_accept(uuid), public.fm_decline(uuid), public.fm_forfeit(uuid), public.fm_view(uuid), public.fm_pick(uuid, text, text), public.fm_wins() from public, anon;
grant execute on function public.fm_create(uuid), public.fm_accept(uuid), public.fm_decline(uuid), public.fm_forfeit(uuid), public.fm_view(uuid), public.fm_pick(uuid, text, text), public.fm_wins() to authenticated;

-- coins: earned_coins gets one more term, 5 per won Flag Rush game:
--   + coalesce((select 5 * count(*) from public.fm_games where winner = p_uid and status = 'done'), 0)::int
-- (applied via migration flag_rush_core; full function lives in supabase-who.sql)
-- Flag Rush v2 (NOT YET APPLIED to the database, migration flag_rush_done_button is pending): matches are only placed, not checked. You press Done when you think all seven are right.
-- Done with any mistake says only "wrong" (3 second lock). First correct Done wins the round. At time-up the player with more correct placements wins.
alter table public.fm_games add column if not exists how text;
alter table public.fm_games alter column ma set default '{}'::jsonb, alter column mb set default '{}'::jsonb;
update public.fm_games set ma = '{}'::jsonb, mb = '{}'::jsonb where status in ('invited','active');
drop function if exists public.fm_pick(uuid, text, text);

create or replace function public.fm_finish(g public.fm_games, p_winner uuid) returns void
language plpgsql security definer set search_path = public as $$
declare na int := g.wa; nb int := g.wb; over boolean;
begin
  if p_winner = g.a then na := na + 1; elsif p_winner = g.b then nb := nb + 1; end if;
  over := na >= 3 or nb >= 3 or g.round >= 5;
  update public.fm_games set wa = na, wb = nb, round_done = true, rwin = p_winner, how = 'done',
    next_start = case when over then null else now() + interval '5 seconds' end,
    status = case when over then 'done' else 'active' end,
    finished_at = case when over then now() else null end,
    winner = case when over and na > nb then g.a when over and nb > na then g.b else null end,
    draw = (over and na = nb)
  where id = g.id;
end $$;

create or replace function public.fm_advance(p_game uuid) returns void
language plpgsql security definer set search_path = public as $$
declare g public.fm_games; rd jsonb; ca int; cb int;
begin
  select * into g from public.fm_games where id = p_game for update;
  if not found or g.status <> 'active' then return; end if;
  if g.touched < now() - interval '10 minutes' then update public.fm_games set status = 'cancelled', finished_at = now() where id = p_game; return; end if;
  if not g.round_done and g.rstart is not null and now() >= g.rstart + interval '60 seconds' then
    select rounds->(g.round - 1) into rd from public.fm_secret where game_id = p_game;
    select count(*) into ca from jsonb_array_elements(rd->'p') x where g.ma->>(x->>'n') = x->>'c';
    select count(*) into cb from jsonb_array_elements(rd->'p') x where g.mb->>(x->>'n') = x->>'c';
    perform public.fm_finish(g, case when ca > cb then g.a when cb > ca then g.b else null end);
    update public.fm_games set how = 'time' where id = p_game;
    select * into g from public.fm_games where id = p_game;
  end if;
  if g.status = 'active' and g.round_done and g.next_start is not null and now() >= g.next_start then
    update public.fm_games set round = round + 1, rstart = g.next_start + interval '3 seconds', round_done = false, rwin = null, how = null, ma = '{}'::jsonb, mb = '{}'::jsonb, next_start = null where id = p_game;
  end if;
end $$;

create or replace function public.fm_accept(p_game uuid) returns void
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); g public.fm_games; rs jsonb := '[]'; used text[] := '{}'; pr jsonb; i int;
begin
  select * into g from public.fm_games where id = p_game for update;
  if not found or me is null or me <> g.b then raise exception 'no such game'; end if;
  if g.status <> 'invited' then raise exception 'game is not open'; end if;
  for i in 1..5 loop
    select jsonb_agg(jsonb_build_object('n', s.n, 'c', s.c)) into pr
      from (select n, c from (select distinct on (c) n, c from public.fm_pool where n <> all(used) order by c, random()) d order by random() limit 7) s;
    if pr is null or jsonb_array_length(pr) < 7 then raise exception 'not enough fighters'; end if;
    used := used || coalesce((select array_agg(x->>'n') from jsonb_array_elements(pr) x), '{}');
    rs := rs || jsonb_build_array(jsonb_build_object('p', pr,
      'l', (select jsonb_agg(x->>'n' order by random()) from jsonb_array_elements(pr) x),
      'r', (select jsonb_agg(x->>'c' order by random()) from jsonb_array_elements(pr) x)));
  end loop;
  insert into public.fm_secret(game_id, rounds) values (p_game, rs) on conflict (game_id) do update set rounds = excluded.rounds;
  update public.fm_games set status = 'active', round = 1, rstart = now() + interval '4 seconds', ma = '{}'::jsonb, mb = '{}'::jsonb, touched = now() where id = p_game;
end $$;

create or replace function public.fm_view(p_game uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); g public.fm_games; me_a boolean; rd jsonb; mine jsonb; theirs jsonb; l jsonb; r jsonb; mm jsonb; ans jsonb;
begin
  select * into g from public.fm_games where id = p_game;
  if not found or me is null or (me <> g.a and me <> g.b) then raise exception 'no such game'; end if;
  if g.status = 'active' then update public.fm_games set touched = now() where id = p_game; perform public.fm_advance(p_game); select * into g from public.fm_games where id = p_game; end if;
  me_a := (me = g.a);
  mine := case when me_a then g.ma else g.mb end; theirs := case when me_a then g.mb else g.ma end;
  if g.status in ('active','done') then
    select rounds->(least(g.round, 5) - 1) into rd from public.fm_secret where game_id = p_game;
  end if;
  if g.status = 'active' and not g.round_done and now() >= g.rstart - interval '1 second' then l := rd->'l'; r := rd->'r'; end if;
  if g.status = 'active' and not g.round_done then
    select coalesce(jsonb_agg(jsonb_build_object('n', e.k, 'c', e.v)), '[]'::jsonb) into mm from jsonb_each_text(mine) as e(k, v);
  end if;
  if g.round_done or g.status = 'done' then ans := rd->'p'; end if;
  return jsonb_build_object('status', g.status, 'round', g.round, 'me', case when me_a then g.wa else g.wb end, 'opp', case when me_a then g.wb else g.wa end,
    'now', (extract(epoch from clock_timestamp()) * 1000)::bigint, 'rstart', (extract(epoch from g.rstart) * 1000)::bigint,
    'next', (extract(epoch from g.next_start) * 1000)::bigint, 'done', g.round_done, 'how', g.how,
    'rwin', case when g.rwin is null then null when g.rwin = me then 'me' else 'opp' end,
    'l', l, 'r', r, 'mm', mm, 'mc', (select count(*) from jsonb_object_keys(mine)), 'oc', (select count(*) from jsonb_object_keys(theirs)), 'ans', ans,
    'lock', (extract(epoch from case when me_a then g.lock_a else g.lock_b end) * 1000)::bigint,
    'winner', case when g.winner is null then null when g.winner = me then 'me' else 'opp' end, 'draw', g.draw);
end $$;

-- place (or move, or with a null flag remove) one fighter-to-flag match. Nothing is checked here.
create or replace function public.fm_set(p_game uuid, p_name text, p_cc text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); g public.fm_games; me_a boolean; rd jsonb; mine jsonb;
begin
  select * into g from public.fm_games where id = p_game for update;
  if not found or me is null or (me <> g.a and me <> g.b) then raise exception 'no such game'; end if;
  if g.status <> 'active' then return jsonb_build_object('ok', false, 'why', 'over'); end if;
  perform public.fm_advance(p_game);
  select * into g from public.fm_games where id = p_game;
  if g.status <> 'active' or g.round_done or now() < g.rstart then return jsonb_build_object('ok', false, 'why', 'wait'); end if;
  me_a := (me = g.a);
  select rounds->(g.round - 1) into rd from public.fm_secret where game_id = p_game;
  if not exists(select 1 from jsonb_array_elements(rd->'p') x where x->>'n' = p_name) then return jsonb_build_object('ok', false, 'why', 'bad'); end if;
  mine := (case when me_a then g.ma else g.mb end) - p_name;
  if p_cc is not null then
    if not exists(select 1 from jsonb_array_elements_text(rd->'r') x where x = p_cc) then return jsonb_build_object('ok', false, 'why', 'bad'); end if;
    select coalesce(jsonb_object_agg(e.k, e.v), '{}'::jsonb) into mine from jsonb_each_text(mine) as e(k, v) where e.v <> p_cc;
    mine := mine || jsonb_build_object(p_name, p_cc);
  end if;
  if me_a then update public.fm_games set ma = mine, touched = now() where id = p_game; else update public.fm_games set mb = mine, touched = now() where id = p_game; end if;
  return jsonb_build_object('ok', true, 'n', (select count(*) from jsonb_object_keys(mine)));
end $$;

-- "Done": all seven right wins the round. Otherwise the answer is only "wrong" (never which ones), and Done is locked for 3 seconds.
create or replace function public.fm_done(p_game uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); g public.fm_games; me_a boolean; rd jsonb; mine jsonb; lk timestamptz; n int;
begin
  select * into g from public.fm_games where id = p_game for update;
  if not found or me is null or (me <> g.a and me <> g.b) then raise exception 'no such game'; end if;
  if g.status <> 'active' then return jsonb_build_object('ok', false, 'why', 'over'); end if;
  perform public.fm_advance(p_game);
  select * into g from public.fm_games where id = p_game;
  if g.status <> 'active' or g.round_done or now() < g.rstart then return jsonb_build_object('ok', false, 'why', 'wait'); end if;
  me_a := (me = g.a);
  lk := case when me_a then g.lock_a else g.lock_b end;
  if lk is not null and lk > now() then return jsonb_build_object('ok', false, 'why', 'locked'); end if;
  mine := case when me_a then g.ma else g.mb end;
  if (select count(*) from jsonb_object_keys(mine)) < 7 then return jsonb_build_object('ok', false, 'why', 'few'); end if;
  select rounds->(g.round - 1) into rd from public.fm_secret where game_id = p_game;
  select count(*) into n from jsonb_array_elements(rd->'p') x where mine->>(x->>'n') = x->>'c';
  if n >= 7 then
    update public.fm_games set touched = now() where id = p_game;
    select * into g from public.fm_games where id = p_game;
    perform public.fm_finish(g, me);
    return jsonb_build_object('ok', true);
  end if;
  if me_a then update public.fm_games set lock_a = now() + interval '3 seconds', touched = now() where id = p_game;
  else update public.fm_games set lock_b = now() + interval '3 seconds', touched = now() where id = p_game; end if;
  return jsonb_build_object('ok', false, 'why', 'wrong');
end $$;

revoke all on function public.fm_finish(public.fm_games, uuid), public.fm_advance(uuid) from public, anon, authenticated;
revoke all on function public.fm_set(uuid, text, text), public.fm_done(uuid) from public, anon;
grant execute on function public.fm_set(uuid, text, text), public.fm_done(uuid) to authenticated;
