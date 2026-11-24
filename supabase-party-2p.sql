-- Party games for 2 or 3 players, and fewer round trips (less lag).
-- Run AFTER supabase-party.sql, supabase-party-pool.sql, supabase-party-x.sql and supabase-party-x2.sql.
--  * party_create(p_b, p_c): p_c may be null for a 2-player party.
--  * A party starts when everyone invited has joined. Voting ends early once every player voted.
--  * With 2 players only Heist, Odd Fighter Out, Pie and Rubber Gloves can be played
--    (Whisper and Dirty Corner need someone to find, so they need 3).
--  * party_act now returns the fresh view, so the client needs one request per tap, not two.
--  * party_view no longer queues behind other players' polls (skip locked).
--  * bt_pick_v / fm_pick_v / who_guess_v: the pick plus the fresh view in one request.

create or replace function public.party_games_for(n int) returns text[] language sql immutable as $$
  select case when n >= 3 then array['heist','whisper','oddout','pie','gloves','dirty'] else array['heist','oddout','pie','gloves'] end $$;

create or replace function public.party_zero(mem uuid[]) returns jsonb language sql immutable as $$
  select coalesce(jsonb_object_agg(u::text, 0), '{}'::jsonb) from unnest(mem) u $$;

create or replace function public.party_gj(ids text[], gain int[]) returns jsonb language sql immutable as $$
  select coalesce(jsonb_object_agg(ids[i], coalesce(gain[i], 0)), '{}'::jsonb) from generate_series(1, coalesce(array_length(ids, 1), 0)) i $$;

create or replace function public.party_create(p_b uuid, p_c uuid)
 returns uuid language plpgsql security definer set search_path to 'public' as $function$
declare me uuid := auth.uid(); rid uuid; today timestamptz := ((now() at time zone 'Asia/Jerusalem')::date)::timestamp at time zone 'Asia/Jerusalem'; want int;
begin
  if me is null then raise exception 'not logged in'; end if;
  if p_b is null or p_b = me or p_c = me or p_b = p_c then raise exception 'pick one or two other players'; end if;
  want := case when p_c is null then 1 else 2 end;
  if (select count(*) from auth.users where id in (p_b, p_c)) <> want then raise exception 'pick one or two other players'; end if;
  if exists(select 1 from public.party_rooms r join public.party_members m on m.room = r.id and m.uid = me
            where r.status in ('lobby', 'voting', 'playing') and r.touched > now() - interval '10 minutes' and m.state in ('joined', 'invited')) then raise exception 'already in a party'; end if;
  if (select count(*) from public.party_rooms where host = me and created_at >= today) >= 10 then raise exception 'too many parties today'; end if;
  insert into public.party_rooms(host) values (me) returning id into rid;
  insert into public.party_members(room, uid, state) values (rid, me, 'joined'), (rid, p_b, 'invited');
  if p_c is not null then insert into public.party_members(room, uid, state) values (rid, p_c, 'invited'); end if;
  return rid;
end $function$;

create or replace function public.party_accept(p_room uuid)
 returns void language plpgsql security definer set search_path to 'public' as $function$
declare me uuid := auth.uid(); r record; cnt int; tot int;
begin
  select * into r from public.party_rooms where id = p_room for update;
  if not found or me is null or not exists(select 1 from public.party_members where room = p_room and uid = auth.uid()) then raise exception 'no such party'; end if;
  perform public.party_adv(p_room); select * into r from public.party_rooms where id = p_room;
  if r.status <> 'lobby' then raise exception 'party is not open'; end if;
  if exists(select 1 from public.party_rooms x join public.party_members m on m.room = x.id and m.uid = me
            where x.id <> p_room and x.status in ('voting', 'playing') and x.touched > now() - interval '10 minutes' and m.state = 'joined') then raise exception 'already in a party'; end if;
  update public.party_members set state = 'joined' where room = p_room and uid = auth.uid() and state = 'invited';
  select count(*) filter (where state = 'joined'), count(*) into cnt, tot from public.party_members where room = p_room;
  if cnt >= tot and cnt >= 2 then update public.party_rooms set status = 'voting', vote_end = public.party_ms() + 20000, touched = now() where id = p_room; end if;
