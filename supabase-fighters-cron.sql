-- Run once in Supabase (SQL Editor -> New query -> Run), AFTER deploying the update-fighters function.
select cron.schedule('update-fighters', '*/30 * * * *', $$select net.http_post(url:='https://hauxmxemyvgbgkbholln.supabase.co/functions/v1/update-fighters')$$);
