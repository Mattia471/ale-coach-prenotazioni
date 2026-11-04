-- Ale Coach v2 (4 novembre 2026). Migrazione incrementale, preserva ordini e prezzi storici.
-- Fonte: specifica Calendario e listino v2. Google Calendar NON e' connesso da questa migrazione.
-- Cambi commerciali effettivi solo per nuovi acquisti/prenotazioni.

update public.services set
 name=case id when 'single' then 'Lezione individuale' when 'couple' then 'Personal Duo' when 'start' then 'Valutazione iniziale' else name end,
 price_cents=case id when 'single' then 5500 when 'couple' then 8000 when 'check' then 3500 when 'start' then 5000 else price_cents end,
 description=case id
  when 'single' then '60 minuti personalizzati: tecnica, forza, condizionamento, mobilità o abilità specifiche.'
  when 'couple' then '60 minuti in due, 40 € a persona. Un referente prenota e paga l’intera sessione.'
  when 'check' then '30 minuti per rivedere una scheda esistente. Non include la creazione di una nuova scheda completa.'
  when 'start' then '45 minuti di valutazione motoria e indicazioni iniziali; lezioni e scheda completa sono separate.'
  when 'intro' then 'Primo contatto di 15 minuti gratuito, senza obbligo di acquisto.'
  when 'other' then 'Piccoli gruppi, eventi o progetti specifici: preventivo prima dell’acquisto.'
  else description end
where id in ('single','couple','check','start','intro','other');

alter table public.packages add column if not exists validity_months integer;
alter table public.packages add column if not exists minimum_months integer not null default 1;
alter table public.packages add constraint packages_validity_months_positive check(validity_months is null or validity_months > 0);
update public.packages set name=case id when 'five' then 'Flex 5' when 'ten' then 'Flex 10' when 'monthly4' then 'Continuity 4' when 'monthly8' then 'Continuity 8' else name end,
 price_cents=case id when 'five' then 25000 when 'ten' then 45000 when 'monthly4' then 15000 when 'monthly8' then 26000 else price_cents end,
 validity_months=case id when 'five' then 3 when 'ten' then 6 else 1 end,
 minimum_months=case when type='subscription' then 2 else 1 end,
 description=case id
 when 'five' then '5 individuali da 60 min · 50 € a lezione · 3 mesi, senza rinnovo.'
 when 'ten' then '10 individuali da 60 min · 45 € a lezione · 6 mesi, senza rinnovo.'
 when 'monthly4' then '4 individuali per mese · impegno iniziale 2 mesi, 300 € totali. Rinnovo nella data di attivazione.'
 when 'monthly8' then '8 individuali per mese · impegno iniziale 2 mesi, 520 € totali. Rinnovo nella data di attivazione.'
 else description end
where id in ('five','ten','monthly4','monthly8');

update public.discount_codes set active=false where code='ALECOACH10';
insert into public.discount_codes(code,percent_off,active,first_purchase_only,valid_days_from_contact)
values ('ALECOACH15',15,true,true,null),('AMICO10',10,false,true,null)
on conflict(code) do update set
 percent_off=excluded.percent_off, active=excluded.active,
 first_purchase_only=excluded.first_purchase_only,valid_days_from_contact=excluded.valid_days_from_contact;

-- Lo storico di acquisti/bookings precedenti resta invariato. Per i nuovi Flex
-- la scadenza usa mesi di calendario (non giorni fissi 90/180).
create or replace function public.settle_package_checkout_order(p_order_id uuid,p_session_id text)
returns boolean language plpgsql security definer set search_path = '' as $settle$
declare v_order public.package_checkout_orders%rowtype; v_pack public.packages%rowtype;
begin
 select * into v_order from public.package_checkout_orders where id=p_order_id for update;
 if not found or v_order.stripe_session_id is distinct from p_session_id then
  raise exception 'Ordine non valido';
 end if;
 if v_order.status='paid' then return false; end if;
 if v_order.status<>'pending' then raise exception 'Ordine scaduto'; end if;
 select * into v_pack from public.packages where id=v_order.package_id and type='pack';
 if not found then raise exception 'Pacchetto mancante'; end if;
 insert into public.wallet_credits(client_id,package_id,remaining,expires_at,stripe_session_id)
 values(v_order.client_id,v_order.package_id,v_pack.credits,
  now() + case when v_pack.validity_months is not null
    then make_interval(months=>v_pack.validity_months)
    else make_interval(days=>v_pack.validity_days) end,
  p_session_id);
 update public.package_checkout_orders set status='paid',paid_at=now() where id=p_order_id;
 insert into public.notifications(recipient_id,title,body,kind)
 values(v_order.client_id,'Pacchetto attivo',v_pack.name||': '||v_pack.credits||' lezioni disponibili.','package_paid');
 return true;
