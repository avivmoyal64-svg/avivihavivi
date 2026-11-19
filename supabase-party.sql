-- Party games: a room for 3 players and a live vote on the game. Games: Hot Seat Heist, Weigh-In Whisper, Odd Fighter Out, Pie in the Face Press Conference, Rubber Gloves and Dirty Corner.
-- Everything is decided on the server; each player only gets what they may see. The newer games live in supabase-party-x.sql. The room chat table and party_say still exist but the screen no longer shows a chat. Safe to re-run.
-- Fighter pool: see supabase-party-pool.sql (name + record, generated from the site's fighter list).
create table if not exists public.party_pool(name text primary key, wins int not null, losses int not null, draws int not null, wc text not null);
create table if not exists public.party_rooms (
  id uuid primary key default gen_random_uuid(),
  host uuid not null references auth.users(id) on delete cascade,
  status text not null default 'lobby',          -- lobby | voting | playing | done | closed
  game text,                                      -- heist | whisper
  closed_by uuid,
  vote_end bigint,                                -- ms epoch
  st jsonb not null default '{}'::jsonb,          -- public bits (vote result)
  notified boolean not null default false,
  created_at timestamptz not null default now(), touched timestamptz not null default now()
);
create table if not exists public.party_secret(room uuid primary key references public.party_rooms(id) on delete cascade, g jsonb not null default '{}'::jsonb);
create table if not exists public.party_members (
  room uuid not null references public.party_rooms(id) on delete cascade,
  uid uuid not null references auth.users(id) on delete cascade,
  state text not null default 'invited',          -- invited | joined | declined
  vote text,
  primary key (room, uid)
);
create table if not exists public.party_chat (
  id bigserial primary key,
  room uuid not null references public.party_rooms(id) on delete cascade,
  uid uuid not null, body text not null, created_at timestamptz not null default now()
);
alter table public.party_pool enable row level security;
alter table public.party_rooms enable row level security;
alter table public.party_secret enable row level security;
alter table public.party_members enable row level security;
alter table public.party_chat enable row level security;
revoke all on public.party_pool, public.party_rooms, public.party_secret, public.party_members, public.party_chat from anon, authenticated;
revoke all on sequence public.party_chat_id_seq from anon, authenticated;

create or replace function public.party_ms() returns bigint language sql as $$ select (extract(epoch from clock_timestamp()) * 1000)::bigint $$;
create or replace function public.party_val(p_name text, p_cat text) returns numeric language sql stable as $$
  select case p_cat when 'wins' then wins::numeric when 'fights' then (wins + losses + draws)::numeric
    when 'pct' then round(100.0 * wins / greatest(wins + losses + draws, 1), 1) else losses::numeric end from public.party_pool where name = p_name $$;

-- Weigh-In Whisper: start round r
create or replace function public.party_w_round(g jsonb, r int) returns jsonb language plpgsql as $$
declare ord jsonb := g->'order'; imp text := ord->>((r - 1) % 3); f text; n bigint := public.party_ms();
begin
  select name into f from public.party_pool where not ((g->'used') @> jsonb_build_array(name)) order by random() limit 1;
  if f is null then select name into f from public.party_pool order by random() limit 1; end if;
  return g || jsonb_build_object('round', r, 'phase', 'clue', 'ends', n + 32000, 'imp', imp, 'fighter', f, 'clues', '{}'::jsonb, 'votes', '{}'::jsonb,
    'caught', null, 'lg', null, 'lres', null, 'gain', '{}'::jsonb, 'used', (g->'used') || jsonb_build_array(f));
end $$;

-- Hot Seat Heist: start round r
create or replace function public.party_h_round(g jsonb, r int) returns jsonb language plpgsql as $$
declare cats text[] := array['wins','fights','pct','loss']; c text; n bigint := public.party_ms();
begin
  loop c := cats[1 + floor(random() * 4)::int]; exit when c is distinct from (g->>'cat'); end loop;
  return g || jsonb_build_object('round', r, 'phase', 'pick', 'ends', n + 17000, 'cat', c, 'choice', '{}'::jsonb, 'last', null);
end $$;

-- Move a room forward when time is up or everyone has acted. Caller holds the row lock.
create or replace function public.party_adv(p_room uuid) returns void language plpgsql security definer set search_path = public as $$
declare r record; gj jsonb; sc jsonb; n bigint := public.party_ms(); mem uuid[]; u uuid; i int; cnt int; best text; bestn int; tied text[]; w text;
  imp text; caught boolean; votes jsonb; k text; vals jsonb := '{}'::jsonb; base jsonb := '{}'::jsonb; gain jsonb := '{}'::jsonb; ch jsonb; cat text; hand jsonb; tgt text; thieves int; ranks jsonb;
  vv numeric; better int; nm text;
begin
  select * into r from public.party_rooms where id = p_room;
  if not found then return; end if;
  if r.status in ('done', 'closed') then return; end if;
  if r.status = 'lobby' and r.created_at < now() - interval '15 minutes' then update public.party_rooms set status = 'closed' where id = p_room; return; end if;
  if r.status in ('voting', 'playing') and r.touched < now() - interval '10 minutes' then update public.party_rooms set status = 'closed' where id = p_room; return; end if;
  select array_agg(uid order by uid) into mem from public.party_members where room = p_room and state = 'joined';

  if r.status = 'voting' then
    select count(*) into cnt from public.party_members where room = p_room and state = 'joined' and vote is not null;
    if cnt >= 3 or n >= coalesce(r.vote_end, 0) then
      with t as (select g2, count(m.vote) c from unnest(array['heist','whisper','oddout','pie','gloves','dirty']) g2 left join public.party_members m on m.room = p_room and m.vote = g2 group by g2)
      select array_agg(g2) into tied from t where c = (select max(c) from t);
      w := tied[1 + floor(random() * array_length(tied, 1))::int];
      if w = 'whisper' then
        gj := jsonb_build_object('game', 'whisper', 'phase', 'intro', 'ends', n + 4000, 'round', 0, 'order', (select jsonb_agg(x) from (select u2 as x from unnest(mem) u2 order by random()) q), 'used', '[]'::jsonb, 'score', jsonb_build_object(mem[1]::text, 0, mem[2]::text, 0, mem[3]::text, 0));
      elsif w = 'heist' then
        gj := jsonb_build_object('game', 'heist', 'phase', 'intro', 'ends', n + 4000, 'round', 0, 'cat', null, 'choice', '{}'::jsonb, 'last', null, 'score', jsonb_build_object(mem[1]::text, 0, mem[2]::text, 0, mem[3]::text, 0),
          'hand', (select jsonb_object_agg(mem[rn::int]::text, nm2) from (select name nm2, row_number() over (order by random()) rn from (select name from public.party_pool order by random() limit 3) p) h));
      else
        gj := public.party_x_start(w, mem);
      end if;
      insert into public.party_secret(room, g) values (p_room, gj) on conflict (room) do update set g = excluded.g;
      update public.party_rooms set status = 'playing', game = w, touched = now(), st = jsonb_build_object('picked', w, 'votes', (select coalesce(jsonb_object_agg(uid, vote), '{}'::jsonb) from public.party_members where room = p_room and vote is not null)) where id = p_room;
    end if;
    return;
  end if;
  if r.status <> 'playing' then return; end if;

  select s.g into gj from public.party_secret s where s.room = p_room;
  if gj is null then return; end if;
  loop
    exit when n < (gj->>'ends')::bigint and not (gj->>'phase' in ('clue','vote','pick','act') and public.party_all_done(gj, mem));
    if gj->>'game' in ('oddout','pie','gloves','dirty') then
      gj := public.party_x_step(gj, mem);
    elsif gj->>'game' = 'whisper' then
      if gj->>'phase' = 'intro' then gj := public.party_w_round(gj, 1);
      elsif gj->>'phase' = 'clue' then gj := gj || jsonb_build_object('phase', 'vote', 'ends', public.party_ms() + 50000);
      elsif gj->>'phase' = 'vote' then
        votes := gj->'votes'; imp := gj->>'imp'; cnt := 0;
        for u in select unnest(mem) loop if votes->>u::text = imp then cnt := cnt + 1; end if; end loop;
        caught := cnt >= 2; gain := '{}'::jsonb;
        if caught then
          for u in select unnest(mem) loop if u::text <> imp then gain := gain || jsonb_build_object(u::text, 2); end if; end loop;
          gj := gj || jsonb_build_object('caught', true, 'phase', 'last', 'ends', public.party_ms() + 25000, 'gain', gain);
        else
          gain := jsonb_build_object(imp, 3);
          gj := gj || jsonb_build_object('caught', false, 'phase', 'reveal', 'ends', public.party_ms() + 5000, 'gain', gain);
        end if;
        sc := gj->'score';
        for k in select jsonb_object_keys(gain) loop sc := jsonb_set(sc, array[k], to_jsonb(coalesce((sc->>k)::int, 0) + (gain->>k)::int)); end loop;
        gj := gj || jsonb_build_object('score', sc);
      elsif gj->>'phase' = 'last' then gj := gj || jsonb_build_object('phase', 'reveal', 'ends', public.party_ms() + 5000);
      elsif gj->>'phase' = 'reveal' then
        if (gj->>'round')::int >= 3 then gj := gj || jsonb_build_object('phase', 'over', 'ends', 9e15::bigint);
        else gj := public.party_w_round(gj, (gj->>'round')::int + 1); end if;
      else exit; end if;
    else
      if gj->>'phase' = 'intro' then gj := public.party_h_round(gj, 1);
      elsif gj->>'phase' = 'pick' then
        cat := gj->>'cat'; hand := gj->'hand'; ch := gj->'choice'; vals := '{}'::jsonb; base := '{}'::jsonb; gain := '{}'::jsonb;
        foreach u in array mem loop vals := vals || jsonb_build_object(u::text, public.party_val(hand->>u::text, cat)); end loop;
        foreach u in array mem loop
          better := 0; vv := (vals->>u::text)::numeric;
          foreach tgt in array array[mem[1]::text, mem[2]::text, mem[3]::text] loop
            if tgt <> u::text then
              if (cat = 'loss' and vv < (vals->>tgt)::numeric) or (cat <> 'loss' and vv > (vals->>tgt)::numeric) then better := better + 1; end if;
            end if;
          end loop;
          base := base || jsonb_build_object(u::text, 1 + better);
        end loop;
        foreach u in array mem loop
          if coalesce(ch->>u::text, 'S') = 'S' then gain := gain || jsonb_build_object(u::text, (base->>u::text)::int);
          else gain := gain || jsonb_build_object(u::text, 0); end if;
        end loop;
        foreach tgt in array array[mem[1]::text, mem[2]::text, mem[3]::text] loop
          if coalesce(ch->>tgt, 'S') = 'S' then
            thieves := 0;
            foreach u in array mem loop if ch->>u::text = tgt then thieves := thieves + 1; end if; end loop;
            if thieves > 0 then
              foreach u in array mem loop
                if ch->>u::text = tgt then gain := jsonb_set(gain, array[u::text], to_jsonb((gain->>u::text)::int + ((base->>tgt)::int / thieves))); end if;
              end loop;
              gain := jsonb_set(gain, array[tgt], '0'::jsonb);
            end if;
          end if;
        end loop;
        sc := gj->'score';
        foreach u in array mem loop sc := jsonb_set(sc, array[u::text], to_jsonb((sc->>u::text)::int + (gain->>u::text)::int)); end loop;
        foreach u in array mem loop if ch->>u::text is null then ch := ch || jsonb_build_object(u::text, 'S'); end if; end loop;
        gj := gj || jsonb_build_object('phase', 'reveal', 'ends', public.party_ms() + 5000, 'score', sc, 'last', jsonb_build_object('cat', cat, 'vals', vals, 'gain', gain, 'choice', ch, 'base', base));
      elsif gj->>'phase' = 'reveal' then
        if (gj->>'round')::int >= 5 then gj := gj || jsonb_build_object('phase', 'over', 'ends', 9e15::bigint);
        else gj := public.party_h_round(gj, (gj->>'round')::int + 1); end if;
      else exit; end if;
    end if;
    exit when gj->>'phase' = 'over';
  end loop;
  update public.party_secret set g = gj where room = p_room;
  if gj->>'phase' = 'over' then update public.party_rooms set status = 'done', touched = now() where id = p_room; end if;
end $$;

create or replace function public.party_all_done(g jsonb, mem uuid[]) returns boolean language plpgsql immutable as $$
declare u uuid; src jsonb;
begin
  if g->>'game' in ('oddout','pie','gloves','dirty') then src := case g->>'phase' when 'act' then g->'act' when 'vote' then g->'votes' else null end;
  elsif g->>'game' = 'whisper' then src := case g->>'phase' when 'clue' then g->'clues' when 'vote' then g->'votes' else null end;
  else src := case g->>'phase' when 'pick' then g->'choice' else null end; end if;
  if src is null then return false; end if;
  foreach u in array mem loop if src->>u::text is null then return false; end if; end loop;
  return true;
end $$;

-- invite two players
create or replace function public.party_create(p_b uuid, p_c uuid) returns uuid language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); rid uuid; today timestamptz := ((now() at time zone 'Asia/Jerusalem')::date)::timestamp at time zone 'Asia/Jerusalem';
begin
  if me is null then raise exception 'not logged in'; end if;
  if p_b is null or p_c is null or p_b = p_c or p_b = me or p_c = me then raise exception 'pick two other players'; end if;
  if (select count(*) from auth.users where id in (p_b, p_c)) <> 2 then raise exception 'pick two other players'; end if;
  if exists(select 1 from public.party_rooms r join public.party_members m on m.room = r.id and m.uid = me
            where r.status in ('lobby', 'voting', 'playing') and r.touched > now() - interval '10 minutes' and m.state in ('joined', 'invited')) then raise exception 'already in a party'; end if;
  if (select count(*) from public.party_rooms where host = me and created_at >= today) >= 10 then raise exception 'too many parties today'; end if;
  insert into public.party_rooms(host) values (me) returning id into rid;
  insert into public.party_members(room, uid, state) values (rid, me, 'joined'), (rid, p_b, 'invited'), (rid, p_c, 'invited');
  return rid;
