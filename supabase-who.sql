-- Who's Who race: two players see the same blurred fighter photo at the same moment; first correct guess wins the round.
-- First to 3 round wins (best of 5). The server picks the fighters and decides who was first. Winner gets 5 coins. Safe to re-run.
create table if not exists public.who_pool(name text primary key);
insert into public.who_pool(name) values ('Aaron Pico'),('Abdul Rakhman Yakhyaev'),('Aiemann Zahabi'),('Akbar Abdullaev'),('Aleksandar Rakić'),('Aleksandre Topuria'),('Alex Pereira'),('Alexander Gustafsson'),('Alexander Volkanovski'),('Alexander Volkov'),('Alexandre Pantoja'),('Aljamain Sterling'),('Anderson Silva'),('Anthony Wint'),('Arman Tsarukyan'),('Arnold Allen'),('Asu Almabayev'),('Ateba Gautier'),('Axel Sola'),('Azamat Murzakanov'),('Baisangur Susurkaev'),('Belal Muhammad'),('Beneil Dariush'),('Benoît Saint Denis'),('Bilal Hasan'),('Bo Nickal'),('Bogdan Guskov'),('Brando Peričić'),('Brandon Moreno'),('Brandon Royval'),('Brendan Allen'),('Brian Ortega'),('Bryce Mitchell'),('Cain Velasquez'),('Caio Borralho'),('Carlos Prates'),('Carlos Ulberg'),('Charles Johnson'),('Charles Oliveira'),('Chris Weidman'),('Christian Leroy Duncan'),('Ciryl Gane'),('Colby Covington'),('Conor McGregor'),('Cory Sandhagen'),('Curtis Blaydes'),('Damian Pinas'),('Dan Hooker'),('Daniel Cormier'),('Deiveson Figueiredo'),('Demetrious Johnson'),('Derrick Lewis'),('Diego Lopes'),('Dominick Cruz'),('Dominick Reyes'),('Dricus Du Plessis'),('Dustin Poirier'),('Eddie Alvarez'),('Esteban Ribovics'),('Ethyn Ewing'),('Francis Ngannou'),('Gable Steveson'),('Gabriel Bonfim'),('Geoff Neal'),('Georges St-Pierre'),('Gilbert Burns'),('Glover Teixeira'),('Gregory Rodrigues'),('Henry Cejudo'),('Ian Garry'),('Ikram Aliskerov'),('Ilia Topuria'),('Islam Makhachev'),('Israel Adesanya'),('Jack Della Maddalena'),('Jacobe Smith'),('Jan Błachowicz'),('Jared Cannonier'),('Jean Silva'),('Jiří Procházka'),('Joaquin Buckley'),('Joe Pyfer'),('Johnny Walker'),('Jon Jones'),('Jorge Masvidal'),('Jose Aldo'),('Josh Emmett'),('Josh Hokit'),('Joshua Van'),('Junior dos Santos'),('Justin Gaethje'),('Kamaru Usman'),('Kevin Holland'),('Kevin Vallejos'),('Khabib Nurmagomedov'),('Khalil Rountree Jr.'),('Khamzat Chimaev'),('King Green'),('Kyoji Horiguchi'),('Leon Edwards'),('Lerone Murphy'),('Lone''er Kavanagh'),('Luke Riley'),('Magomed Ankalaev'),('Magomed Zaynukov'),('Manel Kape'),('Mario Bautista'),('Mario Pinto'),('Marlon Vera'),('Marwane Rahiki'),('Mateusz Gamrot'),('Maurício Ruffy'),('Max Holloway'),('Melquizael Costa'),('Merab Dvalishvili'),('Michael Bisping'),('Michael Chandler'),('Michael Morales'),('Mike Malott'),('Movsar Evloev'),('Muhammad Saidov'),('Nassourdine Imavov'),('Navajo Stirling'),('Neil Magny'),('Paddy Pimblett'),('Patricio Pitbull'),('Paulo Costa'),('Payton Talbott'),('Petr Yan'),('Quillan Salkilld'),('Rafael Fiziev'),('Ramazan Temirov'),('Raoni Barcelos'),('Raul Rosas Jr.'),('Reinier de Ridder'),('Renato Moicano'),('Rizvan Kuniev'),('Robbie Lawler'),('Robert Whittaker'),('Roberto Soldić'),('Roman Kopylov'),('Salahdine Parnasse'),('Sean Brady'),('Sean O''Malley'),('Sean Strickland'),('Sergei Pavlovich'),('Serghei Spivac'),('Shamil Gaziev'),('Shara Magomedov'),('Shavkat Rakhmonov'),('Song Yadong'),('Steve Erceg'),('Steve Garcia'),('Stipe Miocic'),('T.J. Dillashaw'),('Tai Tuivasa'),('Tallison Teixeira'),('Tatsuro Taira'),('Terrance McKinney'),('Tom Aspinall'),('Tom Nolan'),('Tommy McMillen'),('Tony Ferguson'),('Tyron Woodley'),('Umar Nurmagomedov'),('Uroš Medić'),('Usman Nurmagomedov'),('Valter Walker'),('Waldo Cortes Acosta'),('Yair Rodriguez'),('Yaroslav Amosov'),('Yoel Romero'),('Yousri Belgaroui'),('Youssef Zalal') on conflict do nothing;

