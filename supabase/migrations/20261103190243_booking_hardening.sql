-- Ale Coach: protezione checkout pacchetti e promo in concorrenza.
-- Valida sia per progetto locale sia per il futuro Supabase cloud.
create unique index if not exists bookings_one_active_promo_per_client
on public.bookings(client_id)
where discount_percent > 0 and status in ('pending','awaiting_payment','confirmed');

create index if not exists bookings_expiry_job_idx
on public.bookings(expires_at)
where status in ('pending','awaiting_payment');

create or replace function private.quote_validity_window()
returns trigger language plpgsql set search_path = '' as $quote$
begin
  if new.status = 'quoted' and old.status is distinct from new.status then
    new.expires_at := now() + interval '24 hours';
  end if;
  return new;
end;
$quote$;
create trigger bookings_quote_expiry_before_update
before update of status on public.bookings
for each row execute function private.quote_validity_window();

-- Gli ordini sono privati e creati solo via Edge Function con credenziali server.
create table public.package_checkout_orders (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  package_id text not null references public.packages(id),
  amount_cents integer not null check (amount_cents >= 50),
  status text not null default 'pending' check (status in ('pending','paid','expired')),
  stripe_session_id text unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '32 minutes'),
  paid_at timestamptz
);
create unique index package_checkout_one_pending_idx
on public.package_checkout_orders(client_id,package_id)
where status = 'pending';
create index package_checkout_client_idx on public.package_checkout_orders(client_id,created_at desc);
alter table public.package_checkout_orders enable row level security;
revoke all on public.package_checkout_orders from public,anon,authenticated;
grant select,insert,update on public.package_checkout_orders to service_role;

-- Serializza il checkout per cliente+pacchetto, senza esporre RPC al browser.
create or replace function public.begin_package_checkout(p_client_id uuid,p_package_id text)
returns public.package_checkout_orders language plpgsql set search_path = '' as $begin$
declare v_order public.package_checkout_orders%rowtype; v_pack public.packages%rowtype;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_client_id::text || ':' || p_package_id, 0));
  if not exists (select 1 from public.profiles where id=p_client_id and virgin_member) then
    raise exception 'Cliente non abilitato';
  end if;
  select * into v_pack from public.packages where id=p_package_id and active and type='pack';
  if not found then raise exception 'Pacchetto non disponibile'; end if;
  select * into v_order from public.package_checkout_orders
    where client_id=p_client_id and package_id=p_package_id and status='pending'
    for update;
  if found then
    if v_order.expires_at > now() + interval '30 seconds'
       and v_order.amount_cents = v_pack.price_cents then
      return v_order;
    end if;
    update public.package_checkout_orders set status='expired' where id=v_order.id;
  end if;
  insert into public.package_checkout_orders(client_id,package_id,amount_cents)
    values(p_client_id,p_package_id,v_pack.price_cents)
    returning * into v_order;
  return v_order;
end;
$begin$;
revoke all on function public.begin_package_checkout(uuid,text) from public,anon,authenticated;
grant execute on function public.begin_package_checkout(uuid,text) to service_role;

create or replace function public.expire_package_checkout_order(p_order_id uuid)
returns void language sql set search_path = '' as $expire$
  update public.package_checkout_orders set status='expired'
  where id=p_order_id and status='pending';
$expire$;
revoke all on function public.expire_package_checkout_order(uuid) from public,anon,authenticated;
grant execute on function public.expire_package_checkout_order(uuid) to service_role;

-- Crediti, stato ordine e notifica sono una sola transazione DB idempotente.
create or replace function public.settle_package_checkout_order(p_order_id uuid,p_session_id text)
returns boolean language plpgsql set search_path = '' as $settle$
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
    now()+make_interval(days=>v_pack.validity_days),p_session_id);
  update public.package_checkout_orders set status='paid',paid_at=now() where id=p_order_id;
  insert into public.notifications(recipient_id,title,body,kind)
  values(v_order.client_id,'Pacchetto attivo',
    v_pack.name||': '||v_pack.credits||' lezioni disponibili.','package_paid');
  return true;
end;
$settle$;
revoke all on function public.settle_package_checkout_order(uuid,text) from public,anon,authenticated;
grant execute on function public.settle_package_checkout_order(uuid,text) to service_role;

-- Anche i preventivi scadono; gli slot rimangono bloccati fino al cron.
create or replace function public.expire_stale_bookings()
returns integer language plpgsql security definer set search_path='' as $expiry$
declare n integer:=0; v_record record;
begin
 for v_record in
  update public.bookings set status='expired'
  where status in ('pending','awaiting_payment','quoted') and expires_at<now()
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
$expiry$;
revoke all on function public.expire_stale_bookings() from public,anon,authenticated;
