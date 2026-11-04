-- ALE COACH: release base con agenda interna, senza Google Calendar.
-- Google resta una integrazione opzionale, da sviluppare su preventivo separato.
-- Il database conserva la protezione anti-conflitto per prenotazioni, corsi,
-- trasferimenti e chiusure. Non tocca incassi, autorizzazioni o eventi esistenti.

create or replace function public.claim_booking_decision(p_booking_id uuid,p_action text)
returns text language plpgsql security definer set search_path='' as $body$
declare b public.bookings%rowtype;
begin
 if not private.is_coach() then raise exception 'Operazione riservata al coach'; end if;
 if p_action not in ('approve','reject') then raise exception 'Azione non valida'; end if;
 perform pg_catalog.pg_advisory_xact_lock(7684321001);
 select * into b from public.bookings where id=p_booking_id for update;
 if not found or b.payment_mode<>'online' or b.stripe_payment_intent_id is null then
  raise exception 'Carta non autorizzata'; end if;
 if b.status='processing' and b.stripe_decision=p_action then return 'processing'; end if;
 if b.status not in ('pending') or b.payment_status<>'authorized' or b.expires_at<=now() then
  raise exception 'Richiesta non autorizzata o scaduta'; end if;
 if p_action='approve' then
  if not private.coach_slot_is_free(b.starts_at,b.duration_minutes,b.venue_id,b.id)
     or exists(select 1 from public.calendar_closures where is_active
       and (b.starts_at at time zone 'Europe/Rome')::date between start_date and end_date)
  then raise exception 'Conflitto agenda interna: nessun incasso'; end if;
 end if;
 update public.bookings set status='processing',stripe_decision=p_action where id=p_booking_id;
 return 'processing';
end;
$body$;
revoke all on function public.claim_booking_decision(uuid,text) from public,anon;
grant execute on function public.claim_booking_decision(uuid,text) to authenticated;

create or replace function private.revalidate_booking_on_confirm()
returns trigger language plpgsql set search_path='' as $body$
begin
 if new.status in ('awaiting_payment','confirmed') and old.status is distinct from new.status
   and new.starts_at is not null then
  perform pg_catalog.pg_advisory_xact_lock(7684321001);
  if not private.coach_slot_is_free(new.starts_at,new.duration_minutes,new.venue_id,new.id)
  then raise exception 'Conflitto agenda interna: impossibile confermare'; end if;
  if exists(select 1 from public.calendar_closures
     where is_active and (new.starts_at at time zone 'Europe/Rome')::date between start_date and end_date)
  then raise exception 'Giornata chiusa: impossibile confermare'; end if;
 end if;
 return new;
end;
$body$;

comment on function public.claim_booking_decision(uuid,text)
is 'Solo coach autenticato: controlla preautorizzazione Stripe e slot interno prima di approvare o rifiutare. Nessuna dipendenza da Google Calendar.';