end;
$settle$;
revoke all on function public.settle_package_checkout_order(uuid,text) from public,anon,authenticated;
grant execute on function public.settle_package_checkout_order(uuid,text) to service_role;

-- Fasce di disponibilita' proposte: piu' intervalli per giorno e sede.
create table public.availability_windows (
 id bigint generated always as identity primary key,
 weekday smallint not null check(weekday between 1 and 7),
 venue_id text not null references public.venues(id),
 start_minute smallint not null check(start_minute between 0 and 1439),
 end_minute smallint not null check(end_minute between 1 and 1440),
 is_flexible boolean not null default false,
 is_active boolean not null default true,
 check(end_minute > start_minute),
 unique(weekday,venue_id,start_minute,end_minute)
);
insert into public.availability_windows(weekday,venue_id,start_minute,end_minute) values
 (1,'nuovo_salario',540,780),(1,'talenti',840,1260),
 (2,'talenti',450,840),(2,'nuovo_salario',960,1260),
 (3,'nuovo_salario',540,870),(3,'nuovo_salario',960,1260),
 (4,'nuovo_salario',450,840),(4,'talenti',930,1260),
 (5,'nuovo_salario',480,1080),(6,'nuovo_salario',510,840);

-- Chiusure proposte, inizialmente prudenzialmente attive, da verificare nel pannello coach.
create table public.calendar_closures (
 id bigint generated always as identity primary key,
 start_date date not null, end_date date not null,
 reason text not null, is_active boolean not null default true,
 review_status text not null default 'proposed' check(review_status in ('proposed','confirmed')),
 check(end_date >= start_date)
);
insert into public.calendar_closures(start_date,end_date,reason,is_active,review_status) values
 ('2026-11-11','2026-11-13','Trasferta (da confermare)',true,'proposed'),
 ('2026-11-21','2026-11-22','Formazione LIFT (da confermare)',true,'proposed');

-- Corsi confermati nel documento per 19/10-30/11, non ricorrenze inventate dopo quella data.
create table public.calendar_course_blocks (
 id bigint generated always as identity primary key,
 title text not null,
 venue_id text references public.venues(id), -- null = globalmente occupato, sede da classificare
 weekday smallint check(weekday between 1 and 7),
 on_date date,
 valid_from date not null default '2026-10-19',
 valid_until date not null default '2026-11-30',
 start_minute smallint not null check(start_minute between 0 and 1439),
 end_minute smallint not null check(end_minute between 1 and 1440),
 before_minutes integer not null default 15 check(before_minutes>=0),
 after_minutes integer not null default 10 check(after_minutes>=0),
 is_active boolean not null default true,
 needs_review boolean not null default false,
 source_ref text,
 check(end_minute>start_minute),
 check ((weekday is null) <> (on_date is null))
);
insert into public.calendar_course_blocks(title,venue_id,weekday,on_date,start_minute,end_minute) values
 ('GRID','talenti',1,null,1050,1095),('HYROX','talenti',1,null,1215,1260),
 ('Cross Active WOD','talenti',2,null,600,645),
 ('Calisthenics Performance','talenti',2,null,780,840),
 ('GRID','nuovo_salario',3,null,810,855),
 ('HYROX','talenti',4,null,1125,1170),
 ('Calisthenics Floor','nuovo_salario',5,null,795,840),
 ('GRID','nuovo_salario',6,null,645,690),
 ('HYROX','nuovo_salario',6,null,705,750);
