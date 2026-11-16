-- Run AFTER you deployed the "send-push" function (with "Verify JWT" turned OFF).
select cron.schedule('send-push','*/10 * * * *',
 $$select net.http_post(url:='https://hauxmxemyvgbgkbholln.supabase.co/functions/v1/send-push')$$);
