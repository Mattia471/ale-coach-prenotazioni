-- Ale Coach: schema per un coach. Migrazione ripetibile solo su progetto nuovo.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null default '',
  role text not null default 'client' check (role in ('client','coach')),
  full_name text not null default '',
  phone text not null default '',
  virgin_member boolean not null default false,
  allow_in_person boolean not null default false,
  first_contact_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create table public.services (
  id text primary key,
  name text not null,
  description text not null default '',
  kind text not null check (kind in ('paid','free','quote')),
  duration_minutes integer not null check (duration_minutes between 15 and 180),
  price_cents integer not null check (price_cents >= 0),
  active boolean not null default true,
  sort_order integer not null default 0
);
create table public.venues (
  id text primary key,
  name text not null,
  subtitle text not null default ''
);
create table public.working_hours (
  weekday integer primary key check (weekday between 1 and 7),
  is_open boolean not null default false,
  start_hour integer not null check (start_hour between 6 and 22),
  end_hour integer not null check (end_hour between 7 and 23),
  check (end_hour > start_hour)
);
create table public.packages (
  id text primary key,
  name text not null,
  type text not null check (type in ('pack','subscription')),
  credits integer not null check (credits > 0),
  price_cents integer not null check (price_cents >= 0),
  validity_days integer not null check (validity_days > 0),
  description text not null default '',
  active boolean not null default true,
  sort_order integer not null default 0
);
create table public.discount_codes (
  code text primary key,
  percent_off integer not null check (percent_off between 1 and 100),
  active boolean not null default true,
  first_purchase_only boolean not null default true,
  valid_days_from_contact integer,
  uses integer not null default 0,
  check (code = upper(code))
);
create table public.wallet_credits (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  package_id text not null references public.packages(id),
  remaining integer not null check (remaining >= 0),
  expires_at timestamptz not null,
  stripe_session_id text unique,
  created_at timestamptz not null default now()
);
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  service_id text not null references public.services(id),
  venue_id text references public.venues(id),
  starts_at timestamptz,
  duration_minutes integer not null check (duration_minutes between 15 and 180),
  status text not null default 'pending' check (status in ('pending','awaiting_payment','confirmed','quoted','rejected','cancelled','expired')),
  payment_mode text not null default 'online' check (payment_mode in ('online','in_person','credit','none')),
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid','awaiting','paid','due_in_person','refunded')),
  base_amount_cents integer not null default 0 check (base_amount_cents >= 0),
  amount_cents integer not null default 0 check (amount_cents >= 0),
  discount_percent integer not null default 0 check (discount_percent between 0 and 100),
  promo_code text,
  details jsonb not null default '{}'::jsonb,
  source text not null default 'direct',
  referral text,
  credit_wallet_id uuid references public.wallet_credits(id),
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now()+interval '24 hours'),
  approved_at timestamptz,
  paid_at timestamptz,
  cancelled_at timestamptz,
  check ((service_id = 'other' and starts_at is null) or (service_id <> 'other' and starts_at is not null))
);
create index bookings_client_idx on public.bookings(client_id,created_at desc);
create index bookings_coach_idx on public.bookings(status,starts_at);
-- L'EXCLUDE impedisce doppie prenotazioni anche in caso di richieste simultanee e fra sedi diverse.
alter table public.bookings add constraint bookings_no_overlap exclude using gist (
  tstzrange(starts_at, starts_at + duration_minutes * interval '1 minute', '[)') with &&
) where (starts_at is not null and status in ('pending','awaiting_payment','confirmed'));
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  kind text not null default 'system',
  booking_id uuid references public.bookings(id) on delete set null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_recipient_idx on public.notifications(recipient_id,created_at desc);
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth_key text not null,
  created_at timestamptz not null default now()
);

create or replace function private.is_coach() returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.profiles where id=(select auth.uid()) and role='coach');
$$;
revoke all on function private.is_coach() from public;
grant execute on function private.is_coach() to authenticated;

create or replace function private.coach_id() returns uuid language sql stable security definer set search_path = '' as $$
  select id from public.profiles where role='coach' order by created_at limit 1;
$$;
revoke all on function private.coach_id() from public;
grant execute on function private.coach_id() to authenticated;

create or replace function private.on_signup() returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into public.profiles(id,email,full_name,phone,virgin_member)
  values(new.id, coalesce(new.email,''), left(coalesce(new.raw_user_meta_data->>'full_name',''),120), left(coalesce(new.raw_user_meta_data->>'phone',''),40), false);
  return new;
end; $$;
create trigger on_user_created after insert on auth.users for each row execute function private.on_signup();

