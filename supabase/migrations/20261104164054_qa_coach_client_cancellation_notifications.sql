-- Notifica il coach quando il cliente annulla una prenotazione via RPC o Stripe.
-- Nessuna modifica ai pagamenti e nessun backfill delle disdette pregresse.
create or replace function private.notify_coach_of_client_cancellation()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := (select auth.uid());
begin
  if new.status <> 'cancelled' or old.status = 'cancelled' then
    return new;
  end if;
  if v_actor is not null and v_actor <> new.client_id then
    return new;
  end if;
  insert into public.notifications (recipient_id, title, body, kind, booking_id)
  select p.id, 'Prenotazione annullata',
    'Un cliente ha annullato una prenotazione. Consulta lo storico per i dettagli.',
    'booking_cancelled', new.id
  from public.profiles p
  where p.role = 'coach'
    and not exists (
      select 1 from public.notifications n
      where n.booking_id = new.id
        and n.recipient_id = p.id
        and n.kind = 'booking_cancelled'
    );
  return new;
end;
$$;
revoke all on function private.notify_coach_of_client_cancellation() from public, anon, authenticated;
drop trigger if exists bookings_notify_coach_client_cancel on public.bookings;
create trigger bookings_notify_coach_client_cancel
after update of status on public.bookings
for each row when (old.status is distinct from new.status and new.status = 'cancelled')
execute function private.notify_coach_of_client_cancellation();
