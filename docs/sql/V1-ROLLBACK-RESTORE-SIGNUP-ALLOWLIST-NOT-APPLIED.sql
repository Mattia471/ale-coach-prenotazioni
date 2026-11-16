-- ALE COACH V1: STAGED EMERGENCY ROLLBACK. NOT APPLIED TO CLOUD.
-- If an authorized GO has enabled public signup and it must be suspended,
-- run this manually in the Ale Coach project Supabase SQL Editor.
-- Does NOT delete any users or profiles, including signups already registered.
BEGIN;
DO $guard$
DECLARE v_current text;
BEGIN
 IF to_regclass('private.prelaunch_allowed_emails') IS NULL THEN
  RAISE EXCEPTION 'Allowlist table missing, rollback denied';
 END IF;
 IF to_regclass('auth.users') IS NULL THEN
  RAISE EXCEPTION 'Auth table missing, rollback denied';
 END IF;
 SELECT pg_get_functiondef('private.on_signup()'::regprocedure) INTO v_current;
 IF position('private.prelaunch_allowed_emails' IN v_current)>0 THEN
  RAISE EXCEPTION 'Signup guard is already active or code is unexpected: review manually';
 END IF;
 IF NOT EXISTS (
  SELECT 1 FROM pg_trigger t
  WHERE t.tgrelid='auth.users'::regclass
   AND t.tgfoid='private.on_signup()'::regprocedure
   AND t.tgname='on_user_created'
   AND t.tgenabled='O' AND NOT t.tgisinternal
 ) THEN
  RAISE EXCEPTION 'Expected auth signup trigger missing, rollback denied';
 END IF;
END;
$guard$;

CREATE OR REPLACE FUNCTION private.on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $signup$
DECLARE v_email text := pg_catalog.lower(pg_catalog.btrim(coalesce(NEW.email,'')));
BEGIN
 IF NOT EXISTS (
  SELECT 1 FROM private.prelaunch_allowed_emails a WHERE a.email=v_email
 ) THEN
  RAISE EXCEPTION 'Iscrizioni riservate agli account autorizzati durante il collaudo';
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
-- Existing sessions remain valid. Disabling signup alone does not block
-- existing account login; implement account restrictions separately if needed.
