-- Guess the fighter 1v1: each player picks the mystery fighter the OTHER one must guess.
-- Clues are opened one at a time by the server, so the fighter's name and the later clues stay hidden. Safe to re-run.
create table if not exists public.guess_games (
  id uuid primary key default gen_random_uuid(),
  a uuid not null references auth.users(id) on delete cascade,
  b uuid not null references auth.users(id) on delete cascade,
  status text not null default 'invited',     -- invited | active | done | declined | cancelled
  opened_a int not null default 1,            -- clues opened by a
  opened_b int not null default 1,
  res_a text, res_b text,                     -- null while playing, then 'solved' or 'failed'
  pts_a int not null default 0, pts_b int not null default 0,
  winner uuid, draw boolean not null default false,
  created_at timestamptz not null default now(), finished_at timestamptz
);
create table if not exists public.guess_secret (
  game_id uuid primary key references public.guess_games(id) on delete cascade,
  name_a text, clues_a jsonb,                 -- the fighter a must guess (picked by b) and its 10 clues
  name_b text, clues_b jsonb                  -- the fighter b must guess (picked by a)
);
alter table public.guess_games enable row level security;
alter table public.guess_secret enable row level security;
drop policy if exists "guess read own" on public.guess_games;
create policy "guess read own" on public.guess_games for select to authenticated using (a = auth.uid() or b = auth.uid());
revoke all on public.guess_games, public.guess_secret from anon, authenticated;
grant select on public.guess_games to authenticated;
do $$ begin alter publication supabase_realtime add table public.guess_games; exception when others then null; end $$;

