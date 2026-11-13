-- ALE COACH P0. Reinstall the signup allowlist that should protect the V1 prelaunch.
-- The 4 Nov migration is in cloud migration history, but the live trigger function
-- no longer checks the allowlist. No existing auth.users/profiles are changed.
-- Before commercial GO, remove this guard through a separately reviewed migration.
DO $prerequisites$
BEGIN
  IF to_regclass('private.prelaunch_allowed_emails') IS NULL THEN
    RAISE EXCEPTION 'Missing private.prelaunch_allowed_emails: refusing unsafe signup change';
  END IF;
END;
$prerequisites$;

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

-- The trigger invokes the function internally. Clients must not call it as RPC.
REVOKE ALL ON FUNCTION private.on_signup() FROM PUBLIC, anon, authenticated;