alter table public.profiles enable row level security;
alter table public.services enable row level security;
alter table public.venues enable row level security;
alter table public.working_hours enable row level security;
alter table public.packages enable row level security;
alter table public.discount_codes enable row level security;
alter table public.wallet_credits enable row level security;
alter table public.bookings enable row level security;
alter table public.notifications enable row level security;
alter table public.push_subscriptions enable row level security;

create policy profiles_read on public.profiles for select to authenticated using (id=(select auth.uid()) or (select private.is_coach()));
create policy profiles_edit_own on public.profiles for update to authenticated using (id=(select auth.uid())) with check (id=(select auth.uid()));
-- Rimuovere UPDATE globale per evitare che un cliente si attribuisca ruolo coach o abiliti il pagamento in presenza.
revoke update on public.profiles from public,anon,authenticated;
grant update(full_name,phone,virgin_member) on public.profiles to authenticated;
create policy catalog_services_public on public.services for select to anon,authenticated using (active);
create policy catalog_services_admin on public.services for all to authenticated using ((select private.is_coach())) with check ((select private.is_coach()));
create policy catalog_venues_public on public.venues for select to anon,authenticated using (true);
create policy catalog_hours_public on public.working_hours for select to anon,authenticated using (true);
create policy catalog_hours_admin on public.working_hours for all to authenticated using ((select private.is_coach())) with check ((select private.is_coach()));
create policy catalog_packages_public on public.packages for select to anon,authenticated using (active);
create policy catalog_packages_admin on public.packages for all to authenticated using ((select private.is_coach())) with check ((select private.is_coach()));
create policy codes_admin on public.discount_codes for all to authenticated using ((select private.is_coach())) with check ((select private.is_coach()));
create policy wallet_read on public.wallet_credits for select to authenticated using (client_id=(select auth.uid()) or (select private.is_coach()));
create policy bookings_read on public.bookings for select to authenticated using (client_id=(select auth.uid()) or (select private.is_coach()));
create policy notifications_read on public.notifications for select to authenticated using (recipient_id=(select auth.uid()));
create policy notifications_mark_read on public.notifications for update to authenticated using (recipient_id=(select auth.uid())) with check (recipient_id=(select auth.uid()));
revoke update on public.notifications from authenticated;
grant update(read_at) on public.notifications to authenticated;
create policy push_own on public.push_subscriptions for all to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));

-- CRUD sensibili solo attraverso RPC con verifiche; RLS nega insert/update diretti.
revoke insert,update,delete on public.bookings from anon,authenticated;
revoke insert,update,delete on public.wallet_credits from anon,authenticated;
revoke insert,update,delete on public.discount_codes from anon,authenticated;
revoke insert,update,delete on public.notifications from anon,authenticated;
grant update(read_at) on public.notifications to authenticated;

insert into public.services(id,name,description,kind,duration_minutes,price_cents,sort_order) values
 ('single','Lezione singola','Forza, TRX, GRID, calisthenics e Hyrox: un’ora tutta per te.','paid',60,5000,1),
 ('couple','Lezione di coppia','Allenatevi in due: 40 € a testa.','paid',60,8000,2),
 ('check','Check scheda','Porta la tua scheda e la sistemiamo insieme.','paid',30,3000,3),
 ('start','Avvio programmazione','Valutazione, obiettivi e piano su misura.','paid',45,4500,4),
 ('intro','Colloquio conoscitivo','15 minuti gratuiti per capire come iniziare.','free',15,0,5),
 ('other','Altro · preventivo','Preparazione Hyrox, eventi e piccoli gruppi.','quote',60,0,6);
insert into public.venues values('talenti','Roma Talenti','Virgin Active'),('nuovo_salario','Nuovo Salario','Virgin Active');
insert into public.working_hours(weekday,is_open,start_hour,end_hour)
select day, day<7, 9, case when day=6 then 13 else 14 end from generate_series(1,7) day;
insert into public.packages(id,name,type,credits,price_cents,validity_days,description,sort_order) values
 ('five','Pacchetto 5 lezioni','pack',5,22500,90,'45 € a lezione · valido 3 mesi',1),
 ('ten','Pacchetto 10 lezioni','pack',10,40000,180,'40 € a lezione · valido 6 mesi',2),
 ('monthly4','1 volta a settimana','subscription',4,14000,31,'4 lezioni al mese',3),
 ('monthly8','2 volte a settimana','subscription',8,24000,31,'8 lezioni al mese',4);
insert into public.discount_codes(code,percent_off,active,first_purchase_only,valid_days_from_contact) values('ALECOACH10',10,true,true,7);

