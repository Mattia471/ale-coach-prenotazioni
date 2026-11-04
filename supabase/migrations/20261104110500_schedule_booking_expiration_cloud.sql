-- Solo ambiente Supabase Cloud Ale Coach.
-- La pulizia ogni 5 minuti libera gli slot scaduti, prevenendo overbooking e blocchi permanenti.
create extension if not exists pg_cron with schema pg_catalog;
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;
select cron.schedule(
 'ale-coach-expire-bookings',
 '*/5 * * * *',
 'select public.expire_stale_bookings()'
);