end $function$;

create or replace function public.party_vote(p_room uuid, p_game text)
 returns void language plpgsql security definer set search_path to 'public' as $function$
declare me uuid := auth.uid(); r record; n int;
begin
  if p_game not in ('heist', 'whisper', 'oddout', 'pie', 'gloves', 'dirty') then raise exception 'bad game'; end if;
  select * into r from public.party_rooms where id = p_room for update;
  if not found or me is null or not exists(select 1 from public.party_members where room = p_room and uid = auth.uid() and state = 'joined') then raise exception 'no such party'; end if;
  if r.status <> 'voting' then raise exception 'voting is over'; end if;
  select count(*) into n from public.party_members where room = p_room and state = 'joined';
  if not (p_game = any(public.party_games_for(n))) then raise exception 'needs 3 players'; end if;
  update public.party_members set vote = p_game where room = p_room and uid = auth.uid();
  update public.party_rooms set touched = now() where id = p_room;
  perform public.party_adv(p_room);
end $function$;

create or replace function public.party_w_round(g jsonb, r integer)
 returns jsonb language plpgsql as $function$
declare ord jsonb := g->'order'; imp text := ord->>((r - 1) % greatest(jsonb_array_length(ord), 1)); f text; n bigint := public.party_ms();
begin
  select name into f from public.party_pool where not ((g->'used') @> jsonb_build_array(name)) order by random() limit 1;
  if f is null then select name into f from public.party_pool order by random() limit 1; end if;
  return g || jsonb_build_object('round', r, 'phase', 'clue', 'ends', n + 32000, 'imp', imp, 'fighter', f, 'clues', '{}'::jsonb, 'votes', '{}'::jsonb,
    'caught', null, 'lg', null, 'lres', null, 'gain', '{}'::jsonb, 'used', (g->'used') || jsonb_build_array(f));
end $function$;

create or replace function public.party_adv0(p_room uuid)
 returns void language plpgsql security definer set search_path to 'public' as $function$
declare r record; gj jsonb; sc jsonb; n bigint := public.party_ms(); mem uuid[]; ids text[]; np int; u uuid; cnt int; tied text[]; w text; allowed text[];
  imp text; caught boolean; votes jsonb; k text; vals jsonb := '{}'::jsonb; base jsonb := '{}'::jsonb; gain jsonb := '{}'::jsonb; ch jsonb; cat text; hand jsonb; tgt text; thieves int;
  vv numeric; better int;
begin
  select * into r from public.party_rooms where id = p_room;
  if not found then return; end if;
  if r.status in ('done', 'closed') then return; end if;
  if r.status = 'lobby' and r.created_at < now() - interval '15 minutes' then update public.party_rooms set status = 'closed' where id = p_room; return; end if;
  if r.status in ('voting', 'playing') and r.touched < now() - interval '10 minutes' then update public.party_rooms set status = 'closed' where id = p_room; return; end if;
  select array_agg(uid order by uid) into mem from public.party_members where room = p_room and state = 'joined';
  np := coalesce(array_length(mem, 1), 0); ids := array(select x::text from unnest(mem) x);

  if r.status = 'voting' then
    select count(*) into cnt from public.party_members where room = p_room and state = 'joined' and vote is not null;
    if cnt >= np or n >= coalesce(r.vote_end, 0) then
      allowed := public.party_games_for(np);
      with t as (select g2, count(m.vote) c from unnest(allowed) g2 left join public.party_members m on m.room = p_room and m.state = 'joined' and m.vote = g2 group by g2)
      select array_agg(g2) into tied from t where c = (select max(c) from t);
      w := tied[1 + floor(random() * array_length(tied, 1))::int];
      if w = 'whisper' then
        gj := jsonb_build_object('game', 'whisper', 'phase', 'intro', 'ends', n + 4000, 'round', 0, 'order', (select jsonb_agg(x) from (select u2 as x from unnest(mem) u2 order by random()) q), 'used', '[]'::jsonb, 'score', public.party_zero(mem));
      elsif w = 'heist' then
        gj := jsonb_build_object('game', 'heist', 'phase', 'intro', 'ends', n + 4000, 'round', 0, 'cat', null, 'choice', '{}'::jsonb, 'last', null, 'score', public.party_zero(mem),
          'hand', (select jsonb_object_agg(mem[rn::int]::text, nm2) from (select name nm2, row_number() over (order by random()) rn from (select name from public.party_pool order by random() limit np) p) h));
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
        caught := cnt >= np - 1; gain := '{}'::jsonb;
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
          foreach tgt in array ids loop
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
        foreach tgt in array ids loop
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
end $function$;

