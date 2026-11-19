-- Party games v2: Odd Fighter Out, Pie in the Face Press Conference, Rubber Gloves, Dirty Corner. Everything is decided on the server.
-- Applied via migration party_games_x. These functions are called from party_adv / party_act / party_view (see supabase-party.sql).
create or replace function public.party_x_total(p_game text) returns int language sql immutable as $$
  select case p_game when 'oddout' then 6 when 'pie' then 6 when 'gloves' then 5 else 4 end $$;

create or replace function public.party_x_add(sc jsonb, ids text[], gain int[]) returns jsonb language plpgsql immutable as $$
declare i int;
begin
  for i in 1..3 loop sc := jsonb_set(sc, array[ids[i]], to_jsonb(coalesce((sc->>ids[i])::int, 0) + coalesce(gain[i], 0))); end loop;
  return sc;
end $$;

create or replace function public.party_x_start(p_game text, mem uuid[]) returns jsonb language plpgsql as $$
declare n bigint := public.party_ms(); sc jsonb := jsonb_build_object(mem[1]::text, 0, mem[2]::text, 0, mem[3]::text, 0); gj jsonb;
begin
  gj := jsonb_build_object('game', p_game, 'phase', 'intro', 'ends', n + 4500, 'round', 0, 'score', sc, 'act', '{}'::jsonb, 'tm', '{}'::jsonb, 'used', '[]'::jsonb, 'splat', sc);
  if p_game = 'dirty' then
    gj := gj || jsonb_build_object('sab', mem[1 + floor(random() * 3)::int]::text, 'health', 70, 'votes', '{}'::jsonb, 'peek', '{}'::jsonb);
  end if;
  return gj;
end $$;

-- Odd Fighter Out: 1 = high class, 0 = low class, -1 = unclear. Returns the position of the one that stands alone (0 = no clean 2-1 split).
create or replace function public.party_odd_split(c int[]) returns int language plpgsql immutable as $$
declare s int := 0; j int;
begin
  for j in 1..3 loop if c[j] < 0 then return 0; end if; s := s + c[j]; end loop;
  if s = 1 then for j in 1..3 loop if c[j] = 1 then return j; end if; end loop;
  elsif s = 2 then for j in 1..3 loop if c[j] = 0 then return j; end if; end loop; end if;
  return 0;
end $$;

-- three fighters where every clean pattern (weight class, win rate, experience, losses) points at the same odd one out
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
      cp := cp || (case when pc >= 80 then 1 when pc <= 70 then 0 else -1 end);
      cf := cf || (case when w[j] + l[j] + d[j] >= 25 then 1 when w[j] + l[j] + d[j] <= 15 then 0 else -1 end);
      cl := cl || (case when l[j] <= 2 then 1 when l[j] >= 6 then 0 else -1 end);
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

-- Rubber Gloves: three gloves in a round ring, one fling each. 180 steps of simple physics; returns a frame every 2 steps (x0,y0,x1,y1,x2,y2).
create or replace function public.party_gl_sim(ring numeric, ang numeric[], pw numeric[], has boolean[]) returns jsonb language plpgsql immutable as $$
declare x numeric[] := array[0,0,0]; y numeric[] := array[0,0,0]; vx numeric[] := array[0,0,0]; vy numeric[] := array[0,0,0];
  alive boolean[] := array[true,true,true]; outs int[] := array[-1,-1,-1]; lst int[] := array[0,0,0];
  r constant numeric := 11; i int; j int; s int; a numeric; dx numeric; dy numeric; d numeric; nx numeric; ny numeric; rv numeric; imp numeric; ov numeric; fr jsonb;