-- Le API non accettano client_id, prezzo o ruolo inseriti dal browser.
create or replace function public.create_booking(
 p_service_id text,p_venue_id text,p_day date,p_hour integer,p_details jsonb default '{}'::jsonb,
 p_payment_mode text default 'online',p_code text default null,p_source text default 'direct',p_referral text default null
) returns uuid language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();v_profile public.profiles%rowtype;v_service public.services%rowtype;
 v_date timestamptz;v_hours public.working_hours%rowtype;v_discount integer:=0;v_code public.discount_codes%rowtype;
 v_mode text:=p_payment_mode;v_wallet uuid;v_booking uuid;
begin
 if v_uid is null then raise exception 'Devi accedere per prenotare'; end if;
 select * into v_profile from public.profiles where id=v_uid for update;
 if not found then raise exception 'Profilo non trovato'; end if;
 if not v_profile.virgin_member then raise exception 'Per prenotare devi essere iscritto a Virgin Active'; end if;
 select * into v_service from public.services where id=p_service_id and active;
 if not found then raise exception 'Servizio non disponibile'; end if;
 if jsonb_typeof(p_details) is distinct from 'object' or octet_length(p_details::text)>6000 then raise exception 'Dettagli non validi'; end if;
 if v_service.id in ('single','couple') and nullif(trim(coalesce(p_details->>'discipline','')),'') is null then raise exception 'Scegli una disciplina'; end if;
 if v_service.id='couple' and nullif(trim(coalesce(p_details->>'partner','')),'') is null then raise exception 'Inserisci il nome del partner'; end if;
 if v_service.id='other' and nullif(trim(coalesce(p_details->>'description','')),'') is null then raise exception 'Descrivi la tua richiesta'; end if;
 if v_service.kind='quote' then
   v_date:=null;v_mode:='none';
 else
   if not exists(select 1 from public.venues where id=p_venue_id) then raise exception 'Sede non valida'; end if;
   if p_day is null or p_day < (now() at time zone 'Europe/Rome')::date+1 or p_day > (now() at time zone 'Europe/Rome')::date+7 then raise exception 'Giorno non prenotabile'; end if;
   select * into v_hours from public.working_hours where weekday=extract(isodow from p_day)::integer and is_open;
   if not found or p_hour is null or p_hour < v_hours.start_hour or p_hour+ceil(v_service.duration_minutes / 60.0)::integer>v_hours.end_hour then raise exception 'Orario non disponibile'; end if;
   v_date:=(p_day::text||' '||lpad(p_hour::text,2,'0')||':00:00')::timestamp at time zone 'Europe/Rome';
 end if;
 if v_service.kind='free' then v_mode:='none'; end if;
 if v_service.kind='paid' then
  if v_mode not in ('online','in_person','credit') then raise exception 'Metodo di pagamento non valido'; end if;
  if v_mode='in_person' and not v_profile.allow_in_person then raise exception 'Pagamento in presenza non autorizzato'; end if;
  if v_mode='credit' then
   if p_service_id<>'single' then raise exception 'Il credito vale solo per la lezione singola'; end if;
   select id into v_wallet from public.wallet_credits where client_id=v_uid and remaining>0 and expires_at>now() order by expires_at for update skip locked limit 1;
   if v_wallet is null then raise exception 'Crediti insufficienti'; end if;
  elsif p_code is not null and btrim(p_code)<>'' then
   select * into v_code from public.discount_codes where code=upper(trim(p_code)) and active;
   if not found then raise exception 'Codice promozionale non valido'; end if;
   if v_code.first_purchase_only and exists(select 1 from public.bookings where client_id=v_uid and payment_status='paid' and service_id<>'intro') then raise exception 'Sconto riservato alla prima lezione pagata'; end if;
   if v_code.valid_days_from_contact is not null and now()>v_profile.first_contact_at + make_interval(days=>v_code.valid_days_from_contact) then raise exception 'Codice promozionale scaduto'; end if;
   v_discount:=v_code.percent_off;
  end if;
 else v_mode:='none';
 end if;
 if v_wallet is not null then update public.wallet_credits set remaining=remaining-1 where id=v_wallet; end if;
 insert into public.bookings(client_id,service_id,venue_id,starts_at,duration_minutes,base_amount_cents,amount_cents,
  discount_percent,promo_code,payment_mode,credit_wallet_id,details,source,referral)
 values(v_uid,p_service_id,case when v_date is null then null else p_venue_id end,v_date,v_service.duration_minutes,
 v_service.price_cents,round(v_service.price_cents*(100-v_discount)/100.0)::integer,v_discount,
 case when v_discount>0 then upper(trim(p_code)) else null end,v_mode,v_wallet,p_details,left(coalesce(p_source,'direct'),64),left(coalesce(p_referral,''),100))
 returning id into v_booking;
 -- Il credito è riservato, non scalato definitivamente, finché la lezione non è approvata.
 insert into public.notifications(recipient_id,title,body,kind,booking_id)
 select id,'Nuova richiesta',v_profile.full_name||' ha chiesto una lezione.','booking_created',v_booking from public.profiles where role='coach';
 return v_booking;
