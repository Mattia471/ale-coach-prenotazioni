-- V2 Stripe: carta AUTORIZZATA prima che il coach riceva la richiesta.
-- Non incassa fondi finche' il coach non approva. Nessun cambiamento su booking storico.
alter table public.bookings drop constraint bookings_status_check;
alter table public.bookings add constraint bookings_status_check check
 (status in ('authorizing','pending','processing','awaiting_payment','confirmed','quoted','rejected','cancelled','expired'));
alter table public.bookings drop constraint bookings_payment_status_check;
alter table public.bookings add constraint bookings_payment_status_check check
 (payment_status in ('unpaid','awaiting','authorized','paid','due_in_person','refunded'));
alter table public.bookings add column if not exists stripe_authorized_at timestamptz;
alter table public.bookings add column if not exists stripe_authorization_expires_at timestamptz;
alter table public.bookings add column if not exists stripe_decision text;
alter table public.bookings add constraint bookings_stripe_decision_check check (stripe_decision is null or stripe_decision in ('approve','reject','cancel'));
create unique index if not exists bookings_stripe_payment_intent_unique on public.bookings(stripe_payment_intent_id) where stripe_payment_intent_id is not null;

-- Lo slot e lo sconto restano prenotati anche durante Stripe Checkout.
alter table public.bookings drop constraint bookings_no_overlap;
alter table public.bookings add constraint bookings_no_overlap exclude using gist
 (tstzrange(starts_at,ends_at,'[)') with &&)
 where (starts_at is not null and status in ('authorizing','pending','processing','awaiting_payment','confirmed'));
drop index if exists public.bookings_one_active_promo_per_client;
create unique index bookings_one_active_promo_per_client
 on public.bookings(client_id)
 where discount_percent>0 and status in ('authorizing','pending','processing','awaiting_payment','confirmed');

-- Il coach non vede richieste non pagate/non autorizzate. L'utente vede le proprie.
drop policy if exists bookings_read on public.bookings;
create policy bookings_read on public.bookings for select to authenticated
 using (client_id=(select auth.uid()) or ((select private.is_coach())
   and status<>'authorizing'
   and not (status='pending' and payment_mode='online' and payment_status<>'authorized')));

CREATE OR REPLACE FUNCTION private.coach_slot_is_free(p_start timestamp with time zone, p_duration integer, p_venue text, p_ignore_booking uuid DEFAULT NULL::uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
select p_start is not null and p_venue is not null and p_duration>0
and not exists(
 select 1 from public.bookings b
 where b.id is distinct from p_ignore_booking
 and b.status in ('authorizing','pending','processing','awaiting_payment','confirmed')
 and b.starts_at is not null
 and tstzrange(
  b.starts_at - case when b.venue_id is distinct from p_venue then interval '45 minutes' else interval '0' end,
  b.ends_at + interval '10 minutes' +
   case when b.venue_id is distinct from p_venue then interval '45 minutes' else interval '0' end,'[)')
 && tstzrange(p_start,p_start+make_interval(mins=>p_duration+10),'[)')
)
and not exists(
 select 1 from public.calendar_course_blocks c
 where c.is_active and
 ((c.on_date is not null and c.on_date=(p_start at time zone 'Europe/Rome')::date) or
  (c.weekday is not null and
   c.weekday=extract(isodow from p_start at time zone 'Europe/Rome')::int and
   (p_start at time zone 'Europe/Rome')::date between c.valid_from and c.valid_until))
 and tstzrange(
  ((coalesce(c.on_date,(p_start at time zone 'Europe/Rome')::date)::text||' '||
    lpad((c.start_minute/60)::text,2,'0')||':'||lpad((c.start_minute%60)::text,2,'0'))::timestamp at time zone 'Europe/Rome')
   -make_interval(mins=>c.before_minutes+case when c.venue_id is distinct from p_venue then 45 else 0 end),
  ((coalesce(c.on_date,(p_start at time zone 'Europe/Rome')::date)::text||' '||
    lpad((c.end_minute/60)::text,2,'0')||':'||lpad((c.end_minute%60)::text,2,'0'))::timestamp at time zone 'Europe/Rome')
   +make_interval(mins=>c.after_minutes+case when c.venue_id is distinct from p_venue then 45 else 0 end),'[)')
 && tstzrange(p_start,p_start+make_interval(mins=>p_duration+10),'[)')
)
and not exists(
 select 1 from public.external_calendar_events e
 where e.blocks_booking and not e.cancelled
 and tstzrange(
  e.starts_at - make_interval(mins=>case when e.is_course then 15 else 0 end
   +case when e.venue_id is distinct from p_venue then 45 else 0 end),
  e.ends_at + make_interval(mins=>10+case when e.venue_id is distinct from p_venue then 45 else 0 end),'[)')
 && tstzrange(p_start,p_start+make_interval(mins=>p_duration+10),'[)')
);
$function$;

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
  left(coalesce(p_referral,''),100),case when v_mode='online' then now()+interval '35 minutes' else least(now()+interval '24 hours',
    coalesce(v_start-interval '2 hours',now()+interval '24 hours')) end)
 returning id into v_id;
 insert into public.notifications(recipient_id,title,body,kind,booking_id)
 select id,'Nuova richiesta',v_profile.full_name||' ha chiesto una lezione.','booking_created',v_id
 from public.profiles where role='coach' and v_mode<>'online';
 return v_id;