end $$;

create or replace function public.party_accept(p_room uuid) returns void language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); r record; cnt int;
begin
  select * into r from public.party_rooms where id = p_room for update;
  if not found or me is null or not exists(select 1 from public.party_members where room = p_room and uid = auth.uid()) then raise exception 'no such party'; end if;
  perform public.party_adv(p_room); select * into r from public.party_rooms where id = p_room;
  if r.status <> 'lobby' then raise exception 'party is not open'; end if;
  if exists(select 1 from public.party_rooms x join public.party_members m on m.room = x.id and m.uid = me
            where x.id <> p_room and x.status in ('voting', 'playing') and x.touched > now() - interval '10 minutes' and m.state = 'joined') then raise exception 'already in a party'; end if;
  update public.party_members set state = 'joined' where room = p_room and uid = auth.uid() and state = 'invited';
  select count(*) into cnt from public.party_members where room = p_room and state = 'joined';
  if cnt >= 3 then update public.party_rooms set status = 'voting', vote_end = public.party_ms() + 20000, touched = now() where id = p_room; end if;
end $$;

create or replace function public.party_decline(p_room uuid) returns void language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); r record;
begin
  select * into r from public.party_rooms where id = p_room for update;
  if not found or me is null or not exists(select 1 from public.party_members where room = p_room and uid = auth.uid()) then raise exception 'no such party'; end if;
  if r.status in ('done', 'closed') then return; end if;
  update public.party_members set state = 'declined' where room = p_room and uid = auth.uid() and state = 'invited';
  update public.party_rooms set status = 'closed', closed_by = me, touched = now() where id = p_room;
