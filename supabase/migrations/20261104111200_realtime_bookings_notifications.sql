-- Streaming di modifiche riservate agli utenti autorizzati dalle policy RLS.
-- Il payload è filtrato dal motore Realtime tramite RLS; nessuna chiave privata nel browser.
alter publication supabase_realtime add table public.bookings, public.notifications;
