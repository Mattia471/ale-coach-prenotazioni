-- ALE COACH V1: test ripetibile su Supabase Cloud, senza modifiche persistenti.
-- Eseguire da Supabase SQL Editor (ruolo amministrativo) dopo revisione.
-- Il cliente test viene individuato senza riportare ID o dati personali.
-- I blocchi sono transazioni autonome; se un test fallisce, SQL segnala un errore.
-- NON sostituisce i test di concorrenza con due veri account.

-- A. RLS e 6 RPC coach-only in TRANSAZIONE READ ONLY.
BEGIN TRANSACTION READ ONLY;
SET LOCAL statement_timeout='5s';
SET LOCAL lock_timeout='1s';
DO $setup$
BEGIN
 PERFORM set_config('request.jwt.claim.sub',
  (select id::text from public.profiles where role='client' order by created_at limit 1),true);
END $setup$;
SET LOCAL ROLE authenticated;
DO $qa$
DECLARE t record; error_message text;
BEGIN
 IF auth.uid() IS NULL OR private.is_coach() OR current_setting('transaction_read_only')<>'on'
 THEN RAISE EXCEPTION 'QA: invalid client/read-only context'; END IF;

 IF EXISTS(select 1 from public.profiles where id IS DISTINCT FROM auth.uid())
  OR EXISTS(select 1 from public.bookings where client_id IS DISTINCT FROM auth.uid())
  OR EXISTS(select 1 from public.notifications where recipient_id IS DISTINCT FROM auth.uid())
  OR EXISTS(select 1 from public.wallet_credits where client_id IS DISTINCT FROM auth.uid())
  OR EXISTS(select 1 from public.slot_holds where client_id IS DISTINCT FROM auth.uid())
 THEN RAISE EXCEPTION 'QA: row ownership violation'; END IF;

 IF has_table_privilege(current_user,'public.package_checkout_orders','SELECT')
 THEN RAISE EXCEPTION 'QA: server-only package orders exposed'; END IF;

 FOR t IN SELECT * FROM (VALUES
  ('coach_set_in_person', 'select public.coach_set_in_person(''00000000-0000-0000-0000-000000000000''::uuid,true)','Operazione riservata al coach'),
  ('coach_set_booking_method', 'select public.coach_set_booking_method(''00000000-0000-0000-0000-000000000000''::uuid,''in_person'')','Operazione riservata al coach'),
  ('coach_mark_in_person_paid', 'select public.coach_mark_in_person_paid(''00000000-0000-0000-0000-000000000000''::uuid)','Operazione riservata al coach'),
  ('coach_decide_booking', 'select public.coach_decide_booking(''00000000-0000-0000-0000-000000000000''::uuid,''approve'',null)','Operazione riservata al coach'),
  ('coach_classify_external_event', 'select public.coach_classify_external_event(0,''talenti'',false,true)','Operazione riservata al coach'),
  ('claim_booking_decision', 'select public.claim_booking_decision(''00000000-0000-0000-0000-000000000000''::uuid,''approve'')','Operazione riservata al coach')
 ) AS v(label,sql_call,expected)
 LOOP
  error_message:=null;
  BEGIN EXECUTE t.sql_call;
  EXCEPTION WHEN others THEN GET STACKED DIAGNOSTICS error_message=MESSAGE_TEXT;
  END;
  IF error_message IS DISTINCT FROM t.expected THEN
   RAISE EXCEPTION 'QA FAILED %: expected %, got %',t.label,t.expected,coalesce(error_message,'SUCCESS');
  END IF;
 END LOOP;
END $qa$;
SELECT 'QA RLS + 6 coach RPC: PASS' AS qa_result;
ROLLBACK;

-- B. Le due disdette usano SELECT FOR UPDATE, vietato nelle transazioni
-- READ ONLY. Si usa un UUID inesistente verificato prima, con ROLLBACK.
BEGIN;
SET LOCAL statement_timeout='5s';
SET LOCAL lock_timeout='1s';
DO $setup$
BEGIN
 IF EXISTS(select 1 from public.bookings where id='00000000-0000-0000-0000-000000000000'::uuid)
  OR pg_get_functiondef('public.cancel_unpaid_booking(uuid)'::regprocedure)
      NOT LIKE '%v_b.client_id IS DISTINCT FROM auth.uid()%'
  OR pg_get_functiondef('public.claim_booking_cancellation(uuid)'::regprocedure)
      NOT LIKE '%if not found or b.client_id is distinct from auth.uid()%'
 THEN RAISE EXCEPTION 'QA: cancellation guard preflight failed'; END IF;
 PERFORM set_config('request.jwt.claim.sub',
  (select id::text from public.profiles where role='client' order by created_at limit 1),true);
END $setup$;
SET LOCAL ROLE authenticated;
DO $qa$
DECLARE t record; error_message text;
BEGIN
 IF auth.uid() IS NULL OR private.is_coach() THEN RAISE EXCEPTION 'QA: invalid client'; END IF;
 FOR t IN SELECT * FROM (VALUES
  ('claim_booking_cancellation','select public.claim_booking_cancellation(''00000000-0000-0000-0000-000000000000''::uuid)','Non autorizzato'),
  ('cancel_unpaid_booking','select public.cancel_unpaid_booking(''00000000-0000-0000-0000-000000000000''::uuid)','Operazione non autorizzata')
 ) AS v(label,sql_call,expected)
 LOOP
  error_message:=null;
  BEGIN EXECUTE t.sql_call;
  EXCEPTION WHEN others THEN GET STACKED DIAGNOSTICS error_message=MESSAGE_TEXT;
  END;
  IF error_message IS DISTINCT FROM t.expected THEN
   RAISE EXCEPTION 'QA FAILED %: expected %, got %',t.label,t.expected,coalesce(error_message,'SUCCESS');
  END IF;
 END LOOP;
END $qa$;
SELECT 'QA cancellazioni proprietario: PASS (ROLLBACK)' AS qa_result;
ROLLBACK;
