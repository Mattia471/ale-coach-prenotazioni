-- Accesso cloud in pre-lancio: utenti reali ma solo indirizzi approvati.
-- Non è un ambiente di test separato: usa l'unico Supabase Ale Coach.
-- Eliminare la restrizione solo con una nuova migrazione dopo GO privacy.
create table private.prelaunch_allowed_emails (
  email text primary key check (email = lower(btrim(email))),
  added_at timestamptz not null default now()
);
revoke all on private.prelaunch_allowed_emails from public, anon, authenticated;
insert into private.prelaunch_allowed_emails (email)
values ('info@alecoach.online');

-- Il trigger Auth accetta soltanto email nella lista privata.
-- Non promuove nessun utente automaticamente al ruolo coach.
create or replace function private.on_signup() returns trigger
language plpgsql security definer set search_path='' as $signup$
declare v_email text := lower(btrim(coalesce(new.email,'')));
begin
  if not exists(
    select 1 from private.prelaunch_allowed_emails a where a.email = v_email
  ) then
    raise exception 'Iscrizioni riservate agli account autorizzati durante il collaudo';
  end if;
  insert into public.profiles(id,email,full_name,phone,virgin_member)
  values(
    new.id,
    coalesce(new.email,''),
    left(coalesce(new.raw_user_meta_data->>'full_name',''),120),
    left(coalesce(new.raw_user_meta_data->>'phone',''),40),
    false
  );
  return new;
end;
$signup$;
revoke all on function private.on_signup() from public,anon,authenticated;
