-- Everyone's picks are visible to all players (the "keep my picks private" option was removed).
-- Run once in Supabase -> SQL Editor.
update public.picks set show_picks = true;
alter table public.picks alter column show_picks set default true;