create table if not exists public.who_games (
  id uuid primary key default gen_random_uuid(),
  a uuid not null references auth.users(id) on delete cascade,
  b uuid not null references auth.users(id) on delete cascade,
  status text not null default 'invited',      -- invited | active | done | declined | cancelled
  round int not null default 1,
  wa int not null default 0, wb int not null default 0,
  rstart timestamptz,                           -- when the current round's photo appears
  round_done boolean not null default false,
  resolved_at timestamptz, next_start timestamptz,
  rwin uuid, last_name text,                    -- winner / answer of the round that just ended
  lock_a timestamptz, lock_b timestamptz,       -- wrong guess = short lock-out
  winner uuid, draw boolean not null default false,
  notified boolean not null default false,
  touched timestamptz not null default now(),
  created_at timestamptz not null default now(), finished_at timestamptz
);
create table if not exists public.who_secret(game_id uuid primary key references public.who_games(id) on delete cascade, picks jsonb not null);
alter table public.who_pool enable row level security;
alter table public.who_games enable row level security;
alter table public.who_secret enable row level security;
drop policy if exists "who read own" on public.who_games;
create policy "who read own" on public.who_games for select to authenticated using (a = auth.uid() or b = auth.uid());
revoke all on public.who_pool, public.who_games, public.who_secret from anon, authenticated;
grant select on public.who_games to authenticated;

-- ends the current round (p_winner null = nobody got it in time) and moves the game on
create or replace function public.who_finish(g public.who_games, p_winner uuid) returns void
language plpgsql security definer set search_path = public as $$
declare nm text; na int := g.wa; nb int := g.wb; over boolean;
begin
  select picks->>(g.round - 1) into nm from public.who_secret where game_id = g.id;
  if p_winner = g.a then na := na + 1; elsif p_winner = g.b then nb := nb + 1; end if;
  over := na >= 3 or nb >= 3 or g.round >= 5;
  update public.who_games set wa = na, wb = nb, round_done = true, resolved_at = now(), rwin = p_winner, last_name = nm,
    next_start = case when over then null else now() + interval '7 seconds' end,
    status = case when over then 'done' else 'active' end,
    finished_at = case when over then now() else null end,
    winner = case when over and na > nb then g.a when over and nb > na then g.b else null end,
    draw = (over and na = nb)
  where id = g.id;
end $$;

-- brings a game up to date: round time-outs, next round, abandoned games
create or replace function public.who_advance(p_game uuid) returns void
language plpgsql security definer set search_path = public as $$
declare g public.who_games;
begin
  select * into g from public.who_games where id = p_game for update;
  if not found or g.status <> 'active' then return; end if;
  if g.touched < now() - interval '10 minutes' then update public.who_games set status = 'cancelled', finished_at = now() where id = p_game; return; end if;
  if not g.round_done and g.rstart is not null and now() >= g.rstart + interval '30 seconds' then
    perform public.who_finish(g, null);
    select * into g from public.who_games where id = p_game;
  end if;
  if g.status = 'active' and g.round_done and g.next_start is not null and now() >= g.next_start then
    update public.who_games set round = round + 1, rstart = g.next_start, round_done = false, rwin = null, next_start = null where id = p_game;
  end if;
