-- Trivia duel, part 2: five kinds of duel (random fighter 25 coins, weight class 10, specific fighter 10,
-- this week's card 10, fighter swap 15). Run this AFTER supabase-duel.sql.
alter table public.trivia_games add column if not exists mode text not null default 'random';
alter table public.trivia_games add column if not exists topic text;
alter table public.trivia_games add column if not exists reward int not null default 25;
alter table public.trivia_games add column if not exists questions_b jsonb;
alter table public.trivia_games add column if not exists fighter_b text;
alter table public.trivia_secret add column if not exists answers_b int[];

drop function if exists public.trivia_create(uuid, text, jsonb, int[]);
create or replace function public.trivia_create(p_to uuid, p_mode text, p_topic text, p_fighter text, p_q jsonb, p_ans int[],
  p_fighter_b text default null, p_q_b jsonb default null, p_ans_b int[] default null) returns uuid
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); gid uuid; rw int; today timestamptz := ((now() at time zone 'Asia/Jerusalem')::date)::timestamp at time zone 'Asia/Jerusalem';
begin
  if uid is null then raise exception 'not logged in'; end if;
  if p_to is null or p_to = uid then raise exception 'pick another player'; end if;
  if not exists(select 1 from auth.users where id = p_to) then raise exception 'pick another player'; end if;
  rw := case p_mode when 'random' then 25 when 'class' then 10 when 'fighter' then 10 when 'card' then 10 when 'fav' then 15 else null end;
  if rw is null then raise exception 'bad mode'; end if;
  if jsonb_typeof(p_q) <> 'array' or jsonb_array_length(p_q) <> 10 or coalesce(array_length(p_ans,1),0) <> 10 then raise exception 'bad questions'; end if;
  if exists(select 1 from unnest(p_ans) x where x < 0 or x > 3) then raise exception 'bad questions'; end if;
  if p_mode = 'fav' then
    if p_q_b is null or jsonb_typeof(p_q_b) <> 'array' or jsonb_array_length(p_q_b) <> 10 or coalesce(array_length(p_ans_b,1),0) <> 10 then raise exception 'bad questions'; end if;
    if exists(select 1 from unnest(p_ans_b) x where x < 0 or x > 3) then raise exception 'bad questions'; end if;
  end if;
  if exists(select 1 from public.trivia_games where status in ('invited','active') and ((a = uid and b = p_to) or (a = p_to and b = uid))) then raise exception 'a game with this player is already open'; end if;
  if (select count(*) from public.trivia_games where a = uid and created_at >= today) >= 8 then raise exception 'too many challenges today'; end if;
  insert into public.trivia_games(a, b, mode, topic, reward, fighter, fighter_b, questions, questions_b)
    values (uid, p_to, p_mode, left(coalesce(p_topic,''), 60), rw, left(coalesce(p_fighter,''), 60), left(p_fighter_b, 60), p_q, case when p_mode = 'fav' then p_q_b end)
    returning id into gid;
  insert into public.trivia_secret(game_id, answers, answers_b) values (gid, p_ans, case when p_mode = 'fav' then p_ans_b end);
  return gid;
end $$;

create or replace function public.trivia_submit(p_game uuid, p_picks int[], p_ms int) returns int
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); g record; k int[]; sc int := 0; i int; ms int := least(greatest(coalesce(p_ms,0), 0), 600000);
        wn uuid; rw boolean := false; today timestamptz := ((now() at time zone 'Asia/Jerusalem')::date)::timestamp at time zone 'Asia/Jerusalem';
begin
  select * into g from public.trivia_games where id = p_game for update;
  if not found or uid is null or (uid <> g.a and uid <> g.b) then raise exception 'no such game'; end if;
  if g.status not in ('invited','active') then raise exception 'game is over'; end if;
  if coalesce(array_length(p_picks,1),0) <> 10 then raise exception 'bad answers'; end if;
  if (uid = g.a and g.a_score is not null) or (uid = g.b and g.b_score is not null) then raise exception 'already played'; end if;
  select case when g.mode = 'fav' and uid = g.b then answers_b else answers end into k from public.trivia_secret where game_id = p_game;
  for i in 1..10 loop if p_picks[i] = k[i] then sc := sc + 1; end if; end loop;
  if uid = g.a then g.a_score := sc; g.a_ms := ms; else g.b_score := sc; g.b_ms := ms; end if;
  if g.a_score is not null and g.b_score is not null then
    if g.a_score > g.b_score then wn := g.a;
    elsif g.b_score > g.a_score then wn := g.b;
    elsif g.a_ms < g.b_ms then wn := g.a;
    elsif g.b_ms < g.a_ms then wn := g.b; end if;
    if wn is not null then
      rw := (select count(*) from public.trivia_games where winner = wn and rewarded and finished_at >= today) < 6
        and (select count(*) from public.trivia_games where winner = wn and rewarded and finished_at >= today and (a = wn and b = (case when wn = g.a then g.b else g.a end) or b = wn and a = (case when wn = g.a then g.b else g.a end))) < 3;
    end if;
    update public.trivia_games set a_score = g.a_score, b_score = g.b_score, a_ms = g.a_ms, b_ms = g.b_ms, status = 'done',
      winner = wn, rewarded = rw, draw = (wn is null), finished_at = now() where id = p_game;
  else
    update public.trivia_games set a_score = g.a_score, b_score = g.b_score, a_ms = g.a_ms, b_ms = g.b_ms, status = 'active' where id = p_game;
  end if;
  return sc;
end $$;

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
         + coalesce((select sum(amount) from public.case_opens where user_id = p_uid and prize = 'coins'), 0)::int
         + coalesce((select sum(reward) from public.trivia_games where winner = p_uid and rewarded), 0)::int;
end $$;

revoke all on function public.trivia_create(uuid, text, text, text, jsonb, int[], text, jsonb, int[]), public.trivia_submit(uuid, int[], int) from public, anon;
grant execute on function public.trivia_create(uuid, text, text, text, jsonb, int[], text, jsonb, int[]), public.trivia_submit(uuid, int[], int) to authenticated;
