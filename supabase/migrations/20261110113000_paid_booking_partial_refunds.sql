-- Release candidate only. Apply after Stripe Sandbox and legal policy are approved.
-- No payment or booking is changed by this migration.
alter table public.bookings
  add column if not exists cancellation_refund_cents integer
    check (cancellation_refund_cents is null or cancellation_refund_cents >= 0),
  add column if not exists cancellation_refund_claimed_at timestamptz,
  add column if not exists stripe_refund_id text,
  add column if not exists stripe_refund_status text;

alter table public.bookings drop constraint if exists bookings_payment_status_check;
alter table public.bookings add constraint bookings_payment_status_check
 check (payment_status in ('unpaid','awaiting','authorized','paid',
  'due_in_person','refunded','refund_pending','refund_failed'));


-- The client may claim a single refund. Every retry receives the *same* amount.
-- Row locking and the stored claim prevent a midnight/24-hour threshold race.
create or replace function public.claim_paid_booking_refund(p_booking_id uuid)
returns integer
language plpgsql security definer
set search_path = ''
as $function$
declare
 b public.bookings%rowtype;
 v_refund integer;
begin
 if auth.uid() is null then raise exception 'Sessione non valida'; end if;
 select * into b from public.bookings where id=p_booking_id for update;
 if not found or b.client_id is distinct from auth.uid() then
  raise exception 'Operazione non autorizzata';
 end if;
 if b.payment_mode <> 'online' or b.status <> 'confirmed' or
    b.payment_status <> 'paid' or b.stripe_payment_intent_id is null then
  raise exception 'Prenotazione non rimborsabile online';
 end if;
 if b.starts_at is null or b.starts_at <= now() then
  raise exception 'La lezione è già iniziata';
 end if;
 if b.cancellation_refund_cents is not null then
  return b.cancellation_refund_cents;
 end if;
 -- At exactly 24h the entire amount is returned.
 -- Inside 24h, round the refund UP to the nearest cent in the client's favour.
 v_refund := case when b.starts_at - now() >= interval '24 hours' then b.amount_cents
                  else (b.amount_cents + 1) / 2 end;
 if v_refund is null or v_refund <= 0 then
  raise exception 'Importo del rimborso non valido';
 end if;
 update public.bookings set cancellation_refund_cents=v_refund,
   cancellation_refund_claimed_at=now() where id=b.id;
 return v_refund;
end;
$function$;

-- Server-only finalisation; idempotent, with the exact Stripe refund ID.
create or replace function public.complete_paid_booking_refund(
 p_booking_id uuid, p_refund_id text, p_refund_amount_cents integer,
 p_refund_status text
) returns boolean
language plpgsql security definer
set search_path = ''
as $function$
declare b public.bookings%rowtype;
begin
 select * into b from public.bookings where id=p_booking_id for update;
 if not found then raise exception 'Prenotazione non trovata'; end if;
 if b.status='cancelled' and b.stripe_refund_id=p_refund_id
    and b.cancellation_refund_cents=p_refund_amount_cents then return false; end if;
 if p_refund_status not in ('succeeded','pending') then
  raise exception 'Stato Stripe non valido per la conferma'; end if;
 if b.status <> 'confirmed' or b.payment_mode <> 'online'
    or b.payment_status <> 'paid' or b.cancellation_refund_cents is distinct from p_refund_amount_cents
    or nullif(trim(coalesce(p_refund_id,'')),'') is null then
  raise exception 'Rimborso da riconciliare manualmente';
 end if;
 update public.bookings
 set status='cancelled',payment_status=case when p_refund_status='succeeded'
       then 'refunded' else 'refund_pending' end,cancelled_at=now(),
     stripe_refund_id=p_refund_id,stripe_refund_status=p_refund_status
 where id=b.id;
 insert into public.notifications(recipient_id,title,body,kind,booking_id)
 values(b.client_id,'Disdetta e rimborso',
  case when p_refund_amount_cents=b.amount_cents
   then 'Prenotazione disdetta. Rimborso totale avviato sul metodo di pagamento originale.'
   else 'Prenotazione disdetta. Rimborso parziale avviato sul metodo di pagamento originale.'
  end,'booking_cancelled',b.id);
 return true;
end;
$function$;

revoke all on function public.claim_paid_booking_refund(uuid) from public,anon;
grant execute on function public.claim_paid_booking_refund(uuid) to authenticated,service_role;
revoke all on function public.complete_paid_booking_refund(uuid,text,integer,text) from public,anon,authenticated;
grant execute on function public.complete_paid_booking_refund(uuid,text,integer,text) to service_role;

-- Stripe refund webhooks may update the final outcome asynchronously.
create or replace function public.reconcile_paid_booking_refund(
 p_booking_id uuid, p_refund_id text, p_refund_status text
) returns boolean
language plpgsql security definer
set search_path = ''
as $function$
declare b public.bookings%rowtype;
begin
 if p_refund_status not in ('pending','succeeded','failed','canceled') then
   raise exception 'Stato rimborso non valido'; end if;
 select * into b from public.bookings where id=p_booking_id for update;
 if not found or b.status<>'cancelled' or b.stripe_refund_id is distinct from p_refund_id then
   raise exception 'Rimborso non riconciliabile'; end if;
 if b.stripe_refund_status=p_refund_status then return false; end if;
 -- Never regress a successful refund if a delayed event arrives.
 if b.stripe_refund_status='succeeded' then return false; end if;
 update public.bookings set stripe_refund_status=p_refund_status,
   payment_status=case when p_refund_status='succeeded' then 'refunded'
     when p_refund_status='pending' then 'refund_pending'
     else 'refund_failed' end where id=b.id;
 if p_refund_status in ('failed','canceled') then
   insert into public.notifications(recipient_id,title,body,kind,booking_id)
   select p.id,'Rimborso da verificare',
      'Un rimborso Stripe non è andato a buon fine. Verifica il pagamento e contatta il cliente.',
      'booking_refund_alert',b.id
   from public.profiles p where p.role='coach';
 end if;
 return true;
end;
$function$;
revoke all on function public.reconcile_paid_booking_refund(uuid,text,text) from public,anon,authenticated;
grant execute on function public.reconcile_paid_booking_refund(uuid,text,text) to service_role;
