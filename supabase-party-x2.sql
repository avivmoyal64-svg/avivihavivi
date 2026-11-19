-- Party v3: live Pie Press Conference + Rubber Gloves, easier Odd Fighter Out, shorter waits, vote for the next game after each game.
create or replace function public.party_odd_pick(used jsonb) returns jsonb language plpgsql as $$
declare i int := 0; names text[]; wc text[]; w int[]; l int[]; d int[]; pc numeric; cp int[]; cf int[]; cl int[]; j int; o int; od int[]; rules jsonb; o2 int; cards jsonb;
begin
  loop
    i := i + 1; exit when i > 600;
    select array_agg(p.name), array_agg(p.wc), array_agg(p.wins), array_agg(p.losses), array_agg(p.draws) into names, wc, w, l, d
      from (select * from public.party_pool x where not (used @> jsonb_build_array(x.name)) order by random() limit 3) p;
    continue when names is null or array_length(names, 1) < 3;
    cp := '{}'; cf := '{}'; cl := '{}'; rules := '[]'::jsonb; od := '{}';
    for j in 1..3 loop
      pc := 100.0 * w[j] / greatest(w[j] + l[j] + d[j], 1);
      cp := cp || (case when pc >= 85 then 1 when pc <= 60 then 0 else -1 end);
      cf := cf || (case when w[j] + l[j] + d[j] >= 30 then 1 when w[j] + l[j] + d[j] <= 12 then 0 else -1 end);
      cl := cl || (case when l[j] <= 1 then 1 when l[j] >= 7 then 0 else -1 end);
    end loop;
    o := case when wc[1] = wc[2] and wc[3] <> wc[1] then 3 when wc[1] = wc[3] and wc[2] <> wc[1] then 2 when wc[2] = wc[3] and wc[1] <> wc[2] then 1 else 0 end;
    if o > 0 then od := od || o; rules := rules || to_jsonb('wc'::text); end if;
    o := public.party_odd_split(cp);
    if o > 0 then o2 := case when o = 1 then 2 else 1 end; od := od || o; rules := rules || to_jsonb((case when cp[o2] = 1 then 'pct_hi' else 'pct_lo' end)::text); end if;
    o := public.party_odd_split(cf);
    if o > 0 then o2 := case when o = 1 then 2 else 1 end; od := od || o; rules := rules || to_jsonb((case when cf[o2] = 1 then 'fights_hi' else 'fights_lo' end)::text); end if;
    o := public.party_odd_split(cl);
    if o > 0 then o2 := case when o = 1 then 2 else 1 end; od := od || o; rules := rules || to_jsonb((case when cl[o2] = 1 then 'loss_lo' else 'loss_hi' end)::text); end if;
    cards := (select jsonb_agg(jsonb_build_object('n', names[g], 'wc', wc[g], 'w', w[g], 'l', l[g], 'd', d[g]) order by g) from generate_series(1, 3) g);
    if coalesce(array_length(od, 1), 0) >= 1 and (select count(distinct x) from unnest(od) x) = 1 then
      return jsonb_build_object('names', to_jsonb(names), 'odd', od[1], 'rules', rules, 'cards', cards);
    end if;
  end loop;
  return jsonb_build_object('names', to_jsonb(names), 'odd', 1, 'rules', '[]'::jsonb, 'cards', cards);
end $$;

create or replace function public.party_x_res_odd(gj jsonb, mem uuid[]) returns jsonb language plpgsql as $$
declare ids text[] := array(select x::text from unnest(mem) x); act jsonb := gj->'act'; tm jsonb := gj->'tm'; odd int := (gj->>'odd')::int - 1; gain int[] := array[0,0,0]; i int; best bigint := null; bi int := 0; t bigint;
begin
  for i in 1..3 loop
    if act->>ids[i] = odd::text then
      gain[i] := 2; t := (tm->>ids[i])::bigint;
      if best is null or t < best then best := t; bi := i; end if;
    end if;
  end loop;
  if bi > 0 then gain[bi] := gain[bi] + 1; end if;
  return gj || jsonb_build_object('phase', 'show', 'ends', public.party_ms() + 3500, 'score', public.party_x_add(gj->'score', ids, gain),
    'res', jsonb_build_object('odd', odd, 'rules', gj->'rules', 'picks', act, 'gain', jsonb_build_object(ids[1], gain[1], ids[2], gain[2], ids[3], gain[3]), 'fast', case when bi > 0 then ids[bi] else null end));
