-- 1v1 trivia duel. Run this AFTER supabase-case.sql (it redefines earned_coins to add the 25-coin wins).
-- Questions are made by the challenger's browser. The answer key lives in trivia_secret, which nobody can read from the site.
create table if not exists public.trivia_games(
  id uuid primary key default gen_random_uuid(),
  a uuid not null references auth.users(id) on delete cascade,
  b uuid not null references auth.users(id) on delete cascade,
  status text not null default 'invited' check (status in ('invited','active','done','declined','cancelled')),
  fighter text,
  questions jsonb not null,
  a_score int, b_score int, a_ms int, b_ms int,
  winner uuid, rewarded boolean not null default false, draw boolean not null default false,
  notified boolean not null default false,
  created_at timestamptz not null default now(), finished_at timestamptz
);
create table if not exists public.trivia_secret(game_id uuid primary key references public.trivia_games(id) on delete cascade, answers int[] not null);
alter table public.trivia_games enable row level security;
alter table public.trivia_secret enable row level security;
drop policy if exists "trivia read own" on public.trivia_games;
create policy "trivia read own" on public.trivia_games for select to authenticated using (auth.uid() = a or auth.uid() = b or status = 'done');
do $$ begin alter publication supabase_realtime add table public.trivia_games; exception when others then null; end $$;

create or replace function public.trivia_create(p_to uuid, p_fighter text, p_q jsonb, p_ans int[]) returns uuid
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); gid uuid; today timestamptz := ((now() at time zone 'Asia/Jerusalem')::date)::timestamp at time zone 'Asia/Jerusalem';
begin
  if uid is null then raise exception 'not logged in'; end if;
  if p_to is null or p_to = uid then raise exception 'pick another player'; end if;
  if not exists(select 1 from auth.users where id = p_to) then raise exception 'pick another player'; end if;
  if jsonb_typeof(p_q) <> 'array' or jsonb_array_length(p_q) <> 10 or coalesce(array_length(p_ans,1),0) <> 10 then raise exception 'bad questions'; end if;
  if exists(select 1 from unnest(p_ans) x where x < 0 or x > 3) then raise exception 'bad questions'; end if;
  if exists(select 1 from public.trivia_games where status in ('invited','active') and ((a = uid and b = p_to) or (a = p_to and b = uid))) then raise exception 'a game with this player is already open'; end if;
  if (select count(*) from public.trivia_games where a = uid and created_at >= today) >= 8 then raise exception 'too many challenges today'; end if;
  insert into public.trivia_games(a, b, fighter, questions) values (uid, p_to, left(coalesce(p_fighter,''), 60), p_q) returning id into gid;
  insert into public.trivia_secret(game_id, answers) values (gid, p_ans);
  return gid;
end $$;

create or replace function public.trivia_decline(p_game uuid) returns void
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); g record;
begin
  select * into g from public.trivia_games where id = p_game for update;
  if not found or uid is null or (uid <> g.a and uid <> g.b) then raise exception 'no such game'; end if;
  if g.status not in ('invited','active') then return; end if;
  if g.b_score is not null then raise exception 'game already started'; end if;
  if uid = g.b then update public.trivia_games set status = 'declined', finished_at = now() where id = p_game;
  else update public.trivia_games set status = 'cancelled', finished_at = now() where id = p_game; end if;
end $$;

-- p_picks: ten numbers 0..3 (or -1 for no answer). Returns the player's score.
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
  select answers into k from public.trivia_secret where game_id = p_game;
  for i in 1..10 loop if p_picks[i] = k[i] then sc := sc + 1; end if; end loop;
  if uid = g.a then g.a_score := sc; g.a_ms := ms; else g.b_score := sc; g.b_ms := ms; end if;
  if g.a_score is not null and g.b_score is not null then
    if g.a_score > g.b_score then wn := g.a;
    elsif g.b_score > g.a_score then wn := g.b;
    elsif g.a_ms < g.b_ms then wn := g.a;
    elsif g.b_ms < g.a_ms then wn := g.b; end if;
    if wn is not null then
      rw := (select count(*) from public.trivia_games where winner = wn and rewarded and finished_at >= today) < 5
        and (select count(*) from public.trivia_games where winner = wn and rewarded and finished_at >= today and (a = wn and b = (case when wn = g.a then g.b else g.a end) or b = wn and a = (case when wn = g.a then g.b else g.a end))) < 2;
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
         + 25 * coalesce((select count(*) from public.trivia_games where winner = p_uid and rewarded), 0)::int;
end $$;

revoke all on function public.trivia_create(uuid, text, jsonb, int[]), public.trivia_decline(uuid), public.trivia_submit(uuid, int[], int) from public, anon;
grant execute on function public.trivia_create(uuid, text, jsonb, int[]), public.trivia_decline(uuid), public.trivia_submit(uuid, int[], int) to authenticated;
