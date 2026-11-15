-- V1 P0 integrity fix: paid in-person cancellation must not erase a recorded payment.
-- Isolated regression test required. No existing booking, wallet or payment data changed.
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
$function$;

-- CREATE OR REPLACE retains the existing owner/ACL; it must not grant execute to anon.