end $$;

drop function if exists public.who_create(uuid);
create or replace function public.who_create(p_to uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); gid uuid; today timestamptz := ((now() at time zone 'Asia/Jerusalem')::date)::timestamp at time zone 'Asia/Jerusalem';
begin
  if uid is null then raise exception 'not logged in'; end if;
  if p_to is null or p_to = uid or not exists(select 1 from auth.users where id = p_to) then raise exception 'pick another player'; end if;
  if exists(select 1 from public.who_games where status in ('invited','active') and touched > now() - interval '10 minutes' and ((a = uid and b = p_to) or (a = p_to and b = uid))) then raise exception 'a game with this player is already open'; end if;
  if exists(select 1 from public.who_games where a = uid and status = 'invited' and created_at > now() - interval '10 seconds') then raise exception 'wait a few seconds before sending another invite'; end if;
  if (select count(*) from public.who_games where a = uid and created_at >= today) >= 10 then raise exception 'too many challenges today'; end if;
  update public.who_games set status = 'cancelled', finished_at = now() where status in ('invited','active') and ((a = uid and b = p_to) or (a = p_to and b = uid));
  insert into public.who_games(a, b) values (uid, p_to) returning id into gid;
  return gid;
end $$;

drop function if exists public.who_accept(uuid);
create or replace function public.who_accept(p_game uuid) returns void
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); g public.who_games; pk jsonb;
begin
  select * into g from public.who_games where id = p_game for update;
  if not found or uid is null or uid <> g.b then raise exception 'no such game'; end if;
  if g.status <> 'invited' then raise exception 'game is not open'; end if;
  select jsonb_agg(name) into pk from (select name from public.who_pool order by random() limit 5) s;
  if pk is null or jsonb_array_length(pk) < 5 then raise exception 'not enough fighters'; end if;
  insert into public.who_secret(game_id, picks) values (p_game, pk) on conflict (game_id) do update set picks = excluded.picks;
  update public.who_games set status = 'active', round = 1, rstart = now() + interval '5 seconds', touched = now() where id = p_game;
end $$;

drop function if exists public.who_decline(uuid);
create or replace function public.who_decline(p_game uuid) returns void
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); g public.who_games;
begin
  select * into g from public.who_games where id = p_game for update;
  if not found or uid is null or (uid <> g.a and uid <> g.b) then raise exception 'no such game'; end if;
  if g.status = 'invited' then update public.who_games set status = case when uid = g.a then 'cancelled' else 'declined' end, finished_at = now() where id = p_game;
  elsif g.status = 'active' then update public.who_games set status = 'cancelled', finished_at = now() where id = p_game;
  end if;
end $$;

-- what the caller may see. The fighter is only identified by a hash (pk) while the round is live; the name only after the round.
drop function if exists public.who_view(uuid);
create or replace function public.who_view(p_game uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); g public.who_games; me_a boolean; nm text; ms numeric := extract(epoch from clock_timestamp()) * 1000;
begin
  select * into g from public.who_games where id = p_game;
  if not found or uid is null or (uid <> g.a and uid <> g.b) then raise exception 'no such game'; end if;
  if g.status = 'active' then update public.who_games set touched = now() where id = p_game; perform public.who_advance(p_game); select * into g from public.who_games where id = p_game; end if;
  me_a := (uid = g.a);
  if g.status = 'active' and not g.round_done and now() >= g.rstart - interval '1 second' then
    select picks->>(g.round - 1) into nm from public.who_secret where game_id = p_game;
  end if;
  return jsonb_build_object('status', g.status, 'round', g.round, 'me', case when me_a then g.wa else g.wb end, 'opp', case when me_a then g.wb else g.wa end,
    'now', (extract(epoch from clock_timestamp()) * 1000)::bigint, 'rstart', (extract(epoch from g.rstart) * 1000)::bigint,
    'next', (extract(epoch from g.next_start) * 1000)::bigint, 'done', g.round_done,
    'rwin', case when g.rwin is null then null when g.rwin = uid then 'me' else 'opp' end,
    'name', case when g.round_done or g.status = 'done' then g.last_name else null end,
    'pk', case when nm is null then null else left(encode(sha256(convert_to(nm, 'utf8')), 'hex'), 10) end,
    'lock', (extract(epoch from case when me_a then g.lock_a else g.lock_b end) * 1000)::bigint,
    'winner', case when g.winner is null then null when g.winner = uid then 'me' else 'opp' end, 'draw', g.draw);