end $$;

-- leaving (or cancelling) ends the party for everyone
create or replace function public.party_leave(p_room uuid) returns void language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); r record;
begin
  select * into r from public.party_rooms where id = p_room for update;
  if not found or me is null or not exists(select 1 from public.party_members where room = p_room and uid = auth.uid()) then return; end if;
  if r.status in ('lobby', 'voting', 'playing') then update public.party_rooms set status = 'closed', closed_by = me, touched = now() where id = p_room; end if;
end $$;

create or replace function public.party_vote(p_room uuid, p_game text) returns void language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); r record;
begin
  if p_game not in ('heist', 'whisper', 'oddout', 'pie', 'gloves', 'dirty') then raise exception 'bad game'; end if;
  select * into r from public.party_rooms where id = p_room for update;
  if not found or me is null or not exists(select 1 from public.party_members where room = p_room and uid = auth.uid() and state = 'joined') then raise exception 'no such party'; end if;
  if r.status <> 'voting' then raise exception 'voting is over'; end if;
  update public.party_members set vote = p_game where room = p_room and uid = auth.uid();
  update public.party_rooms set touched = now() where id = p_room;
  perform public.party_adv(p_room);
end $$;

create or replace function public.party_say(p_room uuid, p_body text) returns void language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); b text := btrim(regexp_replace(coalesce(p_body, ''), '[\r\n\t]+', ' ', 'g')); r record; gj jsonb;
begin
  if me is null or b = '' then return; end if;
  select * into r from public.party_rooms where id = p_room;
  if not found or not exists(select 1 from public.party_members where room = p_room and uid = auth.uid() and state = 'joined') then raise exception 'no such party'; end if;
  if r.status not in ('lobby', 'voting', 'playing', 'done') then raise exception 'party is closed'; end if;
  if r.status = 'playing' and r.game = 'whisper' then select s.g into gj from public.party_secret s where s.room = p_room; if gj->>'phase' = 'clue' then raise exception 'chat is locked'; end if; end if;
  if exists(select 1 from public.party_chat where room = p_room and uid = auth.uid() and created_at > now() - interval '1 second') then raise exception 'slow down'; end if;
  if (select count(*) from public.party_chat where room = p_room and uid = auth.uid() and created_at > now() - interval '1 minute') >= 20 then raise exception 'slow down'; end if;
  b := left(b, 200);
  b := regexp_replace(b, '(nigg\w*|fagg?\w*|retard\w*|cunt\w*|kike|chink|spic|tranny)', '***', 'gi');
  insert into public.party_chat(room, uid, body) values (p_room, me, b);