exception when exclusion_violation or unique_violation then
 raise exception 'Questo orario o la promozione sono già riservati';
end;
$function$;

CREATE OR REPLACE FUNCTION public.coach_decide_booking(p_booking_id uuid, p_action text, p_quote_cents integer DEFAULT NULL::integer)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_b public.bookings%rowtype;v_status text;v_mode text;
begin
 if not private.is_coach() then raise exception 'Operazione riservata al coach'; end if;
 select * into v_b from public.bookings where id=p_booking_id for update;
 if not found or v_b.status<>'pending' then raise exception 'Richiesta non più in attesa'; end if;
 if v_b.expires_at<now() then raise exception 'Richiesta scaduta'; end if;
 if v_b.payment_mode='online' then raise exception 'La carta deve essere autorizzata prima dell invio al coach; usa il flusso Stripe server'; end if;
 if p_action='reject' then
   v_status:='rejected';
   if v_b.credit_wallet_id is not null then update public.wallet_credits set remaining=remaining+1 where id=v_b.credit_wallet_id; end if;
 elsif p_action='quote' and v_b.service_id='other' and p_quote_cents between 100 and 500000 then
   update public.bookings set status='quoted',base_amount_cents=p_quote_cents,amount_cents=p_quote_cents where id=p_booking_id;
   v_status:='quoted';
 elsif p_action='approve' and v_b.service_id<>'other' then
   v_mode:=v_b.payment_mode;
   if v_mode in ('none','in_person','credit') then v_status:='confirmed'; else v_status:='awaiting_payment'; end if;
   update public.bookings set approved_at=now(), expires_at=case when v_mode='online' then now()+interval '90 minutes' else expires_at end, payment_status=case when v_mode='in_person' then 'due_in_person' when v_mode in ('none','credit') then 'paid' else 'awaiting' end where id=p_booking_id;
 else raise exception 'Operazione non valida';
 end if;
 update public.bookings set status=v_status where id=p_booking_id;
 insert into public.notifications(recipient_id,title,body,kind,booking_id)
 values(v_b.client_id,case v_status when 'confirmed' then 'Lezione confermata' when 'awaiting_payment' then 'Richiesta approvata: completa il pagamento' when 'quoted' then 'Preventivo ricevuto' else 'Richiesta rifiutata' end,
  case v_status when 'confirmed' then 'La tua lezione è stata confermata da Ale.' when 'awaiting_payment' then 'Completa il pagamento online per confermare la lezione.' when 'quoted' then 'Ale ha preparato un preventivo per te.' else 'Nessun addebito. Puoi scegliere un altro orario.' end,'booking_update',p_booking_id);
 return v_status;
end; $function$;