insert into public.calendar_course_blocks
 (title,venue_id,weekday,on_date,start_minute,end_minute,needs_review) values
 ('HYROX · evento extra','talenti',null,'2026-11-06',1140,1200,false),
 -- Il documento specifica solo l'inizio TRX: finestra prudenziale temporanea, non durata verificata.
 ('TRX · durata/sede da confermare',null,null,'2026-11-16',975,1035,true);

-- Google Calendar: non attivare sync implicitamente senza OAuth e credenziali del coach.
create table public.google_calendar_sync (
 id integer primary key default 1 check (id=1),
 status text not null default 'not_connected'
   check(status in ('not_connected','connected','syncing','error')),
 last_success_at timestamptz,
 last_error text,
 updated_at timestamptz not null default now()
);
insert into public.google_calendar_sync(id) values (1);
create table public.external_calendar_events (
 id bigint generated always as identity primary key,
 calendar_id text not null, original_event_id text not null,
 original_recurring_id text,
 venue_id text references public.venues(id),
 starts_at timestamptz not null, ends_at timestamptz not null,
 is_course boolean not null default false, blocks_booking boolean not null default true,
 needs_review boolean not null default true,
 cancelled boolean not null default false,
 updated_at timestamptz not null default now(),
 check(ends_at>starts_at),unique(calendar_id,original_event_id)
);
create index external_calendar_time_idx on public.external_calendar_events(starts_at,ends_at)
 where blocks_booking and not cancelled;

alter table public.availability_windows enable row level security;
alter table public.calendar_closures enable row level security;
alter table public.calendar_course_blocks enable row level security;
alter table public.google_calendar_sync enable row level security;
alter table public.external_calendar_events enable row level security;
create policy availability_public_read on public.availability_windows for select to anon,authenticated using(true);
create policy availability_coach_manage on public.availability_windows for all to authenticated
 using((select private.is_coach())) with check((select private.is_coach()));
create policy closures_coach_manage on public.calendar_closures for all to authenticated
 using((select private.is_coach())) with check((select private.is_coach()));
create policy course_blocks_coach_manage on public.calendar_course_blocks for all to authenticated
 using((select private.is_coach())) with check((select private.is_coach()));
create policy sync_coach_read on public.google_calendar_sync for select to authenticated using((select private.is_coach()));
create policy external_coach_read on public.external_calendar_events for select to authenticated using((select private.is_coach()));
-- Sync scrive solo con service_role: i clienti non possono manipolare eventi esterni.
grant select on public.availability_windows to anon,authenticated;
grant insert,update,delete on public.availability_windows,public.calendar_closures,public.calendar_course_blocks to authenticated;
grant select on public.calendar_closures,public.calendar_course_blocks,public.google_calendar_sync,public.external_calendar_events to authenticated;
grant select,insert,update,delete on public.external_calendar_events,public.google_calendar_sync to service_role;
grant usage,select on sequence public.availability_windows_id_seq,public.calendar_closures_id_seq,public.calendar_course_blocks_id_seq to authenticated;

-- Disponibilita' unica per coach: tutti i calendari e club bloccano la stessa risorsa.
-- Ogni candidato include i 10 minuti di margine PT. I corsi hanno 15' prima, 10' dopo.
create or replace function private.coach_slot_is_free(
 p_start timestamptz,p_duration integer,p_venue text,p_ignore_booking uuid default null)