end $$;

-- game actions: clue (a = one word), accuse (a = player id), lastguess (a = fighter), choose (a = 'S' or a player id)
create or replace function public.party_act(p_room uuid, p_do text, p_a text) returns jsonb language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); r record; gj jsonb; mem uuid[]; ph text; w text; hit boolean := false; sc jsonb; nm text;
begin
  select * into r from public.party_rooms where id = p_room for update;
  if not found or me is null or not exists(select 1 from public.party_members where room = p_room and uid = auth.uid() and state = 'joined') then raise exception 'no such party'; end if;
  perform public.party_adv(p_room); select * into r from public.party_rooms where id = p_room;
  if r.status <> 'playing' then raise exception 'game is not running'; end if;
  select s.g into gj from public.party_secret s where s.room = p_room;
  select array_agg(m.uid order by m.uid) into mem from public.party_members m where room = p_room and state = 'joined';
  ph := gj->>'phase';
  if gj->>'game' in ('oddout','pie','gloves','dirty') then
    gj := public.party_x_act(gj, me, p_do, p_a, mem);
  elsif gj->>'game' = 'whisper' then
    if p_do = 'clue' and ph = 'clue' then
      w := lower(regexp_replace(coalesce(p_a, ''), '[^[:alpha:]]', '', 'g'));
      if length(w) < 2 or length(w) > 20 then raise exception 'one word, 2 to 20 letters'; end if;
      if jsonb_exists(gj->'clues', me::text) then raise exception 'already sent'; end if;
      if me::text <> gj->>'imp' and exists(select 1 from regexp_split_to_table(lower(gj->>'fighter'), '\s+') p where length(p) > 2 and w = regexp_replace(p, '[^[:alpha:]]', '', 'g')) then raise exception 'do not use the name'; end if;
      gj := jsonb_set(gj, '{clues}', (gj->'clues') || jsonb_build_object(me::text, w));
    elsif p_do = 'accuse' and ph = 'vote' then
      if p_a is null or p_a = me::text or not (p_a = any(select x::text from unnest(mem) x)) then raise exception 'pick another player'; end if;
      gj := jsonb_set(gj, '{votes}', (gj->'votes') || jsonb_build_object(me::text, p_a));
    elsif p_do = 'lastguess' and ph = 'last' then
      if me::text <> gj->>'imp' or gj->>'lg' is not null then raise exception 'not allowed'; end if;
      nm := lower(btrim(coalesce(p_a, ''))); hit := (nm = lower(gj->>'fighter'));
      gj := gj || jsonb_build_object('lg', p_a, 'lres', hit, 'phase', 'reveal', 'ends', public.party_ms() + 5000);
      if hit then sc := gj->'score'; sc := jsonb_set(sc, array[me::text], to_jsonb((sc->>(me::text))::int + 1)); gj := gj || jsonb_build_object('score', sc, 'gain', jsonb_set(gj->'gain', array[me::text], '1')); end if;
    else raise exception 'not now'; end if;
  else
    if p_do = 'choose' and ph = 'pick' then
      if jsonb_exists(gj->'choice', me::text) then raise exception 'already chosen'; end if;
      if p_a <> 'S' and (p_a = me::text or not (p_a = any(select x::text from unnest(mem) x))) then raise exception 'pick another player'; end if;
      gj := jsonb_set(gj, '{choice}', (gj->'choice') || jsonb_build_object(me::text, p_a));
    else raise exception 'not now'; end if;
  end if;
  update public.party_secret set g = gj where room = p_room;
  update public.party_rooms set touched = now() where id = p_room;
  perform public.party_adv(p_room);
  return jsonb_build_object('ok', true, 'hit', hit);
