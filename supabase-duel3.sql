-- Duels: an equal score is a draw and nobody gets coins. Safe to run more than once.
create or replace function public.trivia_submit(p_game uuid, p_picks int[], p_ms int) returns int
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); g record; k int[]; sc int := 0; i int; ms int := least(greatest(coalesce(p_ms,0), 0), 600000);
        wn uuid; rw boolean := false; today timestamptz := ((now() at time zone 'Asia/Jerusalem')::date)::timestamp at time zone 'Asia/Jerusalem';
begin
  select * into g from public.trivia_games where id = p_game for update;
  if not found or uid is null or (uid <> g.a and uid <> g.b) then raise exception 'no such game'; end if;
  if g.status in ('done','declined','cancelled') then raise exception 'game is over'; end if;
  if g.status <> 'active' then raise exception 'not accepted yet'; end if;
  if not g.ready then raise exception 'not ready yet'; end if;
  if coalesce(array_length(p_picks,1),0) <> 10 then raise exception 'bad answers'; end if;
  if (uid = g.a and g.a_score is not null) or (uid = g.b and g.b_score is not null) then raise exception 'already played'; end if;
  select case when g.mode = 'fav' and uid = g.b then answers_b else answers end into k from public.trivia_secret where game_id = p_game;
  for i in 1..10 loop if p_picks[i] = k[i] then sc := sc + 1; end if; end loop;
  if uid = g.a then g.a_score := sc; g.a_ms := ms; else g.b_score := sc; g.b_ms := ms; end if;
  if g.a_score is not null and g.b_score is not null then
    if g.a_score > g.b_score then wn := g.a;
    elsif g.b_score > g.a_score then wn := g.b;
    end if; -- equal score = draw, nobody gets coins
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
revoke all on function public.trivia_submit(uuid, int[], int) from public, anon;
grant execute on function public.trivia_submit(uuid, int[], int) to authenticated;