/* ---------- party_x (Odd Fighter Out, Pie, Rubber Gloves, Dirty Corner) for any player count ---------- */
create or replace function public.party_x_add(sc jsonb, ids text[], gain integer[])
 returns jsonb language plpgsql immutable as $function$
declare i int;
begin
  for i in 1..coalesce(array_length(ids, 1), 0) loop sc := jsonb_set(sc, array[ids[i]], to_jsonb(coalesce((sc->>ids[i])::int, 0) + coalesce(gain[i], 0))); end loop;
  return sc;
end $function$;

create or replace function public.party_x_start(p_game text, mem uuid[])
 returns jsonb language plpgsql as $function$
declare n bigint := public.party_ms(); sc jsonb := public.party_zero(mem); gj jsonb; np int := coalesce(array_length(mem, 1), 1);
begin
  gj := jsonb_build_object('game', p_game, 'phase', 'intro', 'ends', n + 4500, 'round', 0, 'score', sc, 'act', '{}'::jsonb, 'tm', '{}'::jsonb, 'used', '[]'::jsonb, 'splat', sc);
  if p_game = 'dirty' then
    gj := gj || jsonb_build_object('sab', mem[1 + floor(random() * np)::int]::text, 'health', 70, 'votes', '{}'::jsonb, 'peek', '{}'::jsonb);
  end if;
  return gj;
end $function$;

create or replace function public.party_x_res_odd(gj jsonb, mem uuid[])
 returns jsonb language plpgsql as $function$
declare ids text[] := array(select x::text from unnest(mem) x); np int := coalesce(array_length(mem, 1), 0); act jsonb := gj->'act'; tm jsonb := gj->'tm'; odd int := (gj->>'odd')::int - 1;
  gain int[] := array_fill(0, array[greatest(np, 1)]); i int; best bigint := null; bi int := 0; t bigint;
begin
  for i in 1..np loop
    if act->>ids[i] = odd::text then
      gain[i] := 2; t := (tm->>ids[i])::bigint;
      if best is null or t < best then best := t; bi := i; end if;
    end if;
  end loop;
  if bi > 0 then gain[bi] := gain[bi] + 1; end if;
  return gj || jsonb_build_object('phase', 'show', 'ends', public.party_ms() + 3500, 'score', public.party_x_add(gj->'score', ids, gain),
    'res', jsonb_build_object('odd', odd, 'rules', gj->'rules', 'picks', act, 'gain', public.party_gj(ids, gain), 'fast', case when bi > 0 then ids[bi] else null end));
end $function$;

create or replace function public.party_x_res_pie(gj jsonb, mem uuid[])
 returns jsonb language plpgsql as $function$
declare ids text[] := array(select x::text from unnest(mem) x); np int := coalesce(array_length(mem, 1), 0); act jsonb := gj->'act'; a text[]; i int; t int; th int; h int;
  gain int[] := array_fill(0, array[greatest(np, 1)]); sp jsonb := gj->'splat'; thr jsonb := '[]'::jsonb; duck boolean[] := array_fill(false, array[greatest(np, 1)]);