end $$;

drop function if exists public.who_guess(uuid, text);
create or replace function public.who_guess(p_game uuid, p_name text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); g public.who_games; me_a boolean; nm text; lk timestamptz;
begin
  select * into g from public.who_games where id = p_game for update;
  if not found or uid is null or (uid <> g.a and uid <> g.b) then raise exception 'no such game'; end if;
  if g.status <> 'active' then return jsonb_build_object('hit', false, 'why', 'over'); end if;
  perform public.who_advance(p_game);
  select * into g from public.who_games where id = p_game;
  if g.status <> 'active' or g.round_done or now() < g.rstart then return jsonb_build_object('hit', false, 'why', 'wait'); end if;
  me_a := (uid = g.a);
  lk := case when me_a then g.lock_a else g.lock_b end;
  if lk is not null and lk > now() then return jsonb_build_object('hit', false, 'why', 'locked'); end if;
  select picks->>(g.round - 1) into nm from public.who_secret where game_id = p_game;
  if lower(btrim(coalesce(p_name, ''))) = lower(btrim(nm)) then
    perform public.who_finish(g, uid);
    update public.who_games set touched = now() where id = p_game;
    return jsonb_build_object('hit', true);
  end if;
  if me_a then update public.who_games set lock_a = now() + interval '2 seconds', touched = now() where id = p_game;
  else update public.who_games set lock_b = now() + interval '2 seconds', touched = now() where id = p_game; end if;
  return jsonb_build_object('hit', false, 'why', 'wrong');
end $$;

drop function if exists public.who_wins();
create or replace function public.who_wins() returns table(winner uuid, n bigint)
language sql stable security definer set search_path = public as $$
  select winner, count(*) from public.who_games where status = 'done' and winner is not null group by winner
$$;

revoke all on function public.who_finish(public.who_games, uuid), public.who_advance(uuid) from public, anon, authenticated;
revoke all on function public.who_create(uuid), public.who_accept(uuid), public.who_decline(uuid), public.who_view(uuid), public.who_guess(uuid, text), public.who_wins() from public, anon;
grant execute on function public.who_create(uuid), public.who_accept(uuid), public.who_decline(uuid), public.who_view(uuid), public.who_guess(uuid, text), public.who_wins() to authenticated;

-- coins: a won race pays 5
create or replace function public.earned_coins(p_uid uuid) returns integer
language plpgsql stable security definer set search_path to 'public' as $function$
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
         + coalesce((select sum(reward) from public.trivia_games where winner = p_uid and rewarded), 0)::int
         + coalesce((select 5 * count(*) from public.who_games where winner = p_uid and status = 'done'), 0)::int;
end $function$;

-- cron-free: games clean themselves up (stale ones are cancelled the next time anyone opens them)

-- quitting a race counts as a loss: the other player wins
create or replace function public.who_forfeit(p_game uuid) returns void
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); g public.who_games;
begin
  select * into g from public.who_games where id = p_game for update;
  if not found or uid is null or (uid <> g.a and uid <> g.b) then raise exception 'no such game'; end if;
  if g.status <> 'active' then return; end if;
  update public.who_games set status = 'done', finished_at = now(), round_done = true, draw = false,
    winner = case when uid = g.a then g.b else g.a end,
    wa = case when uid = g.a then wa else greatest(wa, 3) end,
    wb = case when uid = g.b then wb else greatest(wb, 3) end
  where id = p_game;
end $$;
grant execute on function public.who_forfeit(uuid) to authenticated;

-- one pending invite at a time (any game): see invite_pending() and the checks in trivia_create / guess_create / who_create (applied via migration one_pending_invite_at_a_time)