end $$;

create or replace function public.party_view(p_room uuid, p_since bigint default 0) returns jsonb language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); r record; gj jsonb; mems jsonb; chat jsonb; ph text; imp boolean; show text; chat_ok boolean := true; gv jsonb := null; memarr uuid[];
begin
  select * into r from public.party_rooms where id = p_room for update;
  if not found or me is null or not exists(select 1 from public.party_members where room = p_room and uid = auth.uid()) then raise exception 'no such party'; end if;
  perform public.party_adv(p_room); select * into r from public.party_rooms where id = p_room;
  select coalesce(jsonb_agg(jsonb_build_object('uid', uid_, 'state', state, 'vote', vote) order by uid_ = r.host desc, uid_), '[]'::jsonb) into mems
    from (select m.uid uid_, m.state, m.vote from public.party_members m where m.room = p_room) q;
  select coalesce(jsonb_agg(jsonb_build_object('i', id, 'u', c.uid, 'b', body) order by id), '[]'::jsonb) into chat
    from (select * from public.party_chat where room = p_room and id > p_since order by id desc limit 60) c;
  if r.status in ('playing', 'done') then
    select s.g into gj from public.party_secret s where s.room = p_room;
    if gj is not null then
      ph := gj->>'phase';
      select array_agg(m.uid order by m.uid) into memarr from public.party_members m where m.room = p_room and m.state = 'joined';
      if gj->>'game' in ('oddout','pie','gloves','dirty') then
        gv := public.party_x_view(gj, me, memarr);
      elsif gj->>'game' = 'whisper' then
        imp := (gj->>'imp' = me::text); show := case when ph = 'intro' then null when imp and ph not in ('reveal', 'over') then null else gj->>'fighter' end;
        chat_ok := ph <> 'clue';
        gv := jsonb_build_object('game', 'whisper', 'phase', ph, 'ends', (gj->>'ends')::bigint, 'round', (gj->>'round')::int, 'order', gj->'order', 'score', gj->'score',
          'imp', case when ph in ('reveal', 'over') or imp then gj->>'imp' else null end, 'role', case when ph = 'intro' then null when imp then 'imp' else 'ins' end,
          'fighter', show, 'clued', (select coalesce(jsonb_agg(k), '[]'::jsonb) from jsonb_object_keys(gj->'clues') k),
          'clues', case when ph = 'clue' then jsonb_build_object(me::text, gj->'clues'->(me::text)) else gj->'clues' end,
          'voted', (select coalesce(jsonb_agg(k), '[]'::jsonb) from jsonb_object_keys(gj->'votes') k),
          'myvote', gj->'votes'->(me::text),
          'votes', case when ph in ('reveal', 'over') then gj->'votes' else null end,
          'caught', case when ph in ('reveal', 'over') then gj->'caught' else null end,
          'lg', case when ph in ('reveal', 'over') or imp then gj->'lg' else null end, 'lres', gj->'lres',
          'gain', case when ph in ('reveal', 'over') then gj->'gain' else null end, 'caught_now', case when ph = 'last' then true else null end);
      else
        gv := jsonb_build_object('game', 'heist', 'phase', ph, 'ends', (gj->>'ends')::bigint, 'round', (gj->>'round')::int, 'score', gj->'score', 'cat', gj->>'cat',
          'mine', gj->'hand'->(me::text),
          'myval', case when ph in ('pick', 'reveal', 'over') and gj->>'cat' is not null then public.party_val(gj->'hand'->>(me::text), gj->>'cat') else null end,
          'chosen', (select coalesce(jsonb_agg(k), '[]'::jsonb) from jsonb_object_keys(gj->'choice') k),
          'mychoice', gj->'choice'->(me::text), 'last', gj->'last',
          'hand', case when ph in ('reveal', 'over') then gj->'hand' else null end);
      end if;
    end if;
  end if;
  return jsonb_build_object('now', public.party_ms(), 'id', r.id, 'host', r.host, 'status', r.status, 'closed_by', r.closed_by, 'game', r.game, 'vote_end', r.vote_end,
    'st', r.st, 'members', mems, 'chat', chat, 'chat_ok', chat_ok, 'g', gv);