begin
  a := array_fill(null::text, array[greatest(np, 1)]);
  for i in 1..np loop a[i] := act->>ids[i]; duck[i] := coalesce(a[i] = 'D', false); end loop;
  for i in 1..np loop
    if a[i] is not null and a[i] <> 'D' then
      t := array_position(ids, a[i]); h := 0;
      if not duck[t] then h := t;
      elsif np = 3 then th := 6 - i - t; if not duck[th] then h := th; end if; end if;
      if h > 0 then
        gain[i] := gain[i] + 1; gain[h] := gain[h] - 1;
        sp := jsonb_set(sp, array[ids[h]], to_jsonb(coalesce((sp->>ids[h])::int, 0) + 1));
      end if;
      thr := thr || jsonb_build_array(jsonb_build_object('f', i - 1, 't', t - 1, 'h', h - 1));
    end if;
  end loop;
  return gj || jsonb_build_object('phase', 'show', 'ends', public.party_ms() + 7500, 'score', public.party_x_add(gj->'score', ids, gain), 'splat', sp,
    'res', jsonb_build_object('thr', thr, 'duck', to_jsonb(duck), 'gain', public.party_gj(ids, gain)));
end $function$;

create or replace function public.party_x_live(gj jsonb, mem uuid[])
 returns jsonb language plpgsql as $function$
declare g text := gj->>'game'; n bigint := public.party_ms(); bx jsonb := '[]'::jsonb; i int; a numeric; np int := greatest(coalesce(array_length(mem, 1), 3), 1);
begin
  gj := gj || jsonb_build_object('phase', 'live', 'ends', 9e15::bigint, 'round', 1, 'ev', '[]'::jsonb, 'duck', '{}'::jsonb, 'inv', '{}'::jsonb, 'cd', '{}'::jsonb, 'seq', 0, 'tend', n + 180000, 'res', null);
  if g = 'gloves' then
    for i in 0..np - 1 loop a := radians(-90 + i * 360.0 / np); bx := bx || jsonb_build_array(jsonb_build_array(round(55 * cos(a), 2), round(55 * sin(a), 2), 0, 0, 1, 0, 0, 0)); end loop;
    gj := gj || jsonb_build_object('bx', bx, 't0', n);
  end if;
  return gj;
end $function$;

create or replace function public.party_x_act(gj jsonb, me uuid, p_do text, p_a text, mem uuid[])
 returns jsonb language plpgsql as $function$
declare g text := gj->>'game'; ph text := gj->>'phase'; ok boolean := false; ids text[] := array(select x::text from unnest(mem) x); np int := coalesce(array_length(mem, 1), 0);
  k int := coalesce(array_position(ids, me::text), 1) - 1; n bigint := public.party_ms(); t int; a numeric; pw numeric;
