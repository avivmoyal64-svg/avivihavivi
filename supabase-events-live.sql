-- Run once in Supabase SQL Editor (after deploying the new update-events function).
-- Every minute on Fri/Sat/Sun/Mon (UTC). The function itself does nothing unless an event is about to start, live or just finished.
select cron.schedule('update-events-live','* * * * 5,6,0,1',
 $$select net.http_post(url:='https://hauxmxemyvgbgkbholln.supabase.co/functions/v1/update-events?live=1')$$);