end $$;

-- my open parties (invites and the one I am in)
create or replace function public.party_mine() returns jsonb language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then return '[]'::jsonb; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'host', r.host, 'status', r.status, 'me', m.state, 'created', extract(epoch from r.created_at) * 1000, 'touched', extract(epoch from r.touched) * 1000) order by r.created_at desc)
    from public.party_rooms r join public.party_members m on m.room = r.id and m.uid = me
    where r.created_at > now() - interval '1 day' and r.status in ('lobby', 'voting', 'playing') and r.touched > now() - interval '10 minutes'
      and (r.status <> 'lobby' or r.created_at > now() - interval '15 minutes') and m.state in ('invited', 'joined')), '[]'::jsonb);
end $$;

revoke all on function public.party_create(uuid, uuid), public.party_accept(uuid), public.party_decline(uuid), public.party_leave(uuid), public.party_vote(uuid, text), public.party_say(uuid, text),
  public.party_act(uuid, text, text), public.party_view(uuid, bigint), public.party_mine(), public.party_adv(uuid) from public, anon, authenticated;
grant execute on function public.party_create(uuid, uuid), public.party_accept(uuid), public.party_decline(uuid), public.party_leave(uuid), public.party_vote(uuid, text), public.party_say(uuid, text),
  public.party_act(uuid, text, text), public.party_view(uuid, bigint), public.party_mine() to authenticated;