begin
  if ph = 'live' then
    if coalesce((gj->'cd'->>(k::text))::bigint, 0) > n then raise exception 'wait'; end if;
    if g = 'pie' then
      if coalesce((gj->'inv'->>(k::text))::bigint, 0) > n then raise exception 'stunned'; end if;
      if p_do = 'throw' then
        t := p_a::int; if t < 0 or t >= np or t = k then raise exception 'bad move'; end if;
        gj := jsonb_set(gj, '{seq}', to_jsonb((gj->>'seq')::int + 1));
        gj := jsonb_set(gj, '{ev}', (gj->'ev') || jsonb_build_array(jsonb_build_object('i', (gj->>'seq')::int, 'f', k, 't', t, 'a', n, 'l', n + 450, 'r', -1)));
        gj := jsonb_set(gj, '{cd}', (gj->'cd') || jsonb_build_object(k::text, n + 500));
      elsif p_do = 'duck' then
        gj := jsonb_set(gj, '{duck}', (gj->'duck') || jsonb_build_object(k::text, jsonb_build_array(n, n + 400)));
        gj := jsonb_set(gj, '{cd}', (gj->'cd') || jsonb_build_object(k::text, n + 700));
      else raise exception 'not now'; end if;
    else
      if p_do <> 'fling' or p_a !~ '^-?[0-9]+(\.[0-9]+)?,[0-9]+(\.[0-9]+)?$' then raise exception 'bad move'; end if;
      if (gj->'bx'->k->>4)::int <> 1 then raise exception 'wait'; end if;
      a := split_part(p_a, ',', 1)::numeric; pw := greatest(0, least(1, split_part(p_a, ',', 2)::numeric));
      gj := jsonb_set(gj, array['bx', k::text, '2'], to_jsonb(round((gj->'bx'->k->>2)::numeric + cos(a) * pw * 3.4, 3)));
      gj := jsonb_set(gj, array['bx', k::text, '3'], to_jsonb(round((gj->'bx'->k->>3)::numeric + sin(a) * pw * 3.4, 3)));
      gj := jsonb_set(gj, '{cd}', (gj->'cd') || jsonb_build_object(k::text, n + 2000));
    end if;
    return gj;
  end if;
  if ph = 'act' and p_do = 'pick' then
    if jsonb_exists(gj->'act', me::text) then raise exception 'already chosen'; end if;
    if g = 'oddout' then ok := p_a in ('0','1','2');
    elsif g = 'pie' then ok := p_a = 'D' or (p_a <> me::text and p_a = any(ids));
    elsif g = 'gloves' then ok := p_a ~ '^-?[0-9]+(\.[0-9]+)?,[0-9]+(\.[0-9]+)?$';
    else ok := p_a in ('jelly','ice','water'); end if;
    if not coalesce(ok, false) then raise exception 'bad move'; end if;
    gj := jsonb_set(gj, '{act}', (gj->'act') || jsonb_build_object(me::text, p_a));
    if g = 'oddout' then gj := jsonb_set(gj, '{tm}', (gj->'tm') || jsonb_build_object(me::text, public.party_ms())); end if;
  elsif ph = 'vote' and g = 'dirty' and p_do = 'accuse' then
    if jsonb_exists(gj->'votes', me::text) then raise exception 'already chosen'; end if;
    if p_a is null or p_a = me::text or not (p_a = any(ids)) then raise exception 'pick another player'; end if;
    gj := jsonb_set(gj, '{votes}', (gj->'votes') || jsonb_build_object(me::text, p_a));
  else raise exception 'not now'; end if;
  return gj;
end $function$;

create or replace function public.party_x_tick(gj jsonb, mem uuid[], n bigint)
 returns jsonb language plpgsql as $function$
declare g text := gj->>'game'; ids text[] := array(select x::text from unnest(mem) x); np int := coalesce(array_length(mem, 1), 0); sc jsonb := gj->'score'; spl jsonb := gj->'splat'; inv jsonb := coalesce(gj->'inv', '{}'::jsonb);
  dk jsonb := coalesce(gj->'duck', '{}'::jsonb); ev jsonb := '[]'::jsonb; e jsonb; f int; t int; l bigint; hit boolean; won int := -1; d jsonb; w int := 1; best int := -1; i int; j int; s int; ts bigint; steps int; t0 bigint;
  x numeric[]; y numeric[]; vx numeric[]; vy numeric[]; al boolean[]; rs bigint[]; lt int[]; ltm bigint[];
  rr constant numeric := 11; ring constant numeric := 100; a numeric; dx numeric; dy numeric; dd numeric; nx numeric; ny numeric; rv numeric; imp numeric; ov numeric; bx jsonb := '[]'::jsonb;