begin
  for i in 1..3 loop
    a := radians(-90 + (i - 1) * 120);
    x[i] := round(0.55 * ring * cos(a), 2); y[i] := round(0.55 * ring * sin(a), 2);
    if has[i] then vx[i] := cos(ang[i]) * pw[i] * 3.2; vy[i] := sin(ang[i]) * pw[i] * 3.2; end if;
  end loop;
  fr := jsonb_build_array(jsonb_build_array(round(x[1],1), round(y[1],1), round(x[2],1), round(y[2],1), round(x[3],1), round(y[3],1)));
  for s in 1..180 loop
    for i in 1..3 loop
      if alive[i] then x[i] := x[i] + vx[i]; y[i] := y[i] + vy[i]; vx[i] := vx[i] * 0.975; vy[i] := vy[i] * 0.975; end if;
    end loop;
    for i in 1..2 loop
      for j in i + 1..3 loop
        if alive[i] and alive[j] then
          dx := x[i] - x[j]; dy := y[i] - y[j]; d := sqrt(dx * dx + dy * dy);
          if d < 2 * r then
            if d < 0.001 then dx := 1; dy := 0; d := 1; end if;
            nx := dx / d; ny := dy / d;
            rv := (vx[i] - vx[j]) * nx + (vy[i] - vy[j]) * ny;
            if rv < 0 then
              imp := -(1 + 0.95) * rv / 2;
              vx[i] := vx[i] + imp * nx; vy[i] := vy[i] + imp * ny; vx[j] := vx[j] - imp * nx; vy[j] := vy[j] - imp * ny;
              lst[i] := j; lst[j] := i;
            end if;
            ov := (2 * r - d) / 2;
            x[i] := x[i] + ov * nx; y[i] := y[i] + ov * ny; x[j] := x[j] - ov * nx; y[j] := y[j] - ov * ny;
          end if;
        end if;
      end loop;
    end loop;
    for i in 1..3 loop
      if alive[i] and sqrt(x[i] * x[i] + y[i] * y[i]) > ring then alive[i] := false; outs[i] := s; end if;
    end loop;
    if s % 2 = 0 then fr := fr || jsonb_build_array(jsonb_build_array(round(x[1],1), round(y[1],1), round(x[2],1), round(y[2],1), round(x[3],1), round(y[3],1))); end if;
  end loop;
  return jsonb_build_object('frames', fr, 'outs', to_jsonb(outs), 'last', to_jsonb(lst));
end $$;

create or replace function public.party_x_round(gj jsonb, r int, mem uuid[]) returns jsonb language plpgsql as $$
declare g text := gj->>'game'; n bigint := public.party_ms(); pk jsonb; probs text[] := array['cut','swell','tired'];
begin
  gj := gj || jsonb_build_object('round', r, 'phase', 'act', 'act', '{}'::jsonb, 'tm', '{}'::jsonb, 'res', null);
  if g = 'oddout' then
    pk := public.party_odd_pick(gj->'used');
    gj := gj || jsonb_build_object('cards', pk->'cards', 'odd', pk->'odd', 'rules', pk->'rules', 'used', (gj->'used') || (pk->'names'), 'ends', n + 14000);
  elsif g = 'pie' then gj := gj || jsonb_build_object('ends', n + 8000);
  elsif g = 'gloves' then gj := gj || jsonb_build_object('R', 100 - (r - 1) * 5, 'ends', n + 12000);
  else gj := gj || jsonb_build_object('prob', probs[1 + floor(random() * 3)::int], 'ends', n + 8000); end if;
  return gj;
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
  return gj || jsonb_build_object('phase', 'show', 'ends', public.party_ms() + 5500, 'score', public.party_x_add(gj->'score', ids, gain),
    'res', jsonb_build_object('odd', odd, 'rules', gj->'rules', 'picks', act, 'gain', jsonb_build_object(ids[1], gain[1], ids[2], gain[2], ids[3], gain[3]), 'fast', case when bi > 0 then ids[bi] else null end));
end $$;

create or replace function public.party_x_res_pie(gj jsonb, mem uuid[]) returns jsonb language plpgsql as $$
declare ids text[] := array(select x::text from unnest(mem) x); act jsonb := gj->'act'; a text[] := array[null,null,null]; i int; t int; th int; h int; gain int[] := array[0,0,0];
  sp jsonb := gj->'splat'; thr jsonb := '[]'::jsonb; duck boolean[] := array[false,false,false];
begin
  for i in 1..3 loop a[i] := act->>ids[i]; duck[i] := coalesce(a[i] = 'D', false); end loop;
  for i in 1..3 loop
    if a[i] is not null and a[i] <> 'D' then
      t := array_position(ids, a[i]); h := 0;
      if not duck[t] then h := t;
      else th := 6 - i - t; if not duck[th] then h := th; end if; end if;
      if h > 0 then
        gain[i] := gain[i] + 1; gain[h] := gain[h] - 1;
        sp := jsonb_set(sp, array[ids[h]], to_jsonb(coalesce((sp->>ids[h])::int, 0) + 1));
      end if;
      thr := thr || jsonb_build_array(jsonb_build_object('f', i - 1, 't', t - 1, 'h', h - 1));
    end if;
  end loop;
  return gj || jsonb_build_object('phase', 'show', 'ends', public.party_ms() + 7500, 'score', public.party_x_add(gj->'score', ids, gain), 'splat', sp,
    'res', jsonb_build_object('thr', thr, 'duck', to_jsonb(duck), 'gain', jsonb_build_object(ids[1], gain[1], ids[2], gain[2], ids[3], gain[3])));
end $$;