end $$;

create or replace function public.party_x_res_dirty(gj jsonb, mem uuid[]) returns jsonb language plpgsql as $$
declare ids text[] := array(select x::text from unnest(mem) x); act jsonb := gj->'act'; need text := case gj->>'prob' when 'cut' then 'jelly' when 'swell' then 'ice' else 'water' end;
  c int := 0; w int := 0; i int; t int; tl text; hp int := (gj->>'health')::int; hp2 int; peek jsonb := '{}'::jsonb;
begin
  for i in 1..3 loop
    tl := act->>ids[i];
    if tl = need then c := c + 1; elsif tl is not null then w := w + 1; end if;
  end loop;
  hp2 := least(100, greatest(0, hp + 6 * c - 12 * w - 8));
  for i in 1..3 loop
    if random() < 0.5 then
      t := case when random() < 0.5 then 1 + (i % 3) else 1 + ((i + 1) % 3) end;
      peek := peek || jsonb_build_object(ids[i], jsonb_build_object('u', ids[t], 'tool', act->>ids[t], 'ok', (act->>ids[t]) = need));
    end if;
  end loop;
  return gj || jsonb_build_object('phase', 'show', 'ends', public.party_ms() + 4000, 'health', hp2, 'peek', peek,
    'res', jsonb_build_object('need', need, 'c', c, 'w', w, 'from', hp, 'to', hp2));
end $$;

create or replace function public.party_x_step(gj jsonb, mem uuid[]) returns jsonb language plpgsql as $$
declare g text := gj->>'game'; ph text := gj->>'phase'; r int := (gj->>'round')::int; n bigint := public.party_ms();
begin
  if ph = 'intro' then if g in ('pie', 'gloves') then return public.party_x_live(gj, mem); end if; return public.party_x_round(gj, 1, mem);
  elsif ph = 'act' then
    return case g when 'oddout' then public.party_x_res_odd(gj, mem) when 'pie' then public.party_x_res_pie(gj, mem) when 'gloves' then public.party_x_res_gl(gj, mem) else public.party_x_res_dirty(gj, mem) end;
  elsif ph = 'show' then
    if r >= public.party_x_total(g) then
      if g = 'dirty' then return gj || jsonb_build_object('phase', 'vote', 'ends', n + 25000, 'votes', '{}'::jsonb);
      else return gj || jsonb_build_object('phase', 'over', 'ends', 9e15::bigint); end if;
    end if;
    return public.party_x_round(gj, r + 1, mem);
  elsif ph = 'vote' then return public.party_x_final_dirty(gj, mem);
  end if;
  return gj || jsonb_build_object('phase', 'over', 'ends', 9e15::bigint);
end $$;

create or replace function public.party_x_act(gj jsonb, me uuid, p_do text, p_a text, mem uuid[]) returns jsonb language plpgsql as $$
declare g text := gj->>'game'; ph text := gj->>'phase'; ok boolean := false; ids text[] := array(select x::text from unnest(mem) x);
  k int := coalesce(array_position(ids, me::text), 1) - 1; n bigint := public.party_ms(); t int; a numeric; pw numeric;
begin
  if ph = 'live' then
    if coalesce((gj->'cd'->>(k::text))::bigint, 0) > n then raise exception 'wait'; end if;
    if g = 'pie' then
      if coalesce((gj->'inv'->>(k::text))::bigint, 0) > n then raise exception 'stunned'; end if;
      if p_do = 'throw' then
        t := p_a::int; if t < 0 or t > 2 or t = k then raise exception 'bad move'; end if;
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
end $$;