exception when exclusion_violation then
 raise exception 'Questo orario è già occupato';
end; $$;
revoke all on function public.create_booking(text,text,date,integer,jsonb,text,text,text,text) from public;
grant execute on function public.create_booking(text,text,date,integer,jsonb,text,text,text,text) to authenticated;

create or replace function public.coach_decide_booking(p_booking_id uuid,p_action text,p_quote_cents integer default null)
returns text language plpgsql security definer set search_path='' as $$
declare v_b public.bookings%rowtype;v_status text;v_mode text;
begin
 if not private.is_coach() then raise exception 'Operazione riservata al coach'; end if;
 select * into v_b from public.bookings where id=p_booking_id for update;
 if not found or v_b.status<>'pending' then raise exception 'Richiesta non più in attesa'; end if;
 if v_b.expires_at<now() then raise exception 'Richiesta scaduta'; end if;
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
end; $$;
revoke all on function public.coach_decide_booking(uuid,text,integer) from public;
grant execute on function public.coach_decide_booking(uuid,text,integer) to authenticated;

create or replace function public.coach_set_in_person(p_client_id uuid,p_allowed boolean)
returns void language plpgsql security definer set search_path='' as $$
begin
 if not private.is_coach() then raise exception 'Operazione riservata al coach'; end if;
 update public.profiles set allow_in_person=p_allowed where id=p_client_id and role='client';
 if not found then raise exception 'Cliente non trovato'; end if;
end; $$;
revoke all on function public.coach_set_in_person(uuid,boolean) from public;
grant execute on function public.coach_set_in_person(uuid,boolean) to authenticated;

create or replace function public.coach_set_booking_method(p_booking_id uuid,p_mode text)
returns void language plpgsql security definer set search_path='' as $$
declare v_b public.bookings%rowtype;
begin
 if not private.is_coach() then raise exception 'Operazione riservata al coach'; end if;
 select * into v_b from public.bookings where id=p_booking_id for update;
 if not found or v_b.status<>'pending' or v_b.payment_mode not in ('online','in_person') then raise exception 'Richiesta non modificabile'; end if;
 if p_mode not in ('online','in_person') then raise exception 'Modalità non valida'; end if;
 if p_mode='in_person' and not exists(select 1 from public.profiles where id=v_b.client_id and allow_in_person) then
  raise exception 'Abilita prima il pagamento in presenza per questo cliente';
 end if;
 update public.bookings set payment_mode=p_mode where id=p_booking_id;
end; $$;
revoke all on function public.coach_set_booking_method(uuid,text) from public;
grant execute on function public.coach_set_booking_method(uuid,text) to authenticated;

