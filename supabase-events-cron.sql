-- Run AFTER you deployed the "update-events" function (with "Verify JWT" turned OFF).
select cron.schedule('update-events-fri-mon','*/30 * * * 5,6,0,1',
 $$select net.http_post(url:='https://hauxmxemyvgbgkbholln.supabase.co/functions/v1/update-events')$$);
select cron.schedule('update-events-midweek','0 */6 * * 2,3,4',
 $$select net.http_post(url:='https://hauxmxemyvgbgkbholln.supabase.co/functions/v1/update-events')$$);
