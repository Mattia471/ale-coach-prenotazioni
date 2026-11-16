-- ALE COACH V1: STAGED GO-LIVE ONLY. NOT APPLIED TO CLOUD.
-- Run manually in the verified Ale Coach Supabase SQL Editor ONLY AFTER:
-- (1) legal approval, (2) Stripe Sandbox tests, (3) QA dataset cleanup,
-- (4) future customer-data protection, (5) commercial GO permission.
-- Deliberately NOT under supabase/migrations to prevent accidental rollout.
-- This preserves all existing users/roles, schema, RLS and coach permissions.
-- Run as an authorized database administrator. No auth.users rows are changed.
BEGIN;

DO $guard$
DECLARE v_current text;
BEGIN
 IF to_regclass('private.prelaunch_allowed_emails') IS NULL THEN
  RAISE EXCEPTION 'Missing prelaunch allowlist: refusing public signup change';
 END IF;
 IF to_regclass('auth.users') IS NULL THEN
  RAISE EXCEPTION 'Missing auth.users: wrong target';
 END IF;
 SELECT pg_get_functiondef('private.on_signup()'::regprocedure) INTO v_current;
 IF position('private.prelaunch_allowed_emails' IN v_current)=0 THEN
  RAISE EXCEPTION 'Signup function is not the expected prelaunch version';
 END IF;
 IF NOT EXISTS (
  SELECT 1 FROM pg_trigger t
  WHERE t.tgrelid='auth.users'::regclass
    AND t.tgfoid='private.on_signup()'::regprocedure
    AND t.tgname='on_user_created'
    AND t.tgenabled='O' AND NOT t.tgisinternal
 ) THEN
  RAISE EXCEPTION 'Expected enabled auth.users trigger missing: aborting';
 END IF;
 IF (SELECT column_default FROM information_schema.columns
     WHERE table_schema='public' AND table_name='profiles' AND column_name='role')
    IS DISTINCT FROM '''client''::text' THEN
  RAISE EXCEPTION 'Profile role default is no longer client: aborting';
 END IF;
 IF (SELECT column_default FROM information_schema.columns
     WHERE table_schema='public' AND table_name='profiles' AND column_name='allow_in_person')
    IS DISTINCT FROM 'false' THEN
  RAISE EXCEPTION 'In-person privilege must default false: aborting';
 END IF;
END;
$guard$;

-- Replaces only the signup trigger function: no extra grants or policy changes.
-- All new users are regular clients, never coaches / in-person-enabled because
-- user-editable metadata is used exclusively for display fields.
CREATE OR REPLACE FUNCTION private.on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $signup$
BEGIN
 IF NEW.email IS NULL OR pg_catalog.btrim(NEW.email)='' THEN
  RAISE EXCEPTION 'Indirizzo email richiesto';
 END IF;
 INSERT INTO public.profiles(id,email,full_name,phone,virgin_member)
 VALUES(
  NEW.id,
  coalesce(NEW.email,''),
  pg_catalog.left(coalesce(NEW.raw_user_meta_data->>'full_name',''),120),
  pg_catalog.left(coalesce(NEW.raw_user_meta_data->>'phone',''),40),
  false
 );
 RETURN NEW;
END;
$signup$;

REVOKE ALL ON FUNCTION private.on_signup() FROM PUBLIC, anon, authenticated;
COMMIT;

-- Verify using read-only SQL after GO:
-- SELECT position('prelaunch_allowed_emails' in
--   pg_get_functiondef('private.on_signup()'::regprocedure))=0 AS public_signup_ready;
-- SELECT has_function_privilege('anon','private.on_signup()','EXECUTE') AS anon_execute;
-- To reinstate allowlist after rollback decision, use the separate staged rollback file.