create or replace function public.party_x_view(gj jsonb, me uuid, mem uuid[]) returns jsonb language plpgsql as $$
declare g text := gj->>'game'; ph text := gj->>'phase'; v jsonb; ki int := coalesce(array_position(array(select x::text from unnest(mem) x), me::text), 1) - 1;
begin
  v := jsonb_build_object('game', g, 'phase', ph, 'ends', (gj->>'ends')::bigint, 'round', (gj->>'round')::int, 'total', public.party_x_total(g), 'score', gj->'score',
    'seats', to_jsonb(array(select x::text from unnest(mem) x)),
    'acted', (select coalesce(jsonb_agg(k), '[]'::jsonb) from jsonb_object_keys(gj->'act') k), 'mine', gj->'act'->(me::text),
    'voted', (select coalesce(jsonb_agg(k), '[]'::jsonb) from jsonb_object_keys(coalesce(gj->'votes', '{}'::jsonb)) k), 'myvote', gj->'votes'->(me::text),
    'res', case when ph in ('show', 'over') then gj->'res' else null end, 'splat', gj->'splat');
  if g = 'oddout' then v := v || jsonb_build_object('cards', case when ph in ('act', 'show') then gj->'cards' else null end);
  elsif g = 'gloves' then v := v || jsonb_build_object('ring', gj->'R');
  elsif g = 'dirty' then
    v := v || jsonb_build_object('role', case when me::text = gj->>'sab' then 'sab' else 'crew' end, 'prob', gj->>'prob', 'health', (gj->>'health')::int,
      'peek', case when ph = 'show' then gj->'peek'->(me::text) else null end, 'sab', case when ph = 'over' then gj->>'sab' else null end,
      'votes', case when ph = 'over' then gj->'votes' else null end);
  end if;
  if ph = 'live' then
    if g = 'pie' then v := v || jsonb_build_object('ev', gj->'ev', 'duck', gj->'duck', 'inv', gj->'inv', 'cd', gj->'cd'->(ki::text));
    else v := v || jsonb_build_object('bx', gj->'bx', 't0', (gj->>'t0')::bigint, 'cd', gj->'cd'->(ki::text), 'R', 100); end if;
  end if;
  return v;
end $$;

create or replace function public.party_x_live(gj jsonb, mem uuid[]) returns jsonb language plpgsql as $$
declare g text := gj->>'game'; n bigint := public.party_ms(); bx jsonb := '[]'::jsonb; i int; a numeric;
begin
  gj := gj || jsonb_build_object('phase', 'live', 'ends', 9e15::bigint, 'round', 1, 'ev', '[]'::jsonb, 'duck', '{}'::jsonb, 'inv', '{}'::jsonb, 'cd', '{}'::jsonb, 'seq', 0, 'tend', n + 180000, 'res', null);
  if g = 'gloves' then
    for i in 0..2 loop a := radians(-90 + i * 120); bx := bx || jsonb_build_array(jsonb_build_array(round(55 * cos(a), 2), round(55 * sin(a), 2), 0, 0, 1, 0, 0, 0)); end loop;
    gj := gj || jsonb_build_object('bx', bx, 't0', n);
  end if;
  return gj;
end $$;

-- advances a live game (Pie Press Conference or Rubber Gloves) to time n. Pure function of the stored state, called on every view/act.
create or replace function public.party_x_tick(gj jsonb, mem uuid[], n bigint) returns jsonb language plpgsql as $$
declare g text := gj->>'game'; ids text[] := array(select x::text from unnest(mem) x); sc jsonb := gj->'score'; spl jsonb := gj->'splat'; inv jsonb := coalesce(gj->'inv', '{}'::jsonb);
  dk jsonb := coalesce(gj->'duck', '{}'::jsonb); ev jsonb := '[]'::jsonb; e jsonb; f int; t int; l bigint; hit boolean; won int := -1; d jsonb; w int; best int := -1; i int; j int; s int; ts bigint; steps int; t0 bigint;
  x numeric[] := array[0,0,0]; y numeric[] := array[0,0,0]; vx numeric[] := array[0,0,0]; vy numeric[] := array[0,0,0]; al boolean[] := array[true,true,true]; rs bigint[] := array[0,0,0]; lt int[] := array[0,0,0]; ltm bigint[] := array[0,0,0];
  rr constant numeric := 11; ring constant numeric := 100; a numeric; dx numeric; dy numeric; dd numeric; nx numeric; ny numeric; rv numeric; imp numeric; ov numeric; bx jsonb := '[]'::jsonb;