drop function if exists public.guess_create(uuid, text, jsonb);
create or replace function public.guess_create(p_to uuid, p_name text, p_clues jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); gid uuid; today timestamptz := ((now() at time zone 'Asia/Jerusalem')::date)::timestamp at time zone 'Asia/Jerusalem';
begin
  if uid is null then raise exception 'not logged in'; end if;
  if p_to is null or p_to = uid or not exists(select 1 from auth.users where id = p_to) then raise exception 'pick another player'; end if;
  if coalesce(length(p_name),0) not between 2 and 60 then raise exception 'bad fighter'; end if;
  if jsonb_typeof(p_clues) <> 'array' or jsonb_array_length(p_clues) <> 10 or exists(select 1 from jsonb_array_elements(p_clues) e where jsonb_typeof(e) <> 'string' or length(e #>> '{}') > 200) then raise exception 'bad clues'; end if;
  if exists(select 1 from public.guess_games where status in ('invited','active') and ((a = uid and b = p_to) or (a = p_to and b = uid))) then raise exception 'a game with this player is already open'; end if;
  if exists(select 1 from public.guess_games where a = uid and status = 'invited' and created_at > now() - interval '10 seconds') then raise exception 'wait a few seconds before sending another invite'; end if;
  if (select count(*) from public.guess_games where a = uid and created_at >= today) >= 8 then raise exception 'too many challenges today'; end if;
  insert into public.guess_games(a, b) values (uid, p_to) returning id into gid;
  insert into public.guess_secret(game_id, name_b, clues_b) values (gid, p_name, p_clues);
  return gid;
end $$;

-- b accepts and, in the same step, picks the fighter that a must guess
drop function if exists public.guess_accept(uuid, text, jsonb);
create or replace function public.guess_accept(p_game uuid, p_name text, p_clues jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); g record;
begin
  select * into g from public.guess_games where id = p_game for update;
  if not found or uid is null or uid <> g.b then raise exception 'no such game'; end if;
  if g.status <> 'invited' then raise exception 'game is not open'; end if;
  if coalesce(length(p_name),0) not between 2 and 60 then raise exception 'bad fighter'; end if;
  if jsonb_typeof(p_clues) <> 'array' or jsonb_array_length(p_clues) <> 10 or exists(select 1 from jsonb_array_elements(p_clues) e where jsonb_typeof(e) <> 'string' or length(e #>> '{}') > 200) then raise exception 'bad clues'; end if;
  update public.guess_secret set name_a = p_name, clues_a = p_clues where game_id = p_game;
  update public.guess_games set status = 'active' where id = p_game;
end $$;

drop function if exists public.guess_decline(uuid);
create or replace function public.guess_decline(p_game uuid) returns void
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); g record;
begin
  select * into g from public.guess_games where id = p_game for update;
  if not found or uid is null or (uid <> g.a and uid <> g.b) then raise exception 'no such game'; end if;
  if g.status = 'invited' then update public.guess_games set status = case when uid = g.a then 'cancelled' else 'declined' end, finished_at = now() where id = p_game;
  elsif g.status = 'active' and g.res_a is null and g.res_b is null and g.opened_a = 1 and g.opened_b = 1 then update public.guess_games set status = 'cancelled', finished_at = now() where id = p_game;
  else raise exception 'game already started'; end if;
end $$;

-- What the caller may see: only the clues they have opened, and the answer once they are done.
drop function if exists public.guess_view(uuid);
create or replace function public.guess_view(p_game uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); g record; s record; me_a boolean; op int; rs text; cl jsonb; nm text; orr text; opts int;
begin
  select * into g from public.guess_games where id = p_game;
  if not found or uid is null or (uid <> g.a and uid <> g.b) then raise exception 'no such game'; end if;
  select * into s from public.guess_secret where game_id = p_game;
  me_a := (uid = g.a);
  op := case when me_a then g.opened_a else g.opened_b end;
  rs := case when me_a then g.res_a else g.res_b end;
  cl := case when me_a then s.clues_a else s.clues_b end;
  nm := case when me_a then s.name_a else s.name_b end;
  orr := case when me_a then g.res_b else g.res_a end;
  if g.status <> 'active' and g.status <> 'done' then return jsonb_build_object('status', g.status); end if;
  return jsonb_build_object('status', g.status, 'opened', op, 'res', rs, 'opp_res', orr,
    'clues', (select coalesce(jsonb_agg(e.v order by e.i), '[]'::jsonb) from jsonb_array_elements(cl) with ordinality e(v, i) where e.i <= op),
    'answer', case when rs is not null then nm else null end,
    'pts', case when me_a then g.pts_a else g.pts_b end, 'opp_pts', case when me_a then g.pts_b else g.pts_a end);
end $$;

drop function if exists public.guess_step(uuid, text, text);
-- p_do: 'next' opens the next clue, 'try' checks a guess, 'giveup' ends the round
create or replace function public.guess_step(p_game uuid, p_do text, p_name text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); g record; s record; me_a boolean; op int; rs text; nm text; hit boolean := false; pts int := 0; fin boolean := false;
begin
  select * into g from public.guess_games where id = p_game for update;
  if not found or uid is null or (uid <> g.a and uid <> g.b) then raise exception 'no such game'; end if;
  if g.status <> 'active' then raise exception 'game is not active'; end if;
  select * into s from public.guess_secret where game_id = p_game;
  me_a := (uid = g.a);
  op := case when me_a then g.opened_a else g.opened_b end;
  rs := case when me_a then g.res_a else g.res_b end;
  nm := case when me_a then s.name_a else s.name_b end;
  if rs is not null then raise exception 'you already finished this round'; end if;
  if p_do = 'next' then
    if op < 10 then op := op + 1; end if;
  elsif p_do = 'try' then
    if lower(btrim(coalesce(p_name,''))) = lower(btrim(nm)) then hit := true; rs := 'solved'; pts := 11 - op;
    elsif op >= 10 then rs := 'failed';
    else op := op + 1; end if;
  elsif p_do = 'giveup' then rs := 'failed';
  else raise exception 'bad action'; end if;
  if me_a then update public.guess_games set opened_a = op, res_a = rs, pts_a = pts where id = p_game;
  else update public.guess_games set opened_b = op, res_b = rs, pts_b = pts where id = p_game; end if;
  select * into g from public.guess_games where id = p_game;
  if g.res_a is not null and g.res_b is not null then
    update public.guess_games set status = 'done', finished_at = now(),
      winner = case when pts_a > pts_b then a when pts_b > pts_a then b else null end,
      draw = (pts_a = pts_b) where id = p_game;
  end if;
  return jsonb_build_object('hit', hit, 'opened', op, 'res', rs);
end $$;

revoke all on function public.guess_create(uuid, text, jsonb), public.guess_accept(uuid, text, jsonb), public.guess_decline(uuid), public.guess_view(uuid), public.guess_step(uuid, text, text) from public, anon;
grant execute on function public.guess_create(uuid, text, jsonb), public.guess_accept(uuid, text, jsonb), public.guess_decline(uuid), public.guess_view(uuid), public.guess_step(uuid, text, text) to authenticated;
