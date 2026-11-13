-- ALE COACH V1 | Read-only production authorization invariants.
-- No customer data, no UUID, no secrets. Safe to run as project SQL administrator.
-- This is NOT a penetration test or proof that every SECURITY DEFINER branch is safe.
-- A failure must block commercial GO pending review, not auto-REVOKE permissions.
WITH flags(label,ok) AS (
 VALUES
 ('RLS: profiles', (SELECT relrowsecurity FROM pg_class WHERE oid='public.profiles'::regclass)),
 ('RLS: bookings', (SELECT relrowsecurity FROM pg_class WHERE oid='public.bookings'::regclass)),
 ('RLS: wallet_credits', (SELECT relrowsecurity FROM pg_class WHERE oid='public.wallet_credits'::regclass)),
 ('RLS: notifications', (SELECT relrowsecurity FROM pg_class WHERE oid='public.notifications'::regclass)),
 ('RLS: package_checkout_orders', (SELECT relrowsecurity FROM pg_class WHERE oid='public.package_checkout_orders'::regclass)),
 ('RLS: private package orders have no browser policies',
   NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='package_checkout_orders')),
 ('RLS: profiles updates restricted to own id',
   EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles'
     AND cmd='UPDATE' AND policyname='profiles_edit_own'
     AND qual LIKE '%auth.uid()%' AND with_check LIKE '%auth.uid()%')),
 ('RLS: no browser INSERT/DELETE policy on profiles',
   NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles'
     AND cmd IN ('ALL','INSERT','DELETE') AND roles && ARRAY['authenticated','public']::name[])),
 ('PRIV: signed-in client cannot change profile role',
   NOT has_column_privilege('authenticated','public.profiles','role','UPDATE')),
 ('PRIV: signed-in client cannot change profile id',
   NOT has_column_privilege('authenticated','public.profiles','id','UPDATE')),
 ('PRIV: signed-in client cannot change profile email',
   NOT has_column_privilege('authenticated','public.profiles','email','UPDATE')),
 ('PRIV: signed-in client cannot change first_contact_at',
   NOT has_column_privilege('authenticated','public.profiles','first_contact_at','UPDATE')),
 ('PRIV: signed-in client cannot grant own in-person payment',
   NOT has_column_privilege('authenticated','public.profiles','allow_in_person','UPDATE')),
 ('PRIV: profile updates limited to documented self fields',
   NOT EXISTS(SELECT 1 FROM information_schema.columns c
     WHERE c.table_schema='public' AND c.table_name='profiles'
       AND c.column_name NOT IN ('full_name','phone','virgin_member')
       AND has_column_privilege('authenticated','public.profiles',c.column_name,'UPDATE'))),
 ('PRIV: only read_at of notifications is client writable',
   NOT EXISTS(SELECT 1 FROM information_schema.columns c
     WHERE c.table_schema='public' AND c.table_name='notifications'
       AND c.column_name <> 'read_at'
       AND has_column_privilege('authenticated','public.notifications',c.column_name,'UPDATE'))),
 ('PRIV: signed-in client cannot INSERT bookings',
   NOT has_table_privilege('authenticated','public.bookings','INSERT')),
 ('PRIV: signed-in client cannot UPDATE bookings',
   NOT has_table_privilege('authenticated','public.bookings','UPDATE')),
 ('PRIV: signed-in client cannot DELETE bookings',
   NOT has_table_privilege('authenticated','public.bookings','DELETE')),
 ('PRIV: signed-in client cannot INSERT wallet_credits',
   NOT has_table_privilege('authenticated','public.wallet_credits','INSERT')),
 ('PRIV: signed-in client cannot UPDATE wallet_credits',
   NOT has_table_privilege('authenticated','public.wallet_credits','UPDATE')),
 ('PRIV: signed-in client cannot DELETE wallet_credits',
   NOT has_table_privilege('authenticated','public.wallet_credits','DELETE')),
 ('PRIV: no browser privileges on package_checkout_orders',
   NOT has_table_privilege('authenticated','public.package_checkout_orders','SELECT,INSERT,UPDATE,DELETE')
   AND NOT has_table_privilege('anon','public.package_checkout_orders','SELECT,INSERT,UPDATE,DELETE')),
 ('PRIV: signup allowlist is browser-inaccessible',
   NOT has_table_privilege('authenticated','private.prelaunch_allowed_emails','SELECT,INSERT,UPDATE,DELETE')
   AND NOT has_table_privilege('anon','private.prelaunch_allowed_emails','SELECT,INSERT,UPDATE,DELETE')),
 ('AUTH: signup trigger checks private prelaunch allowlist',
   strpos(pg_get_functiondef('private.on_signup()'::regprocedure),'private.prelaunch_allowed_emails')>0),
 ('AUTH: coach role based on profiles and auth.uid',
   strpos(pg_get_functiondef('private.is_coach()'::regprocedure),'auth.uid()')>0
   AND strpos(pg_get_functiondef('private.is_coach()'::regprocedure),'role=')>0),
 ('RPC: no public SECURITY DEFINER executable anonymously',
   NOT EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
     WHERE n.nspname='public' AND p.prosecdef AND has_function_privilege('anon',p.oid,'EXECUTE'))),
 ('RPC: no service-role Stripe/expiry functions callable by signed-in users',
   NOT EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
     WHERE n.nspname='public' AND p.proname=ANY(ARRAY[
       'settle_package_checkout_order','begin_package_checkout','expire_package_checkout_order',
       'finalize_booking_authorization','complete_booking_decision','expire_stale_bookings',
       'expire_released_stripe_authorization','get_stripe_housekeeping_token',
       'get_push_vapid_config']) AND has_function_privilege('authenticated',p.oid,'EXECUTE'))),
 ('RPC: authenticated coach-only functions have guard',
   NOT EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
     WHERE n.nspname='public' AND p.prosecdef AND p.proname=ANY(ARRAY[
       'claim_booking_decision','coach_classify_external_event','coach_decide_booking',
       'coach_mark_in_person_paid','coach_set_booking_method','coach_set_in_person'])
     AND has_function_privilege('authenticated',p.oid,'EXECUTE')
     AND strpos(pg_get_functiondef(p.oid),'private.is_coach()')=0)),
 ('RPC: all privileged public functions use hardened search_path',
   NOT EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
     WHERE n.nspname='public' AND p.prosecdef
     AND NOT COALESCE('search_path=""'=ANY(p.proconfig),false))),
 ('RLS: client bookings SELECT checks auth.uid ownership',
   EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public'
     AND tablename='bookings' AND cmd='SELECT'
     AND qual LIKE '%auth.uid()%' AND qual LIKE '%client_id%')),
 ('RLS: wallet credits SELECT checks auth.uid ownership',
   EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public'
     AND tablename='wallet_credits' AND cmd='SELECT'
     AND qual LIKE '%auth.uid()%' AND qual LIKE '%client_id%'))
)
SELECT label, coalesce(ok,false) AS pass FROM flags ORDER BY label;
