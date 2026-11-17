-- Client-confirmed terms 17 Nov 2026. Staged, not applied automatically.
-- Only future requests can run up to 48h, capped by session start/capture expiry.
-- Existing QA orders/bookings are unchanged. Full vs 50% Stripe refund is in
-- cancel-booking Edge Function, credits via cancel_unpaid_booking.
-- Financial integrity: keep paid in-person cancellation protected.
CREATE OR REPLACE FUNCTION public.create_booking_v2(p_service_id text, p_venue_id text, p_day date, p_start_minute integer, p_details jsonb DEFAULT '{}'::jsonb, p_payment_mode text DEFAULT 'online'::text, p_code text DEFAULT NULL::text, p_source text DEFAULT 'direct'::text, p_referral text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_uid uuid:=auth.uid();v_profile public.profiles%rowtype;v_service public.services%rowtype;
 v_start timestamptz;v_discount integer:=0;v_code public.discount_codes%rowtype;
 v_mode text:=p_payment_mode;v_wallet uuid;v_id uuid;v_venue text:=p_venue_id;
begin
 if v_uid is null then raise exception 'Devi accedere per prenotare'; end if;
 perform pg_catalog.pg_advisory_xact_lock(7684321001);
 select * into v_profile from public.profiles where id=v_uid for update;
 if not found or not v_profile.virgin_member then raise exception 'Per prenotare occorre iscrizione Virgin Active'; end if;
 select * into v_service from public.services where id=p_service_id and active;
 if not found then raise exception 'Servizio non disponibile'; end if;
 if jsonb_typeof(p_details) is distinct from 'object' or octet_length(p_details::text)>6000 then
  raise exception 'Dettagli non validi'; end if;
 if v_service.id='couple' and nullif(trim(coalesce(p_details->>'partner','')),'') is null then
  raise exception 'Indica il secondo partecipante'; end if;
 if v_service.id='other' and nullif(trim(coalesce(p_details->>'description','')),'') is null then
  raise exception 'Descrivi la richiesta'; end if;
 if v_service.kind='quote' then v_start:=null;v_mode:='none';v_venue:=null;
 else
  if p_start_minute is null or p_start_minute<0 or p_start_minute>1439 or p_start_minute%15<>0 then
   raise exception 'Orario non valido'; end if;
  v_start:=(p_day::text||' '||lpad((p_start_minute/60)::text,2,'0')||':'||
   lpad((p_start_minute%60)::text,2,'0'))::timestamp at time zone 'Europe/Rome';
  if v_start<now()+interval '12 hours' or v_start>now()+interval '42 days' then
   raise exception 'Prenotazioni possibili da 12 ore a 42 giorni'; end if;
  if not exists(select 1 from public.available_slots_v2(p_service_id,p_day,v_venue)
    where start_minute=p_start_minute and venue_id=v_venue) then
   raise exception 'Slot non disponibile: verifica sede, corsi e spostamenti'; end if;
 end if;
 if v_service.kind='free' then v_mode:='none'; end if;
 if v_service.kind='paid' then
  if v_mode not in ('online','in_person','credit') then raise exception 'Metodo di pagamento non valido'; end if;
  if v_mode='in_person' and not v_profile.allow_in_person then raise exception 'Pagamento in presenza non autorizzato'; end if;
  if v_mode='credit' then
   if p_service_id<>'single' then raise exception 'Crediti validi solo per individuale'; end if;
   select id into v_wallet from public.wallet_credits
    where client_id=v_uid and remaining>0 and expires_at>v_start
    order by expires_at for update skip locked limit 1;
   if v_wallet is null then raise exception 'Crediti insufficienti o in scadenza prima della lezione'; end if;
  elsif nullif(trim(coalesce(p_code,'')),'') is not null then
   select * into v_code from public.discount_codes where code=upper(trim(p_code)) and active;
   if not found then raise exception 'Codice promozionale non valido'; end if;
   if v_code.code='ALECOACH15' then
     if p_service_id<>'single' then raise exception 'ALECOACH15 vale solo per la prima individuale'; end if;
     if exists(select 1 from public.bookings where client_id=v_uid
       and service_id='single' and (status='confirmed' or
         status in ('authorizing','pending','processing','awaiting_payment') and discount_percent>0)) then
       raise exception 'Promozione già utilizzata o richiesta in corso';
     end if;
   elsif v_code.first_purchase_only and exists(select 1 from public.bookings
     where client_id=v_uid and payment_status='paid' and service_id<>'intro') then
     raise exception 'Promozione solo per il primo acquisto';
   end if;
   if v_code.valid_days_from_contact is not null and
     now()>v_profile.first_contact_at+make_interval(days=>v_code.valid_days_from_contact) then
      raise exception 'Codice promozionale scaduto'; end if;
   v_discount:=v_code.percent_off;
  end if;
 else v_mode:='none';
 end if;
 if v_wallet is not null then update public.wallet_credits set remaining=remaining-1 where id=v_wallet; end if;
 insert into public.bookings(status,client_id,service_id,venue_id,starts_at,duration_minutes,
  base_amount_cents,amount_cents,discount_percent,promo_code,payment_mode,credit_wallet_id,
  details,source,referral,expires_at)
 values(case when v_mode='online' then 'authorizing' else 'pending' end,v_uid,p_service_id,v_venue,v_start,v_service.duration_minutes,
  v_service.price_cents,round(v_service.price_cents*(100-v_discount)/100.0)::integer,
  v_discount,case when v_discount>0 then upper(trim(p_code)) else null end,
  v_mode,v_wallet,p_details,left(coalesce(p_source,'direct'),64),
  left(coalesce(p_referral,''),100),case when v_mode='online' then now()+interval '35 minutes' else least(now()+interval '48 hours',
    coalesce(v_start-interval '2 hours',now()+interval '48 hours')) end)
 returning id into v_id;
 insert into public.notifications(recipient_id,title,body,kind,booking_id)
 select id,'Nuova richiesta',v_profile.full_name||' ha chiesto una lezione.','booking_created',v_id
 from public.profiles where role='coach' and v_mode<>'online';
 return v_id;
exception when exclusion_violation or unique_violation then
 raise exception 'Questo orario o la promozione sono già riservati';
end;
$function$


CREATE OR REPLACE FUNCTION public.finalize_booking_authorization(p_booking_id uuid, p_session_id text, p_intent_id text, p_capture_before timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare b public.bookings%rowtype; v_expiry timestamptz;
begin
 select * into b from public.bookings where id=p_booking_id for update;
 if not found or b.payment_mode<>'online' or b.stripe_checkout_session_id is distinct from p_session_id then
  raise exception 'Checkout non riconciliabile'; end if;
 if b.status='pending' and b.payment_status='authorized' and b.stripe_payment_intent_id=p_intent_id then return false; end if;
 if b.status<>'authorizing' or b.expires_at<=now() then raise exception 'Checkout non piu valido'; end if;
 v_expiry:=least(now()+interval '48 hours',coalesce(p_capture_before-interval '60 minutes',now()+interval '48 hours'),b.starts_at-interval '2 hours');
 if v_expiry<=now()+interval '5 minutes' then raise exception 'Autorizzazione troppo vicina alla scadenza'; end if;
 update public.bookings set status='pending',payment_status='authorized',stripe_payment_intent_id=p_intent_id,
  stripe_authorized_at=now(),stripe_authorization_expires_at=p_capture_before,expires_at=v_expiry
 where id=p_booking_id;
 insert into public.notifications(recipient_id,title,body,kind,booking_id)
 select id,'Nuova richiesta preautorizzata','Una lezione e stata autorizzata su Stripe: approva o rifiuta entro 48 ore, prima della scadenza indicata.',
   'booking_created',p_booking_id from public.profiles where role='coach';
 return true;
end;
$function$


CREATE OR REPLACE FUNCTION public.cancel_unpaid_booking(p_booking_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_b public.bookings%rowtype;
begin
 select * into v_b from public.bookings where id=p_booking_id for update;
 if not found or
    (v_b.client_id IS DISTINCT FROM auth.uid() and not coalesce(private.is_coach(),false)) then
   raise exception 'Operazione non autorizzata';
 end if;
 if v_b.payment_mode='online' then raise exception 'Per annullare richieste online usa il server Stripe'; end if;
 if v_b.starts_at is null or v_b.starts_at<=now() then raise exception 'Non puoi disdire una lezione gia iniziata'; end if;
 if v_b.status not in ('confirmed','awaiting_payment','pending') then raise exception 'Stato non cancellabile'; end if;
 -- In-person payments may already have been collected. Cancelling them via
 -- the unpaid booking RPC would overwrite their financial status to 'unpaid'
 -- without a real refund or coach reconciliation. Require manual handling.
 if v_b.payment_mode='in_person' and v_b.payment_status='paid' then
   raise exception 'Pagamento in presenza gia registrato: disdetta da gestire con il coach';
 end if;
 update public.bookings set status='cancelled',cancelled_at=now(),payment_status=case when v_b.payment_mode='credit' then 'refunded' else 'unpaid' end where id=p_booking_id;
 if v_b.credit_wallet_id is not null then update public.wallet_credits set remaining=remaining+1 where id=v_b.credit_wallet_id; end if;
 insert into public.notifications(recipient_id,title,body,kind,booking_id) values(v_b.client_id,'Lezione disdetta','La prenotazione è stata cancellata.','booking_cancelled',p_booking_id);
end;
$function$


-- Distinguish a partial refund without altering the booked/captured price.
ALTER TABLE public.bookings
 ADD COLUMN IF NOT EXISTS refunded_amount_cents integer NOT NULL DEFAULT 0,
 ADD COLUMN IF NOT EXISTS refunded_at timestamptz;

DO $verify$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.bookings'::regclass AND conname='bookings_refund_amount_valid') THEN
  ALTER TABLE public.bookings ADD CONSTRAINT bookings_refund_amount_valid
   CHECK (refunded_amount_cents>=0 AND refunded_amount_cents<=amount_cents);
 END IF;
END;
$verify$;
-- Existing grants/RLS and security-definer search_paths remain unchanged.

-- Coach cancellation of CONFIRMED non-online lessons. This does not move
-- Stripe funds. When cash has already been collected, explicit confirmation
-- that the cash was physically returned is required before recording it.
CREATE OR REPLACE FUNCTION public.coach_cancel_confirmed_booking(
 p_booking_id uuid, p_cash_refunded boolean DEFAULT false
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $coach$
DECLARE b public.bookings%rowtype;
BEGIN
 IF auth.uid() IS NULL OR NOT coalesce(private.is_coach(),false) THEN
  RAISE EXCEPTION 'Operazione riservata al coach';
 END IF;
 SELECT * INTO b FROM public.bookings WHERE id=p_booking_id FOR UPDATE;
 IF NOT FOUND OR b.status<>'confirmed' OR b.starts_at IS NULL OR b.starts_at<=now() THEN
  RAISE EXCEPTION 'Lezione non cancellabile da questo flusso';
 END IF;
 IF b.payment_mode='online' THEN
  RAISE EXCEPTION 'Usa la funzione Stripe per il rimborso online';
 END IF;
 IF b.payment_mode='in_person' AND b.payment_status='paid' AND NOT p_cash_refunded THEN
  RAISE EXCEPTION 'Restituisci prima il contante e conferma il rimborso';
 END IF;
 UPDATE public.bookings SET status='cancelled',cancelled_at=now(),
  payment_status=CASE
   WHEN b.payment_mode='credit' OR
        (b.payment_mode='in_person' AND b.payment_status='paid')
    THEN 'refunded' ELSE 'unpaid' END,
  refunded_amount_cents=CASE WHEN b.payment_mode='in_person' AND b.payment_status='paid'
   THEN b.amount_cents ELSE 0 END,
  refunded_at=CASE WHEN b.payment_mode='in_person' AND b.payment_status='paid'
   THEN now() ELSE NULL END
 WHERE id=b.id;
 IF b.credit_wallet_id IS NOT NULL THEN
  UPDATE public.wallet_credits SET remaining=remaining+1 WHERE id=b.credit_wallet_id;
 END IF;
 INSERT INTO public.notifications(recipient_id,title,body,kind,booking_id)
 VALUES(b.client_id,'Lezione annullata dal coach',
  CASE WHEN b.payment_mode='credit'
    THEN 'Il coach ha annullato la lezione. Il credito Flex è stato restituito.'
    WHEN b.payment_mode='in_person' AND b.payment_status='paid'
    THEN 'Il coach ha annullato la lezione e registrato il rimborso in contanti.'
    ELSE 'Il coach ha annullato la lezione senza alcun costo.' END,
  'booking_cancelled',b.id);
 RETURN jsonb_build_object('ok',true,'cashRefunded',b.payment_mode='in_person'
  AND b.payment_status='paid');
END;
$coach$;
REVOKE ALL ON FUNCTION public.coach_cancel_confirmed_booking(uuid,boolean)
 FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.coach_cancel_confirmed_booking(uuid,boolean)
 TO authenticated;

