-- Fail closed when the authenticated JWT has no usable user id.
-- Preserves existing coach/owner semantics, non-online restriction, 24h window,
-- credit return and cancellation notifications. No data migration.
-- Run through the reviewed migration pipeline only after staging QA.
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
 if v_b.starts_at is null or v_b.starts_at<now()+interval '24 hours' then raise exception 'Disdetta online non disponibile nelle 24 ore precedenti'; end if;
 if v_b.status not in ('confirmed','awaiting_payment','pending') then raise exception 'Stato non cancellabile'; end if;
 if v_b.payment_mode='online' and v_b.payment_status='paid' then raise exception 'Per il rimborso usare la funzione server'; end if;
 update public.bookings set status='cancelled',cancelled_at=now(),payment_status=case when v_b.payment_mode='credit' then 'refunded' else 'unpaid' end where id=p_booking_id;
 if v_b.credit_wallet_id is not null then update public.wallet_credits set remaining=remaining+1 where id=v_b.credit_wallet_id; end if;
 insert into public.notifications(recipient_id,title,body,kind,booking_id) values(v_b.client_id,'Lezione disdetta','La prenotazione è stata cancellata.','booking_cancelled',p_booking_id);
end;
$function$;

-- CREATE OR REPLACE retains the existing owner/ACL; it must not grant execute to anon.
