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
  check (end_hour > start_¶»§q«^