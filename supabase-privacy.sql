-- Run once in Supabase: SQL Editor -> New query -> paste -> Run
-- Lets each player choose whether other players can see their picks, and powers the scoreboard.

-- 1) The choice (on by default = public; players can turn it off in Settings)
alter table public.picks add column if not exists show_picks boolean not null default true;
alter table public.picks alter column show_picks set default true;
update public.picks set show_picks = true;

-- 2) Only the owner (or everyone, if the player allowed it) can read a picks row directly
drop policy if exists "picks readable" on public.picks;
drop policy if exists "picks visible" on public.picks;
create policy "picks visible" on public.picks for select
  using (auth.uid() = user_id or show_picks);

-- 3) Scoreboard: everyone sees name, number of picks and coins.
--    The actual picks are only included for players who allowed it (and always for yourself).
create or replace function public.board()
returns table(user_id uuid, name text, show_picks boolean, n int, coins int, fights jsonb)
language sql stable security definer set search_path = public as $$
  with hist as (
    select h.key as fid, h.value as r
    from public.site_data s, jsonb_each(coalesce(s.value->'history', '{}'::jsonb)) h
    where s.key = 'events'
  ), res as (
    select f.key as fid, f.value as r
    from public.results e, jsonb_each(e.fights) f
  ), allr as (
    select coalesce(rs.fid, h.fid) as fid,
           coalesce(rs.r, h.r) as r,
           case when coalesce(h.r->>'main', '0') in ('1', 'true') then 1 else 0 end as main
    from res rs full join hist h on h.fid = rs.fid
  )
  select p.user_id, p.name, p.show_picks,
    (select count(*) from jsonb_object_keys(p.fights) k where k ~ '^e[0-9]+-')::int,
    coalesce((
      select sum(
        case when coalesce(ar.r->>'m', '') <> ''
              and replace(pf.value->>'m', 'TKO/KO', 'KO/TKO') = ar.r->>'m'
             then 200 else 100 end * (1 + ar.main))
      from jsonb_each(p.fights) pf
      join allr ar on ar.fid = pf.key
      where pf.value->>'w' = ar.r->>'w'
    ), 0)::int,
    case when p.show_picks or p.user_id = auth.uid() then p.fights else null end
  from public.picks p
$$;
revoke all on function public.board() from public, anon;
grant execute on function public.board() to authenticated;