begin
  if gj->>'phase' <> 'live' then return gj; end if;
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
    t0 := (gj->>'t0')::bigint; steps := least(((n - t0) / 40)::int, 250);
    for i in 1..3 loop
      x[i] := (gj->'bx'->(i - 1)->>0)::numeric; y[i] := (gj->'bx'->(i - 1)->>1)::numeric; vx[i] := (gj->'bx'->(i - 1)->>2)::numeric; vy[i] := (gj->'bx'->(i - 1)->>3)::numeric;
      al[i] := (gj->'bx'->(i - 1)->>4)::int = 1; rs[i] := (gj->'bx'->(i - 1)->>5)::bigint; lt[i] := (gj->'bx'->(i - 1)->>6)::int; ltm[i] := (gj->'bx'->(i - 1)->>7)::bigint;
    end loop;
    for s in 1..steps loop
      ts := t0 + s::bigint * 40;
      for i in 1..3 loop
        if not al[i] and ts >= rs[i] then
          a := radians(-90 + (i - 1) * 120); x[i] := round(55 * cos(a), 2); y[i] := round(55 * sin(a), 2); vx[i] := 0; vy[i] := 0; al[i] := true; lt[i] := 0;
        end if;
      end loop;
      for i in 1..3 loop
        if al[i] then x[i] := x[i] + vx[i]; y[i] := y[i] + vy[i]; vx[i] := vx[i] * 0.975; vy[i] := vy[i] * 0.975; end if;
      end loop;
      for i in 1..2 loop
        for j in i + 1..3 loop
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
      for i in 1..3 loop
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
    for i in 1..3 loop
      bx := bx || jsonb_build_array(jsonb_build_array(round(x[i], 2), round(y[i], 2), round(vx[i], 3), round(vy[i], 3), case when al[i] then 1 else 0 end, rs[i], lt[i], ltm[i]));
    end loop;
    gj := gj || jsonb_build_object('bx', bx, 't0', t0, 'score', sc);
  end if;
  if won >= 0 or n >= (gj->>'tend')::bigint then
    for i in 1..3 loop if (sc->>ids[i])::int > best then best := (sc->>ids[i])::int; w := i; end if; end loop;
    if won >= 0 then w := won + 1; end if;
    gj := gj || jsonb_build_object('phase', 'over', 'ends', 9e15::bigint, 'res', jsonb_build_object('win', ids[w]));
  end if;
  return gj;
end $$;

-- wrapper: live ticks first, then the original party_adv (now party_adv0), then "game over -> 5 seconds -> vote for the next game"
alter function public.party_adv(uuid) rename to party_adv0;
create or replace function public.party_adv(p_room uuid) returns void language plpgsql security definer set search_path = public as $$
declare r record; gj jsonb; mem uuid[]; n bigint := public.party_ms(); cnt int;
begin
  select * into r from public.party_rooms where id = p_room;
  if not found then return; end if;
  if r.status = 'voting' and n >= coalesce(r.vote_end, 0) and coalesce(r.st->>'again', '') = 'true' then
    select count(*) into cnt from public.party_members where room = p_room and state = 'joined' and vote is not null;
    if cnt = 0 then update public.party_rooms set status = 'closed' where id = p_room; return; end if;
  end if;
  if r.status = 'playing' then
    select s.g into gj from public.party_secret s where s.room = p_room;
    if gj is not null and gj->>'phase' = 'live' then
      select array_agg(m.uid order by m.uid) into mem from public.party_members m where m.room = p_room and m.state = 'joined';
      gj := public.party_x_tick(gj, mem, n);
      update public.party_secret set g = gj where room = p_room;
    end if;
  end if;
  perform public.party_adv0(p_room);
  select * into r from public.party_rooms where id = p_room;
  if r.status = 'done' then
    select s.g into gj from public.party_secret s where s.room = p_room;
    if gj is not null and gj->>'phase' = 'over' then
      if (gj->>'ends')::bigint > 8e15 then
        update public.party_secret set g = gj || jsonb_build_object('ends', n + 5000) where room = p_room;
        update public.party_rooms set status = 'playing', touched = now() where id = p_room;
      elsif n >= (gj->>'ends')::bigint then
        update public.party_members set vote = null where room = p_room;
        update public.party_rooms set status = 'voting', game = null, vote_end = n + 15000, touched = now(), st = jsonb_build_object('again', true) where id = p_room;
      else
        update public.party_rooms set status = 'playing' where id = p_room;
      end if;
    end if;
  end if;
end $$;
