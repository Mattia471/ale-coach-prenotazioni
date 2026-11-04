-- Ale Coach: Web Push in cloud, segregated VAPID keys encrypted in Supabase Vault.
-- No private keys, webhook tokens or personal data in Git.
create extension if not exists pg_net with schema extensions;

-- This RPC is callable ONLY by the Edge service-role and returns encrypted-at-rest
-- private material for an authenticated function invocation; never exposed to clients.
create or replace function public.get_push_vapid_config()
returns jsonb language plpgsql security definer set search_path='' as $body$
declare v_private text;v_public text;v_secret text;
begin
 select decrypted_secret into v_private from vault.decrypted_secrets where name='ale_coach_vapid_private';
 select decrypted_secret into v_public from vault.decrypted_secrets where name='ale_coach_vapid_public';
 select decrypted_secret into v_secret from vault.decrypted_secrets where name='ale_coach_push_webhook_secret';
 if v_private is null or v_public is null or v_secret is null
 then raise exception 'Push config incomplete'; end if;
 return jsonb_build_object('privateKey',v_private,'publicKey',v_public,'webhookSecret',v_secret);
end;
$body$;
revoke all on function public.get_push_vapid_config() from PUBLIC, anon, authenticated;
grant execute on function public.get_push_vapid_config() to service_role;

create or replace function private.dispatch_push_on_notification()
returns trigger language plpgsql security definer set search_path='' as $body$
declare v_secret text;
begin
 select decrypted_secret into v_secret from vault.decrypted_secrets where name='ale_coach_push_webhook_secret';
 if v_secret is null then
  raise warning 'Push webhook secret absent; notification remains stored without push';
  return new;
 end if;
 -- pg_net queues a request that is sent after the DB transaction commits:
 -- it never blocks a booking if the notification provider is unavailable.
 perform net.http_post(
  url:='https://mmtnzjdvvlouiwgrydlf.supabase.co/functions/v1/push-notify',
  headers:=jsonb_build_object('Content-Type','application/json','x-ale-push-secret',v_secret),
  body:=jsonb_build_object('type','INSERT','table','notifications',
   'record',jsonb_build_object('recipient_id',new.recipient_id,'title',new.title,'body',new.body)),
  timeout_milliseconds:=5000
 );
 return new;
exception when others then
 raise warning 'Push dispatch could not be scheduled: %', SQLERRM;
 return new;
end;
$body$;
revoke all on function private.dispatch_push_on_notification() from PUBLIC,anon,authenticated;

drop trigger if exists notifications_push_dispatch on public.notifications;
create trigger notifications_push_dispatch
 after insert on public.notifications
 for each row execute function private.dispatch_push_on_notification();