CREATE OR REPLACE FUNCTION public.coach_set_booking_method(p_booking_id uuid, p_mode text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_b public.bookings%rowtype;
begin
 if not private.is_coach() then raise exception 'Operazione riservata al coach'; end if;
 select * into v_b from public.bookings where id=p_booking_id for update;
 if not found or v_b.status<>'pending' or v_b.payment_mode not in ('online','in_person') then raise exception 'Richiesta non modificabile'; end if;
 if p_mode not in ('online','in_person') then raise exception 'Modalità non valida'; end if;
 if v_b.payment_mode='online' or p_mode='online' then raise exception 'Il pagamento online richiede preautorizzazione Stripe del cliente'; end if;
 if p_mode='in_person' and not exists(select 1 from public.profiles where id=v_b.client_id and allow_in_person) then
  raise exception 'Abilita prima il pagamento in presenza per questo cliente';
 end if;
 update public.bookings set payment_mode=p_mode where id=p_booking_id;
end; $function$;

CREATE OR REPLACE FUNCTION public.cancel_unpaid_booking(p_booking_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_b public.bookings%rowtype;
begin
 select * into v_b from public.bookings where id=p_booking_id for update;
 if not found or (v_b.client_id<>auth.uid() and not private.is_coach()) then raise exception 'Operazione non autorizzata'; end if;
 if v_b.payment_mode='online' then raise exception 'Per annullare richieste online usa il server Stripe'; end if;
 if v_b.starts_at is null or v_b.starts_at<now()+interval '24 hours' then raise exception 'Disdetta online non disponibile nelle 24 ore precedenti'; end if;
 if v_b.status not in ('confirmed','awaiting_payment','pending') then raise exception 'Stato non cancellabile'; end if;
 if v_b.payment_mode='online' and v_b.payment_status='paid' then raise exception 'Per il rimborso usare la funzione server'; end if;
 update public.bookings set status='cancelled',cancelled_at=now(),payment_status=case when v_b.payment_mode='credit' then 'refunded' else 'unpaid' end where id=p_booking_id;
 if v_b.credit_wallet_id is not null then update public.wallet_credits set remaining=remaining+1 where id=v_b.credit_wallet_id; end if;
 insert into public.notifications(recipient_id,title,body,kind,booking_id) values(v_b.client_id,'Lezione disdetta','La prenotazione è stata cancellata.','booking_cancelled',p_booking_id);
end; $function$;

CREATE OR REPLACE FUNCTION public.expire_stale_bookings()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare n integer:=0; v_record record;
begin
 for v_record in
  update public.bookings set status='expired'
  where status in ('authorizing','pending','awaiting_payment','quoted') and expires_at<now()
    and not (payment_mode='online' and payment_status='authorized')
  returning credit_wallet_id,client_id,id
 loop
  n:=n+1;
  if v_record.credit_wallet_id is not null then
   update public.wallet_credits set remaining=remaining+1 where id=v_record.credit_wallet_id;
  end if;
  insert into public.notifications(recipient_id,title,body,kind,booking_id)
  values(v_record.client_id,'Richiesta scaduta',
    'Il termine per la conferma o il pagamento è scaduto.','booking_expired',v_record.id);
 end loop;
 return n;
end;
$function$;


-- Solo webhook autenticato con service_role tras aver verificato una
-- Checkout Session firmata e un PaymentIntent in requires_capture.
create or replace function public.finalize_booking_authorization(
 p_booking_id uuid,p_session_id text,p_intent_id text,p_capture_before timestamptz default null)
 returns boolean language plpgsql security definer set search_path='' as $body$
declare b public.bookings%rowtype; v_expiry timestamptz;
begin
 select * into b from public.bookings where id=p_booking_id for update;
 if not found or b.payment_mode<>'online' or b.stripe_checkout_session_id is distinct from p_session_id then
  raise exception 'Checkout non riconciliabile'; end if;
 if b.status='pending' and b.payment_status='authorized' and b.stripe_payment_intent_id=p_intent_id then return false; end if;
 if b.status<>'authorizing' or b.expires_at<=now() then raise exception 'Checkout non piu valido'; end if;
 v_expiry:=least(now()+interval '24 hours',coalesce(p_capture_before-interval '60 minutes',now()+interval '24 hours'));
 if v_expiry<=now()+interval '5 minutes' then raise exception 'Autorizzazione troppo vicina alla scadenza'; end if;
 update public.bookings set status='pending',payment_status='authorized',stripe_payment_intent_id=p_intent_id,
  stripe_authorized_at=now(),stripe_authorization_expires_at=p_capture_before,expires_at=v_expiry
 where id=p_booking_id;
 insert into public.notifications(recipient_id,title,body,kind,booking_id)
 select id,'Nuova richiesta preautorizzata','Una lezione e stata autorizzata su Stripe: approva o rifiuta entro 24 ore.',
   'booking_created',p_booking_id from public.profiles where role='coach';
 return true;
end;
$body$;
revoke all on function public.finalize_booking_authorization(uuid,text,text,timestamptz) from public,anon,authenticated;
grant execute on function public.finalize_booking_authorization(uuid,text,text,timestamptz) to service_role;

-- Il client/coach reclama l'azione con JWT, preservando il controllo di ruolo
-- nel database; Stripe e DB saranno aggiornati solo dalla Edge Function.
create or replace function public.claim_booking_decision(p_booking_id uuid,p_action text)
 returns text language plpgsql security definer set search_path='' as $body$
declare b public.bookings%rowtype;
begin
 if not private.is_coach() then raise exception 'Operazione riservata al coach'; end if;
 if p_action not in ('approve','reject') then raise exception 'Azione non valida'; end if;
 perform pg_catalog.pg_advisory_xact_lock(7684321001);
 select * into b from public.bookings where id=p_booking_id for update;
 if not found or b.payment_mode<>'online' or b.stripe_payment_intent_id is null then raise exception 'Carta non autorizzata'; end if;
 if b.status='processing' and b.stripe_decision=p_action then return 'processing'; end if;
 if b.status not in ('pending') or b.payment_status<>'authorized' or b.expires_at<=now() then
  raise exception 'Richiesta non autorizzata o scaduta'; end if;
 if p_action='approve' then
  if not exists(select 1 from public.google_calendar_sync where id=1 and status='connected'
    and last_success_at>now()-interval '15 minutes') then
   raise exception 'Google Calendar non sincronizzato: nessun incasso'; end if;
  if not private.coach_slot_is_free(b.starts_at,b.duration_minutes,b.venue_id,b.id)
     or exists(select 1 from public.calendar_closures where is_active
       and (b.starts_at at time zone 'Europe/Rome')::date between start_date and end_date)
  then raise exception 'Conflitto calendario: nessun incasso'; end if;
 end if;
 update public.bookings set status='processing',stripe_decision=p_action where id=p_booking_id;
 return 'processing';
end;$body$;
revoke all on function public.claim_booking_decision(uuid,text) from public,anon;
grant execute on function public.claim_booking_decision(uuid,text) to authenticated;

create or replace function public.claim_booking_cancellation(p_booking_id uuid)
 returns text language plpgsql security definer set search_path='' as $body$
declare b public.bookings%rowtype;
begin
 select * into b from public.bookings where id=p_booking_id for update;
 if not found or b.client_id is distinct from auth.uid() then raise exception 'Non autorizzato'; end if;
 if b.payment_mode<>'online' then raise exception 'Metodo non valido'; end if;
 if b.status='processing' and b.stripe_decision='cancel' then return 'processing'; end if;
 if b.status not in ('authorizing','pending') or
    (b.status='pending' and b.payment_status not in ('unpaid','authorized')) then
   raise exception 'Richiesta non cancellabile'; end if;
 update public.bookings set status='processing',stripe_decision='cancel' where id=p_booking_id;
 return 'processing';
end;$body$;
revoke all on function public.claim_booking_cancellation(uuid) from public,anon;
grant execute on function public.claim_booking_cancellation(uuid) to authenticated;

-- Solo la Edge Function con service_role conclude l'operazione dopo
-- aver ricevuto l'esito Stripe. Protegge da doppio click/eventi ripetuti.
create or replace function public.complete_booking_decision(
 p_booking_id uuid,p_action text,p_intent_id text)
 returns boolean language plpgsql security definer set search_path='' as $body$
declare b public.bookings%rowtype; v_status text;
begin
 select * into b from public.bookings where id=p_booking_id for update;
 if not found then raise exception 'Prenotazione mancante'; end if;
 v_status:=case p_action when 'approve' then 'confirmed'
   when 'reject' then 'rejected' when 'cancel' then 'cancelled' else null end;
 if v_status is null then raise exception 'Azione non valida'; end if;
 if b.status=v_status and b.stripe_payment_intent_id is not distinct from p_intent_id then return false; end if;
 if b.status<>'processing' or b.stripe_decision<>p_action or
    b.stripe_payment_intent_id is distinct from p_intent_id then
  raise exception 'Operazione Stripe non riconciliabile'; end if;
 if p_action='approve' then
  update public.bookings set status='confirmed',payment_status='paid',
   approved_at=now(),paid_at=now() where id=p_booking_id;
 else
  update public.bookings set status=v_status,payment_status='unpaid',
   cancelled_at=case when p_action='cancel' then now() else cancelled_at end
   where id=p_booking_id;
 end if;
 insert into public.notifications(recipient_id,title,body,kind,booking_id)
 values(b.client_id,
  case p_action when 'approve' then 'Lezione confermata e pagata'
    when 'reject' then 'Richiesta rifiutata' else 'Prenotazione annullata' end,
  case p_action when 'approve' then 'Il coach ha approvato. Pagamento incassato.'
    else 'Autorizzazione della carta annullata senza addebito.' end,
  'booking_update',b.id);
 return true;
end;$body$;
revoke all on function public.complete_booking_decision(uuid,text,text) from public,anon,authenticated;
grant execute on function public.complete_booking_decision(uuid,text,text) to service_role;