begin
  if gj->>'phase' <> 'live' or np = 0 then return gj; end if;
  if g = 'pie' then
    for e in select value from jsonb_array_elements(gj->'ev') order by (value->>'l')::bigint loop
      f := (e->>'f')::int; t := (e->>'t')::int; l := (e->>'l')::bigint;
      if (e->>'r')::int = -1 and l <= n then
        d := dk->(t::text);
        hit := not (coalesce((inv->>(t::text))::bigint, 0) > l) and not (d is not null and (d->>0)::bigint <= l and (d->>1)::bigint >= l);
        if hit then
          sc := jsonb_set(sc, array[ids[f + 1]], to_jsonb((sc->>ids[f + 1])::int + 1));
          sc := jsonb_set(sc, array[ids[t + 1]], to_jsonb(greatest(0, (sc->>ids[t + 1])::int - 1)));
          inv := jsonb_set(inv, array[t::text], to_jsonb(l + 1000));
          spl := jsonb_set(spl, array[ids[t + 1]], to_jsonb(coalesce((spl->>ids[t + 1])::int, 0) + 1));
          e := e || jsonb_build_object('r', 1);
          if (sc->>ids[f + 1])::int >= 10 and won < 0 then won := f; end if;
        else e := e || jsonb_build_object('r', 0); end if;
      end if;
      if l > n - 3000 then ev := ev || jsonb_build_array(e); end if;
    end loop;
    gj := gj || jsonb_build_object('ev', ev, 'score', sc, 'splat', spl, 'inv', inv);
  else
    x := array_fill(0::numeric, array[np]); y := x; vx := x; vy := x; al := array_fill(true, array[np]); rs := array_fill(0::bigint, array[np]); lt := array_fill(0, array[np]); ltm := rs;
    t0 := (gj->>'t0')::bigint; steps := least(((n - t0) / 40)::int, 250);
    for i in 1..np loop
      x[i] := (gj->'bx'->(i - 1)->>0)::numeric; y[i] := (gj->'bx'->(i - 1)->>1)::numeric; vx[i] := (gj->'bx'->(i - 1)->>2)::numeric; vy[i] := (gj->'bx'->(i - 1)->>3)::numeric;
      al[i] := (gj->'bx'->(i - 1)->>4)::int = 1; rs[i] := (gj->'bx'->(i - 1)->>5)::bigint; lt[i] := (gj->'bx'->(i - 1)->>6)::int; ltm[i] := (gj->'bx'->(i - 1)->>7)::bigint;
    end loop;
    for s in 1..steps loop
      ts := t0 + s::bigint * 40;
      for i in 1..np loop
        if not al[i] and ts >= rs[i] then
          a := radians(-90 + (i - 1) * 360.0 / np); x[i] := round(55 * cos(a), 2); y[i] := round(55 * sin(a), 2); vx[i] := 0; vy[i] := 0; al[i] := true; lt[i] := 0;
        end if;
      end loop;
      for i in 1..np loop
        if al[i] then x[i] := x[i] + vx[i]; y[i] := y[i] + vy[i]; vx[i] := vx[i] * 0.975; vy[i] := vy[i] * 0.975; end if;
      end loop;
      for i in 1..np - 1 loop
        for j in i + 1..np loop
          if al[i] and al[j] then
            dx := x[i] - x[j]; dy := y[i] - y[j]; dd := sqrt(dx * dx + dy * dy);
            if dd < 2 * rr then
              if dd < 0.001 then dx := 1; dy := 0; dd := 1; end if;
              nx := dx / dd; ny := dy / dd;
              rv := (vx[i] - vx[j]) * nx + (vy[i] - vy[j]) * ny;
              if rv < 0 then
                imp := -(1 + 0.95) * rv / 2;
                vx[i] := vx[i] + imp * nx; vy[i] := vy[i] + imp * ny; vx[j] := vx[j] - imp * nx; vy[j] := vy[j] - imp * ny;
                lt[i] := j; ltm[i] := ts; lt[j] := i; ltm[j] := ts;
              end if;
              ov := (2 * rr - dd) / 2;
              x[i] := x[i] + ov * nx; y[i] := y[i] + ov * ny; x[j] := x[j] - ov * nx; y[j] := y[j] - ov * ny;
            end if;
          end if;
        end loop;
      end loop;
      for i in 1..np loop
        if al[i] and sqrt(x[i] * x[i] + y[i] * y[i]) > ring then
          al[i] := false; rs[i] := ts + 1800;
          if lt[i] > 0 and ts - ltm[i] <= 3000 then
            sc := jsonb_set(sc, array[ids[lt[i]]], to_jsonb((sc->>ids[lt[i]])::int + 1));
            if (sc->>ids[lt[i]])::int >= 5 and won < 0 then won := lt[i] - 1; end if;
          end if;
        end if;
      end loop;
    end loop;
    if steps >= 250 then t0 := n; else t0 := t0 + steps::bigint * 40; end if;
    for i in 1..np loop
      bx := bx || jsonb_build_array(jsonb_build_array(round(x[i], 2), round(y[i], 2), round(vx[i], 3), round(vy[i], 3), case when al[i] then 1 else 0 end, rs[i], lt[i], ltm[i]));
    end loop;
    gj := gj || jsonb_build_object('bx', bx, 't0', t0, 'score', sc);
  end if;
  if won >= 0 or n >= (gj->>'tend')::bigint then
    for i in 1..np loop if (sc->>ids[i])::int > best then best := (sc->>ids[i])::int; w := i; end if; end loop;
    if won >= 0 then w := won + 1; end if;
    gj := gj || jsonb_build_object('phase', 'over', 'ends', 9e15::bigint, 'res', jsonb_build_object('win', ids[w]));
  end if;
  return gj;
