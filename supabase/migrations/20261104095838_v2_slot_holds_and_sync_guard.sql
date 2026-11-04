-- Ale Coach v2: hold tecnico 10 minuti e guardia sincronizzazione Google.
-- Fail closed: il coach non approva richieste con Google Calendar non aggiornato.
create table public.slot_holds (
 id uuid primary key default gen_random_uuid(),
 client_id uuid not null references public.profiles(id) on delete cascade,
 venue_id text not null references public.venues(id),
 service_id text not null references public.services(id),
 starts_at timestamptz not null, ends_at timestamptz not null,
 expires_at timestamptz not null default(now()+interval '10 minutes'),
 created_at timestamptz not null default now(),
 check(ends_at>starts_at)
);
create unique index slot_holds_one_per_client on public.slot_holds(client_id);
create index slot_holds_expires on public.slot_holds(expires_at);
create index slot_holds_time on public.slot_holds(starts_at,ends_at);
alter table public.slot_holds enable row level security;
create policy slot_holds_self_read on public.slot_holds for select to authenticated
 using(client_id=(select auth.uid()));
grant select on public.slot_holds to authenticated;
-- Nessuna scrittura client diretta: solo le RPC idempotenti sotto lock.

-- Frontend pubblico non deve vedere titoli o dati degli impegni: ritorna solo slot.
-- Il controllo esclude i hold dei concorrenti, ma consente di prenotare il proprio hold.
create or replace function public.available_slots_v2(p_service_id text,p_day date,p_venue_preference text default 'indifferente')
returns table(start_minute integer,venue_id text) language plpgsql stable security definer set search_path='' as $slots$
declare v_service public.services%rowtype;v_window public.availability_windows%rowtype;v_min integer;v_start timestamptz;
begin
 select * into v_service from public.services where id=p_service_id and active and kind<>'quote';
 if not found or p_day is null or p_venue_preference not in ('talenti','nuovo_salario','indifferente') then return; end if;
 if (p_day::timestamp at time zone 'Europe/Rome') > now()+interval '43 days' then return; end if;
 if exists(select 1 from public.calendar_closures where is_active and p_day between start_date and end_date) then return; end if;
 for v_window in select * from public.availability_windows
   where weekday=extract(isodow from p_day)::integer and is_active
    and (p_venue_preference='indifferente' or venue_id=p_venue_preference)
   order by start_minute,venue_id
 loop
  for v_min in select generate_series(v_window.start_minute,
    v_window.end_minute-v_service.duration_minutes,15)
  loop
   v_start:=(p_day::text||' '||lpad((v_min/60)::text,2,'0')||':'||
    lpad((v_min%60)::text,2,'0'))::timestamp at time zone 'Europe/Rome';
   if v_start < now()+interval '12 hours' or v_start > now()+interval '42 days' then continue; end if;
   if private.coach_slot_is_free(v_start,v_service.duration_minutes,v_window.venue_id,null)
     and not exists(
      select 1 from public.slot_holds sh
      where sh.expires_at>now() and sh.client_id is distinct from auth.uid()
       and tstzrange(sh.starts_at -
         case when sh.venue_id is distinct from v_window.venue_id then interval '45 minutes' else interval '0' end,
         sh.ends_at+interval '10 minutes'+
         case when sh.venue_id is distinct from v_window.venue_id then interval '45 minutes' else interval '0' end,'[)')
       && tstzrange(v_start,v_start+make_interval(mins=>v_service.duration_minutes+10),'[)')
     )
   then start_minute:=v_min;venue_id:=v_window.venue_id;return next; end if;
  end loop;
 end loop;
end;
$slots$;
revoke all on function public.available_slots_v2(text,date,text) from public;
grant execute on function public.available_slots_v2(text,date,text) to anon,authenticated;

create or replace function public.reserve_slot_v2(
 p_service_id text,p_day date,p_start_minute integer,p_venue_id text)
returns timestamptz language plpgsql security definer set search_path='' as $hold$
declare v_client uuid:=auth.uid();v_service public.services%rowtype;v_start timestamptz;v_expires timestamptz:=now()+interval '10 minutes';
begin
 if v_client is null then raise exception 'Accedi per riservare uno slot'; end if;
 perform pg_catalog.pg_advisory_xact_lock(7684321001);
 select * into v_service from public.services where id=p_service_id and active and kind<>'quote';
 if not found or p_start_minute is null or p_start_minute%15<>0 then raise exception 'Servizio o orario non valido'; end if;
 -- La stessa persona può tenere un solo hold attivo; cambiare selezione libera il precedente.
 delete from public.slot_holds where client_id=v_client or expires_at<now();
 if not exists(select 1 from public.available_slots_v2(p_service_id,p_day,p_venue_id)
   where start_minute=p_start_minute and venue_id=p_venue_id) then
  raise exception 'Questo slot non è più disponibile'; end if;
 v_start:=(p_day::text||' '||lpad((p_start_minute/60)::text,2,'0')||':'||
  lpad((p_start_minute%60)::text,2,'0'))::timestamp at time zone 'Europe/Rome';
 insert into public.slot_holds(client_id,venue_id,service_id,starts_at,ends_at,expires_at)
 values(v_client,p_venue_id,p_service_id,v_start,
  v_start+make_interval(mins=>v_service.duration_minutes),v_expires);
 return v_expires;
end;
$hold$;
revoke all on function public.reserve_slot_v2(text,date,integer,text) from public;
grant execute on function public.reserve_slot_v2(text,date,integer,text) to authenticated;

create or replace function public.release_slot_hold_v2()
returns void language sql security definer set search_path='' as $release$
 delete from public.slot_holds where client_id=auth.uid();
$release$;
revoke all on function public.release_slot_hold_v2() from public;
grant execute on function public.release_slot_hold_v2() to authenticated;

-- Dopo la richiesta definitiva il hold e' superfluo (la prenotazione protegge lo slot).
create or replace function private.clear_slot_hold_on_booking()
returns trigger language plpgsql set search_path='' as $clear$
begin
 delete from public.slot_holds where client_id=new.client_id;
 return new;
end;
$clear$;
create trigger bookings_clear_hold_after_insert after insert on public.bookings
for each row execute function private.clear_slot_hold_on_booking();

-- Conferme con disponibilita' obsoleta non consentite. Nessun pagamento deve
-- essere chiesto finche' il coach non vede il calendario Google aggiornato.
create or replace function private.revalidate_booking_on_confirm()
returns trigger language plpgsql set search_path='' as $recheck$
begin
 if new.status in ('awaiting_payment','confirmed') and old.status is distinct from new.status
   and new.starts_at is not null then
  perform pg_catalog.pg_advisory_xact_lock(7684321001);
  if not exists(
    select 1 from public.google_calendar_sync
    where id=1 and status='connected' and last_success_at>now()-interval '15 minutes'
  ) then raise exception 'Google Calendar non aggiornato: sincronizza prima di confermare'; end if;
  if not private.coach_slot_is_free(new.starts_at,new.duration_minutes,new.venue_id,new.id)
  then raise exception 'Conflitto calendario: impossibile confermare'; end if;
  if exists(select 1 from public.calendar_closures
     where is_active and (new.starts_at at time zone 'Europe/Rome')::date between start_date and end_date)
  then raise exception 'Giornata chiusa: impossibile confermare'; end if;
 end if;
 return new;
end;
$recheck$;
