-- ALE COACH V1: repeatable, read-only RPC privilege and source-guard audit.
-- Run in Supabase SQL Editor as an authorized project administrator.
-- No DDL, DML, roles, JWT impersonation, customer data or secrets.
-- Scope: privileges, search_path and presence of expected authorization guards.
-- This is NOT a formal proof of authorization correctness.
WITH rpc AS (
 SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args,
        has_function_privilege('anon',p.oid,'EXECUTE') AS anon_allowed,
        has_function_privilege('authenticated',p.oid,'EXECUTE') AS user_allowed,
        pg_get_functiondef(p.oid) AS source,
        coalesce(array_to_string(p.proconfig,','),'') AS config
 FROM pg_proc p
 JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND p.prosecdef
), violations AS (
 SELECT proname,'anonymous EXECUTE on privileged function' AS reason FROM rpc WHERE anon_allowed
 UNION ALL SELECT proname,'unsafe or unset search_path' FROM rpc
  WHERE config NOT LIKE '%search_path=""%'
 UNION ALL SELECT proname,'server-only RPC exposed to authenticated' FROM rpc
  WHERE proname IN (
   'settle_package_checkout_order','finalize_booking_authorization',
   'complete_booking_decision','expire_stale_bookings',
   'expire_released_stripe_authorization','get_stripe_housekeeping_token',
   'get_push_vapid_config'
  ) AND user_allowed
 UNION ALL SELECT proname,'coach-only RPC lacks expected guard' FROM rpc
  WHERE proname IN (
   'claim_booking_decision','coach_classify_external_event',
   'coach_decide_booking','coach_mark_in_person_paid',
   'coach_set_booking_method','coach_set_in_person'
  ) AND user_allowed AND source !~* 'private[.]is_coach[(]'
 UNION ALL SELECT proname,'client RPC lacks expected auth.uid() guard' FROM rpc
  WHERE proname IN (
   'create_booking_v2','reserve_slot_v2','release_slot_hold_v2',
   'claim_booking_cancellation','cancel_unpaid_booking'
  ) AND user_allowed AND source !~* 'auth[.]uid[(]'
)
SELECT 'rpc_security_audit' AS audit,
 (SELECT count(*) FROM rpc) AS total_security_definer,
 (SELECT count(*) FROM rpc WHERE user_allowed) AS authenticated_exposed,
 (SELECT count(*) FROM violations) AS violation_count,
 coalesce((SELECT jsonb_agg(jsonb_build_object('function',proname,'reason',reason))
  FROM violations),'[]'::jsonb) AS violations;
-- Expected on 2026-11-12: 21 privileged functions, 12 authenticated-exposed, 0 violations.
-- New RPCs require explicit review of the lists above; a zero count alone is not approval.