end $function$;

/* ---------- view: never wait behind another player's poll ---------- */
create or replace function public.party_view(p_room uuid, p_since bigint default 0)
 returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare me uuid := auth.uid(); r record; gj jsonb; mems jsonb; chat jsonb; ph text; imp boolean; show text; chat_ok boolean := true; gv jsonb := null; memarr uuid[];
begin
  if me is null or not exists(select 1 from public.party_members where room = p_room and uid = me) then raise exception 'no such party'; end if;
  select * into r from public.party_rooms where id = p_room for update skip locked;
  if found then perform public.party_adv(p_room); end if;
  select * into r from public.party_rooms where id = p_room;
  if not found then raise exception 'no such party'; end if;
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
end $function$;

/* ---------- act: return the fresh view in the same request ---------- */
create or replace function public.party_act(p_room uuid, p_do text, p_a text)
 returns jsonb language plpgsql security definer set search_path to 'public' as $function$
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
  return jsonb_build_object('ok', true, 'hit', hit, 'view', public.party_view(p_room, 0));
end $function$;

/* ---------- head-to-head games: pick + fresh view in one request ---------- */
create or replace function public.bt_pick_v(p_game uuid, p_name text) returns jsonb language plpgsql security invoker set search_path to 'public' as $$
declare d jsonb;
begin d := public.bt_pick(p_game, p_name); return coalesce(d, '{}'::jsonb) || jsonb_build_object('view', public.bt_view(p_game)); end $$;
create or replace function public.fm_pick_v(p_game uuid, p_name text, p_cc text) returns jsonb language plpgsql security invoker set search_path to 'public' as $$
declare d jsonb;
begin d := public.fm_pick(p_game, p_name, p_cc); return coalesce(d, '{}'::jsonb) || jsonb_build_object('view', public.fm_view(p_game)); end $$;
create or replace function public.who_guess_v(p_game uuid, p_name text) returns jsonb language plpgsql security invoker set search_path to 'public' as $$
declare d jsonb;
begin d := public.who_guess(p_game, p_name); return coalesce(d, '{}'::jsonb) || jsonb_build_object('view', public.who_view(p_game)); end $$;

revoke all on function public.bt_pick_v(uuid, text), public.fm_pick_v(uuid, text, text), public.who_guess_v(uuid, text) from public, anon;
grant execute on function public.bt_pick_v(uuid, text), public.fm_pick_v(uuid, text, text), public.who_guess_v(uuid, text) to authenticated;