create or replace function public.coach_mark_in_person_paid(p_booking_id uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
 if not private.is_coach() then raise exception 'Operazione riservata al coach'; end if;
 update public.bookings set payment_status='paid',paid_at=now() where id=p_booking_id and status='confirmed' and payment_mode='in_person' and payment_status='due_in_person';
 if not found then raise exception 'Lezione non valida'; end if;
end; $$;
revoke all on function public.coach_mark_in_person_paid(uuid) from public;
grant execute on function public.coach_mark_in_person_paid(uuid) to authenticated;

create or replace function public.cancel_unpaid_booking(p_booking_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare v_b public.bookings%rowtype;
begin
 select * into v_b from public.bookings where id=p_booking_id for update;
 if not found or (v_b.client_id<>auth.uid() and not private.is_coach()) then raise exception 'Operazione non autorizzata'; end if;
 if v_b.starts_at is null or v_b.starts_at<now()+interval '24 hours' then raise exception 'Disdetta online non disponibile nelle 24 ore precedenti'; end if;
 if v_b.status not in ('confirmed','awaiting_payment','pending') then raise exception 'Stato non cancellabile'; end if;
 if v_b.payment_mode='online' and v_b.payment_status='paid' then raise exception 'Per il rimborso usare la funzione server'; end if;
 update public.bookings set status='cancelled',cancelled_at=now(),payment_status=case when v_b.payment_mode='credit' then 'refunded' else 'unpaid' end where id=p_booking_id;
 if v_b.credit_wallet_id is not null then update public.wallet_credits set remaining=remaining+1 where id=v_b.credit_wallet_id; end if;
 insert into public.notifications(recipient_id,title,body,kind,booking_id) values(v_b.client_id,'Lezione disdetta','La prenotazione è stata cancellata.','booking_cancelled',p_booking_id);
end; $$;
revoke all on function public.cancel_unpaid_booking(uuid) from public;
grant execute on function public.cancel_unpaid_booking(uuid) to authenticated;

create or replace function public.expire_stale_bookings()
returns integer language plpgsql security definer set search_path='' as $$
declare n integer:=0; v_record record;
begin
 for v_record in
  update public.bookings set status='expired'
  where status in ('pending','awaiting_payment') and expires_at<now()
  returning credit_wallet_id,client_id,id
 loop
  n:=n+1;
  if v_record.credit_wallet_id is not null then
   update public.wallet_credits set remaining=remaining+1 where id=v_record.credit_wallet_id;
  end if;
  insert into public.notifications(recipient_id,title,body,kind,booking_id)
  values(v_record.client_id,'Richiesta scaduta','Il termine per la conferma o il pagamento è scaduto.','booking_expired',v_record.id);
 end loop;
 return n;
end; $$;
revoke all on function public.expire_stale_bookings() from public;
-- La chiamata avviene da un job/ruolo di servizio, non dal browser.

-- Richiede progetto PostgreSQL con pg_cron; in caso non disponibile eseguire la funzione da un job autenticato.
-- select cron.schedule('ale-coach-expire', '*/5 * * * *', 'select public.expire_stale_bookings()');

-- Il coach NON viene creato da una mail arbitraria. Dopo aver effettuato l'iscrizione, assegnare il ruolo
-- con SQL da Dashboard: update public.profiles set role='coach' where id='<UUID-DEL-COACH>';

-- Espone esclusivamente gli orari liberi, mai i dati delle prenotazioni altrui.
create or replace function public.available_slots(p_service_id text,p_day date)
returns table(hour integer) language plpgsql stable security definer set search_path='' as $$
declare v_s public.services%rowtype;v_h public.working_hours%rowtype;v_start timestamptz;
begin
 select * into v_s from public.services where id=p_service_id and active and kind<>'quote';
 if not found or p_day is null or p_day<(now() at time zone 'Europe/Rome')::date+1 or p_day>(now() at time zone 'Europe/Rome')::date+7 then return; end if;
 select * into v_h from public.working_hours where weekday=extract(isodow from p_day)::integer and is_open;
 if not found then return; end if;
 for hour in select generate_series(v_h.start_hour,v_h.end_hour-ceil(v_s.duration_minutes/60.0)::integer) loop
   v_start:=(p_day::text||' '||lpad(hour::text,2,'0')||':00:00')::timestamp at time zone 'Europe/Rome';
   if not exists(
    select 1 from public.bookings b where b.status in ('pending','awaiting_payment','confirmed')
    and b.starts_at is not null and
    tstzrange(b.starts_at,b.starts_at+b.duration_minutes*interval '1 minute','[)') &&
    tstzrange(v_start,v_start+v_s.duration_minutes*interval '1 minute','[)')
   ) then return next; end if;
 end loop;
end; $$;
revoke all on function public.available_slots(text,date) from public;
grant execute on function public.available_slots(text,date) to anon,authenticated;

-- Schede e foto private; nessun file reso pubblico.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('client-documents','client-documents',false,5242880,array['application/pdf','image/jpeg','image/png'])
on conflict(id) do nothing;
create policy documents_client_upload on storage.objects for insert to authenticated
with check(bucket_id='client-documents' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy documents_read_authorized on storage.objects for select to authenticated
using(bucket_id='client-documents' and ((storage.foldername(name))[1]=(select auth.uid())::text or (select private.is_coach())));

-- Il coach può abilitare/disabilitare i codici, ma i clienti non li modificano.
grant select,update(active,percent_off) on public.discount_codes to authenticated;
-- In Supabase grants standard sullo schema public sono abitualmente già attivi;
-- li esplicitiamo per deploy riproducibile.
grant select on public.profiles,public.services,public.venues,public.working_hours,public.packages,
 public.wallet_credits,public.bookings,public.notifications,public.push_subscriptions to authenticated;
grant select on public.services,public.venues,public.working_hours,public.packages to anon;
grant update,insert,delete on public.services,public.working_hours,public.packages to authenticated;
grant select,insert,delete on public.push_subscriptions to authenticated;
-- Se un device cambia le chiavi, usare upsert. La policy own protegge l'update.
grant update on public.push_subscriptions to authenticated;
