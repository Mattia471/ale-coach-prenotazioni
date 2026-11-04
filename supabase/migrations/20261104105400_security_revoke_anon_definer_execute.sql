-- Supabase Cloud: authenticated-only privileged RPCs; avoid PUBLIC inheritance.
do $secure$
declare fn record;
begin
 for fn in select p.oid::regprocedure as signature from pg_proc p
 join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.prosecdef
 loop
  execute format('revoke all on function %s from public, anon',fn.signature);
 end loop;
end;
$secure$;
revoke all on function public.expire_stale_bookings() from public, anon, authenticated;
revoke all on function public.begin_package_checkout(uuid,text) from public, anon, authenticated;
revoke all on function public.expire_package_checkout_order(uuid) from public, anon, authenticated;
revoke all on function public.settle_package_checkout_order(uuid,text) from public, anon, authenticated;
grant execute on function public.expire_stale_bookings() to service_role;
grant execute on function public.begin_package_checkout(uuid,text) to service_role;
grant execute on function public.expire_package_checkout_order(uuid) to service_role;
grant execute on function public.settle_package_checkout_order(uuid,text) to service_role;