returns boolean language sql stable security definer set search_path='' as $free$
select p_start is not null and p_venue is not null and p_duration>0
and not exists(
 select 1 from public.bookings b
 where b.id is distinct from p_ignore_booking
 and b.status in ('pending','awaiting_payment','confirmed')
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
$free$;
revoke all on function private.coach_slot_is_free(timestamptz,integer,text,uuid) from public,anon,authenticated;

-- Unica fonte di disponibilita' a griglia 15': valida per tutte le sedi.
create or replace function public.available_slots_v2(p_service_id text,p_day date,p_venue_preference text default 'indifferente')
returns table(start_minute integer,venue_id text) language plpgsql stable security definer set search_path='' as $slots$
declare v_service public.services%rowtype;v_window public.availability_windows%rowtype;v_min integer;v_start timestamptz;
begin
 select * into v_service from public.services where id=p_service_id and active and kind<>'quote';
 if not found or p_day is null or p_venue_preference not in ('talenti','nuovo_salario','indifferente') then return; end if;
 if (p_day::timestamp at time zone 'Europe/Rome') < now()+interval '12 hours'
    or (p_day::timestamp at time zone 'Europe/Rome') > now()+interval '42 days' then return; end if;
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
   if private.coach_slot_is_free(v_start,v_service.duration_minutes,v_window.venue_id,null) then
    start_minute:=v_min;venue_id:=v_window.venue_id;return next;
   end if;
  end loop;
 end loop;
end;
$slots$;
revoke all on function public.available_slots_v2(text,date,text) from public;
grant execute on function public.available_slots_v2(text,date,text) to anon,authenticated;

-- Il vecchio endpoint a ore piene non conosce i margini v2: disabilitato.
revoke execute on function public.available_slots(text,date) from anon,authenticated;
revoke execute on function public.create_booking(text,text,date,integer,jsonb,text,text,text,text) from authenticated;

-- Il nuovo RPC accetta minuti interi (multipli di 15). Un advisory lock serializza
-- richieste simultanee per la singola risorsa, anche quando 2 sedi richiedono viaggio.
create or replace function public.create_booking_v2(
 p_service_id text,p_venue_id text,p_day date,p_start_minute integer,
 p_details jsonb default '{}'::jsonb,p_payment_mode text default 'online',
 p_code text default null,p_source text default 'direct',p_referral text default null
) returns uuid language plpgsql security definer set search_path='' as $book$
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
         status in ('pending','awaiting_payment') and discount_percent>0)) then
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
 insert into public.bookings(client_id,service_id,venue_id,starts_at,duration_minutes,
  base_amount_cents,amount_cents,discount_percent,promo_code,payment_mode,credit_wallet_id,
  details,source,referral,expires_at)
 values(v_uid,p_service_id,v_venue,v_start,v_service.duration_minutes,
  v_service.price_cents,round(v_service.price_cents*(100-v_discount)/100.0)::integer,
  v_discount,case when v_discount>0 then upper(trim(p_code)) else null end,
  v_mode,v_wallet,p_details,left(coalesce(p_source,'direct'),64),
  left(coalesce(p_referral,''),100),least(now()+interval '24 hours',
    coalesce(v_start-interval '2 hours',now()+interval '24 hours')))
 returning id into v_id;
 insert into public.notifications(recipient_id,title,body,kind,booking_id)
 select id,'Nuova richiesta',v_profile.full_name||' ha chiesto una lezione.','booking_created',v_id
 from public.profiles where role='coach';
 return v_id;
exception when exclusion_violation or unique_violation then
 raise exception 'Questo orario o la promozione sono già riservati';
end;
$book$;
revoke all on function public.create_booking_v2(text,text,date,integer,jsonb,text,text,text,text) from public;
grant execute on function public.create_booking_v2(text,text,date,integer,jsonb,text,text,text,text) to authenticated;

-- Le conferme vengono sempre ricontrollate. L'assenza di sincronizzazione Google
-- viene esposta al coach; non inviare conferme automatiche su calendar stale.
create or replace function private.revalidate_booking_on_confirm()
returns trigger language plpgsql set search_path='' as $recheck$
begin
 if new.status='confirmed' and old.status is distinct from new.status and new.starts_at is not null then
  perform pg_catalog.pg_advisory_xact_lock(7684321001);
  if not private.coach_slot_is_free(new.starts_at,new.duration_minutes,new.venue_id,new.id) then
    raise exception 'Conflitto calendario: impossibile confermare senza risoluzione';
  end if;
  if exists(select 1 from public.calendar_closures
      where is_active and (new.starts_at at time zone 'Europe/Rome')::date between start_date and end_date) then
    raise exception 'Giornata chiusa: impossibile confermare';
  end if;
 end if;
 return new;
end;
$recheck$;
create trigger bookings_revalidate_on_confirm before update of status on public.bookings
for each row execute function private.revalidate_booking_on_confirm();

-- La cronologia v2 dei prezzi storici resta nei campi amount_cents e base_amount_cents.
comment on table public.external_calendar_events is
 'Solo dati degli eventi Google effettivamente sincronizzati. La migrazione NON connette Google.';