create or replace function public.party_x_res_gl(gj jsonb, mem uuid[]) returns jsonb language plpgsql as $$
declare ids text[] := array(select x::text from unnest(mem) x); act jsonb := gj->'act'; ang numeric[] := array[0,0,0]; pw numeric[] := array[0,0,0]; has boolean[] := array[false,false,false];
  s text; sim jsonb; gain int[] := array[0,0,0]; i int; j int; o int; rr numeric := (gj->>'R')::numeric; outs jsonb; lst jsonb;
begin
  for i in 1..3 loop
    s := act->>ids[i];
    if s is not null then ang[i] := split_part(s, ',', 1)::numeric; pw[i] := greatest(0, least(1, split_part(s, ',', 2)::numeric)); has[i] := true; end if;
  end loop;
  sim := public.party_gl_sim(rr, ang, pw, has); outs := sim->'outs'; lst := sim->'last';
  for i in 1..3 loop
    o := (outs->>(i - 1))::int;
    if o < 0 then gain[i] := gain[i] + 1;
    else j := (lst->>(i - 1))::int; if j > 0 then gain[j] := gain[j] + 1; end if; end if;
  end loop;
  return gj || jsonb_build_object('phase', 'show', 'ends', public.party_ms() + 8500, 'score', public.party_x_add(gj->'score', ids, gain),
    'res', jsonb_build_object('frames', sim->'frames', 'outs', outs, 'last', lst, 'R', rr, 'has', to_jsonb(has), 'gain', jsonb_build_object(ids[1], gain[1], ids[2], gain[2], ids[3], gain[3])));
end $$;

-- Dirty Corner: the right tool heals, a wrong tool hurts, every round costs a little. Players may get a private peek at what one other player used.
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
  return gj || jsonb_build_object('phase', 'show', 'ends', public.party_ms() + 7000, 'health', hp2, 'peek', peek,
    'res', jsonb_build_object('need', need, 'c', c, 'w', w, 'from', hp, 'to', hp2));
end $$;

create or replace function public.party_x_final_dirty(gj jsonb, mem uuid[]) returns jsonb language plpgsql as $$
declare ids text[] := array(select x::text from unnest(mem) x); votes jsonb := gj->'votes'; cnt int[] := array[0,0,0]; i int; k int; v text; sab text := gj->>'sab'; si int; mx int := 0;
  caught boolean; ok boolean := (gj->>'health')::int >= 60; gain int[] := array[0,0,0];
begin
  si := array_position(ids, sab);
  for i in 1..3 loop v := votes->>ids[i]; if v is not null then k := array_position(ids, v); cnt[k] := cnt[k] + 1; end if; end loop;
  for i in 1..3 loop if i <> si and cnt[i] > mx then mx := cnt[i]; end if; end loop;
  caught := cnt[si] > mx;
  for i in 1..3 loop
    gain[i] := case when i = si then (case when ok then 0 else 3 end) + (case when caught then 0 else 2 end)
                    else (case when ok then 2 else 0 end) + (case when caught then 2 else 0 end) end;
  end loop;
  return gj || jsonb_build_object('phase', 'over', 'ends', 9e15::bigint, 'score', public.party_x_add(gj->'score', ids, gain),
    'res', jsonb_build_object('sab', sab, 'caught', caught, 'ok', ok, 'gain', jsonb_build_object(ids[1], gain[1], ids[2], gain[2], ids[3], gain[3])));
end $$;

create or replace function public.party_x_step(gj jsonb, mem uuid[]) returns jsonb language plpgsql as $$
declare g text := gj->>'game'; ph text := gj->>'phase'; r int := (gj->>'round')::int; n bigint := public.party_ms();
begin
  if ph = 'intro' then return public.party_x_round(gj, 1, mem);
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
begin
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
declare g text := gj->>'game'; ph text := gj->>'phase'; v jsonb;
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
  return v;
end $$;

revoke all on function public.party_x_total(text), public.party_x_add(jsonb, text[], int[]), public.party_x_start(text, uuid[]), public.party_odd_split(int[]), public.party_odd_pick(jsonb),
  public.party_gl_sim(numeric, numeric[], numeric[], boolean[]), public.party_x_round(jsonb, int, uuid[]), public.party_x_res_odd(jsonb, uuid[]), public.party_x_res_pie(jsonb, uuid[]),
  public.party_x_res_gl(jsonb, uuid[]), public.party_x_res_dirty(jsonb, uuid[]), public.party_x_final_dirty(jsonb, uuid[]), public.party_x_step(jsonb, uuid[]),
  public.party_x_act(jsonb, uuid, text, text, uuid[]), public.party_x_view(jsonb, uuid, uuid[]) from public, anon, authenticated;
