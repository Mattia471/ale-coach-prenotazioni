-- Release only expired, uncaptured Stripe authorizations after Stripe confirms cancellation.
-- The current DB booking cron deliberately skips pending authorized bookings.
-- Service role only: the client cannot mark an uncaptured authorization expired.
create or replace function public.get_stripe_housekeeping_token()
returns text language sql security definer set search_path='' as $token$
  select decrypted_secret from vault.decrypted_secrets
  where name='ale_coach_stripe_housekeeping_token'
  limit 1;
$token$;
revoke all on function public.get_stripe_housekeeping_token() from PUBLIC, anon, authenticated;
grant execute on function public.get_stripe_housekeeping_token() to service_role;

create or replace function public.expire_released_stripe_authorization(
  p_booking_id uuid,p_intent_id text
) returns boolean language plpgsql security definer set search_path='' as $release$
declare b public.bookings%rowtype;
begin
 perform pg_catalog.pg_advisory_xact_lock(7684321001);
 select * into b from public.bookings where id=p_booking_id for update;
 if not found then raise exception 'Booking missing'; end if;
 if b.status='expired' and b.payment_status='unpaid' and
    b.stripe_payment_intent_id=p_intent_id then return false; end if;
 if b.payment_mode<>'online' or b.payment_status<>'authorized'
   or b.stripe_payment_intent_id is distinct from p_intent_id
   or b.expires_at>now() or
   not (b.status='pending' or
      (b.status='processing' and b.stripe_decision='approve'))
 then return false; end if;

 -- Only after Stripe cancellation is independently verified by the server.
 update public.bookings set status='expired',payment_status='unpaid',
   stripe_decision=null where id=b.id;
 insert into public.notifications(recipient_id,title,body,kind,booking_id)
 values(b.client_id,'Richiesta scaduta',
  'Il tempo di risposta e terminato. L autorizzazione della carta e stata annullata senza incasso.',
  'booking_expired',b.id);
 return true;
end;
$release$;
revoke all on function public.expire_released_stripe_authorization(uuid,text)
  from PUBLIC, anon, authenticated;
grant execute on function public.expire_released_stripe_authorization(uuid,text)
  to service_role;

-- No API key in SQL, migrations or logs: the authorization token is read
-- from encrypted Vault by the PostgreSQL cron job at runtime.
select cron.schedule(
 'ale-coach-release-stripe-authorizations',
 '*/5 * * * *',
 $cron$
 select net.http_post(
   url:='https://mmtnzjdvvlouiwgrydlf.supabase.co/functions/v1/reconcile-authorizations',
   headers:=jsonb_build_object('Content-Type','application/json',
    'x-ale-housekeeping-secret',
    (select decrypted_secret from vault.decrypted_secrets
      where name='ale_coach_stripe_housekeeping_token' limit 1)),
   body:='{}'::jsonb,
   timeout_milliseconds:=15000
 );
 $cron$
);
