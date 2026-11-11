import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('PWA mobile conserva il viewport stabile e i form senza zoom involontario',()=>{
 const html=read('index.html');
 const css=read('src/styles.css');
 assert.match(html,/name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"/);
 assert.doesNotMatch(html,/user-scalable=no|maximum-scale=1/);
 assert.match(css,/input:not\(\[type="checkbox"\]\):not\(\[type="radio"\]\),textarea,select\{font-size:16px\}/);
 assert.match(css,/touch-action:manipulation/);
});
test('PWA identifica correttamente la web app installabile',()=>{
 const manifest=JSON.parse(read('public/manifest.webmanifest'));
 assert.equal(manifest.display,'standalone');
 assert.equal(manifest.id,'/');
 assert.equal(manifest.scope,'/');
 assert(manifest.icons.some(x=>x.sizes==='192x192'));
 assert(manifest.icons.some(x=>x.sizes==='512x512'));
});
test('banner notifiche flottante sopra la navigazione, senza spostare la dashboard',()=>{
 const app=read('src/App.tsx');
 const css=read('src/styles.css');
 assert.match(app,/Boolean\(profile\)&&!pushEnabled&&!pushBannerDismissed/);
 assert.match(app,/ale-push-prompt-dismissed-v2/);
 assert.match(app,/dismissPushBanner/);
 assert.match(app,/30\*24\*60\*60\*1000/);
 assert.match(css,/\.push-permission-banner\{\s*position:fixed/);
 assert.match(css,/bottom:calc\(90px \+ env\(safe-area-inset-bottom\)\)/);
 assert.match(css,/\.coach-shell \.push-permission-banner/);
 assert.match(app,/Notification\.requestPermission\(\)/);
 assert.match(app,/getSubscription\(\)/);
 assert.match(app,/push_subscriptions/);
});
test('push passa dal service worker e dal webhook protetto su cloud',()=>{
 const worker=read('public/sw.js');
 const fn=read('supabase/functions/push-notify/index.ts');
 const migration=read('supabase/migrations/20261104165000_pwa_push_delivery_vault_net.sql');
 assert.match(worker,/addEventListener\('push'/);
 assert.match(fn,/x-ale-push-secret/);
 assert.match(migration,/notifications_push_dispatch/);
 assert.match(migration,/vault\.decrypted_secrets/);
});
test('ritratto ufficiale del coach presente con fallback e link professionale',()=>{
 const app=read('src/App.tsx');
 assert.match(app,/function CoachPhoto/);
 assert.match(app,/function CoachIntroduction/);
 assert.match(app,/function CoachPhoto[\s\S]*onError=\{\(\)=>setUnavailable\(true\)\}/);
 assert.match(app,/virginactive\.it\/people\/alessandro--cola-a-cola/);
});
test('release base conferma usando agenda interna, senza obbligo Google',()=>{
 const migration=read('supabase/migrations/20261104200000_internal_calendar_base_release.sql');
 const app=read('src/App.tsx');
 assert.match(migration,/create or replace function public\.claim_booking_decision/);
 assert.match(migration,/create or replace function private\.revalidate_booking_on_confirm/);
 assert.match(migration,/private\.coach_slot_is_free/);
 assert.match(migration,/public\.calendar_closures/);
 assert.doesNotMatch(migration,/select 1 from public\.google_calendar_sync/);
 assert.match(app,/Agenda interna attiva/);
 assert.doesNotMatch(app,/Eventi sincronizzati da Google/);
});
test('checkout prenotazione autorizza la carta prima dell’invio al coach',()=>{
 const fn=read('supabase/functions/create-checkout/index.ts');
 const app=read('src/App.tsx');
 assert.match(fn,/capture_method:'manual'/);
 assert.match(fn,/kind:'booking_authorization'/);
 assert.match(app,/status==='authorizing'/);
 assert.match(app,/payment_status==='authorized'/);
});
test('Stripe webhook riconcilia i pagamenti senza incassare prima della decisione',()=>{
 const webhook=read('supabase/functions/stripe-webhook/index.ts');
 assert.match(webhook,/finalize_booking_authorization/);
 assert.match(webhook,/payment_intent\.succeeded/);
 assert.match(webhook,/payment_intent\.canceled/);
 assert.match(webhook,/checkout\.session\.expired/);
 assert(!webhook.includes('stripe.paymentIntents.capture('));
});
test('il cron cancella solo preautorizzazioni scadute, non incassa denaro',()=>{
 const worker=read('supabase/functions/reconcile-authorizations/index.ts');
 const sql=read('supabase/migrations/20261104174000_stripe_authorization_expiration_cloud.sql');
 assert.match(worker,/paymentIntents\.cancel\(/);
 assert(!worker.includes('paymentIntents.capture('));
 assert.match(worker,/idempotencyKey/);
 assert.match(sql,/ale-coach-release-stripe-authorizations/);
 assert.match(sql,/revoke all on function public.get_stripe_housekeeping_token\(\)/i);
});

test('recupero password Supabase con conferma e senza link diretto allo stato cliente',()=>{
 const app=read('src/App.tsx');
 assert.match(app,/event==='PASSWORD_RECOVERY'/);
 assert.match(app,/auth\.updateUser\(\{password:newPassword\}\)/);
 assert.match(app,/newPassword!==confirmPassword/);
 assert.match(app,/passwordRecovery\?<div className="auth-card"/);
});


test('agenda base consente impegni e chiusure senza sincronizzazione Google',()=>{
 const app=read('src/App.tsx');
 assert.match(app,/const createManualBlock=async/);
 assert.match(app,/source_ref:'manual'/);
 assert.match(app,/valid_from:newBlock\.on_date/);
 assert.match(app,/const createClosure=async/);
 assert.match(app,/calendar_closures'\)\.insert/);
 assert.match(app,/courseBlocks\.filter\(b=>b\.source_ref!=='manual'\)/);
});

test('QA coach: notifiche accessibili da desktop e mobile, senza aprire Stripe',()=>{
 const app=read('src/App.tsx');
 const types=read('src/types.ts');
 const css=read('src/styles.css');
 assert.match(types,/CoachTab=.*'messages'.*'history'.*'more'/);
 assert.match(app,/aria-label="Apri notifiche"/);
 assert.match(app,/className=\{`mf-mobile-nav \$\{managementOpen\?/);
 assert.match(app,/aria-label="Navigazione coach"/);
 assert.match(app,/aria-label="Chiudi Gestione"/);
 assert.match(app,/NOTIFICHE COACH/);
 assert.match(app,/void markNotices\(\)/);
 assert.match(css,/@media\(max-width:719px\)/);
});
test('QA coach: disdette notificano il coach, con controllo idempotenza',()=>{
 const sql=read('supabase/migrations/20261104164054_qa_coach_client_cancellation_notifications.sql');
 assert.match(sql,/after update of status on public\.bookings/i);
 assert.match(sql,/new\.status = 'cancelled'/i);
 assert.match(sql,/v_actor <> new\.client_id/i);
 assert.match(sql,/not exists \(/i);
 assert.match(sql,/from public\.profiles p/i);
 assert.match(sql,/p\.role = 'coach'/i);
});
test('QA coach: cronologia clienti e palinsesto visibili, sandbox distinta',()=>{
 const app=read('src/App.tsx');
 assert.match(app,/Storico lezioni/);
 assert.match(app,/agenda-extra/);
 assert.match(app,/DA VERIFICARE · SLOT BLOCCATI/);
 assert.match(app,/internalQa/);
 assert.doesNotMatch(app,/Luca Bianchi|Giulia Rossi|Marco Verdi/);
 assert.match(app,/PROSSIME LEZIONI/);
});


test('Minimal Focus: il calendario legge prenotazioni reali senza introdurre dati simulati',()=>{
 const app=read('src/App.tsx');
 const calendar=read('src/FocusWeekCalendar.tsx');
 const entry=read('src/main.tsx');
 const css=read('src/minimal-focus-live.css');
 assert.match(app,/FocusWeekCalendar bookings=\{myBookings\}/);
 assert.match(app,/FocusWeekCalendar bookings=\{bookings\.filter/);
 assert.match(app,/clientTab==='book'/);
 assert.match(app,/coachTab==='requests'/);
 assert.match(app,/supabase\.rpc\('create_booking_v2'/);
 assert.match(app,/void buyPackage\(p\)/);
 assert.match(app,/void coachAction\(b,'approve'\)/);
 assert.match(app,/CoachIntroduction compact/);
 assert.match(calendar,/timeZone:'Europe\/Rome'/);
 assert.match(entry,/import '\.\/minimal-focus-live\.css'/);
 assert.match(css,/\.mf-root\.mf-live/);
 assert.doesNotMatch(app,/Luca Bianchi|Giulia Rossi|Marco Verdi/);
});


test('Agenda coach: calendario standalone senza la card esterna annidata',()=>{
 const app=read('src/App.tsx');
 const css=read('src/styles.css');
 assert.match(app,/\{coachTab==='agenda'&&<section className="mf-live-coach-agenda">/);
 assert.match(app,/<div className="coach-content mf-agenda-list">/);
 assert.doesNotMatch(app,/\{coachTab==='agenda'&&<section className="coach-content mf-live-coach-agenda">/);
 assert.match(css,/\.mf-live \.mf-live-coach-agenda \.mf-agenda-list\{margin-top:0\}/);
});

test('Messaggi transitori: info, errori e conferme si chiudono dopo 3 secondi',()=>{
 const app=read('src/App.tsx');
 assert.match(app,/window\.setTimeout\(\(\)=>setMessage\(null\),3000\)/);
 assert.match(app,/window\.clearTimeout\(timeout\)/);
 assert.match(app,/setMessage\(\{text,mode\}\)/);
});

test('Switch mobile: proporzioni originali e area touch espansa',()=>{
 const css=read('src/styles.css');
 assert.match(css,/button:not\(\.mf-day\):not\(\.switch\)/);
 assert.match(css,/\.mf-root button\.switch\{position:relative;width:46px;min-width:46px;height:27px;min-height:27px/);
 assert.match(css,/\.mf-root button\.switch::after/);
});


test('Notifiche: apertura prenotazione marca letta senza bypass RLS',()=>{
 const app=read('src/App.tsx');
 assert.match(app,/const openNoticeBooking=\(n:Notice\)=>\{/);
 assert.match(app,/if\(!isCoach&&booking\.client_id!==profile\?\.id\)/);
 assert.match(app,/if\(!n\.read_at\)void markNotices\(\[n\.id\]\)/);
 assert.match(app,/onClick=\{\(\)=>openNoticeBooking\(n\)\}/);
 assert.match(app,/setFocusedBookingId\(booking\.id\)/);
 assert.match(app,/\.eq\('recipient_id',profile\.id\)/);
});


test('RPC cancellazione non pagata rifiuta identità assente senza alterare policy 24h o crediti',()=>{
 const sql=read('supabase/migrations/20261110144000_cancel_unpaid_booking_null_identity.sql');
 assert.match(sql,/CREATE OR REPLACE FUNCTION public\.cancel_unpaid_booking/i);
 assert.match(sql,/SECURITY DEFINER/);
 assert.match(sql,/SET search_path TO ''/);
 assert.match(sql,/v_b\.client_id IS DISTINCT FROM auth\.uid\(\)/);
 assert.match(sql,/not coalesce\(private\.is_coach\(\),false\)/);
 assert.doesNotMatch(sql,/v_b\.client_id\s*<>\s*auth\.uid\(\)/);
 assert.match(sql,/interval '24 hours'/);
 assert.match(sql,/public\.wallet_credits set remaining=remaining\+1/);
 assert.match(sql,/public\.notifications\(/);
 assert.match(sql,/v_b\.payment_mode='online' then raise exception/);
});


test('Stripe Sandbox: scadenza checkout pacchetto non lascia ordini pending e non tocca quelli paid',()=>{
 const webhook=read('supabase/functions/stripe-webhook/index.ts');
 const start=webhook.indexOf("if(event.type==='checkout.session.expired')");
 const end=webhook.indexOf("if(event.type==='payment_intent.succeeded')",start);
 assert(start>=0&&end>start);
 const expiryBranch=webhook.slice(start,end);
 assert.match(expiryBranch,/session\.metadata\?\.kind==='package'/);
 assert.match(expiryBranch,/session\.metadata\.order_id/);
 assert.match(expiryBranch,/admin\.from\('package_checkout_orders'\)/);
 assert.match(expiryBranch,/\.update\(\{status:'expired'\}\)/);
 assert.match(expiryBranch,/\.eq\('stripe_session_id',session\.id\)/);
 assert.match(expiryBranch,/\.eq\('status','pending'\)/);
 assert.doesNotMatch(expiryBranch,/wallet_credits|remaining=remaining|refunds\.create/);
 assert.match(expiryBranch,/session\.metadata\?\.kind!=='booking_authorization'/);
});


test('QA SQL autorizzazioni e RLS non altera dati e impone rollback',()=>{
 const sql=read('docs/QA-RPC-RLS-READONLY.sql');
 assert.match(sql,/BEGIN TRANSACTION READ ONLY;/);
 assert.equal((sql.match(/^ROLLBACK;$/gm)||[]).length,3);
 assert.equal((sql.match(/^SET LOCAL ROLE authenticated;$/gm)||[]).length,3);
 assert.match(sql,/SET LOCAL statement_timeout='5s'/);
 assert.match(sql,/has_table_privilege\(current_user,'public\.package_checkout_orders','SELECT'\)/);
 assert.match(sql,/v_b\.client_id IS DISTINCT FROM auth\.uid\(\)/);
 assert.match(sql,/claim_booking_cancellation/);
 assert.match(sql,/cancel_unpaid_booking/);
 assert.match(sql,/create_booking_v2/);
 assert.match(sql,/reserve_slot_v2/);
 assert.match(sql,/pg_get_functiondef/);
 assert.match(sql,/public\.wallet_credits where client_id IS DISTINCT FROM auth\.uid\(\)/);
 assert.doesNotMatch(sql,/^\s*(?:INSERT|UPDATE|DELETE|TRUNCATE|COMMIT|ALTER|DROP)\s/mi);
});


test('P0 backup: cifratura in streaming, nessun dump plaintext e restore drill separato',()=>{
 const backup=read('scripts/backup-cloud-encrypted.sh');
 const verify=read('scripts/verify-encrypted-backup.sh');
 const docs=read('docs/BACKUP-RESTORE-RUNBOOK.md');
 assert.match(backup,/set -Eeuo pipefail/);
 assert.match(backup,/PGSERVICE/);
 assert.match(backup,/PGPASSFILE/);
 assert.match(backup,/BACKUP_DIR/);
 assert.match(backup,/pg_dump --format=custom[\s\S]*?\|\s*\n\s*age --recipient/);
 assert.match(backup,/Refusing to save customer backup inside Git repository/);
 assert.match(backup,/trap cleanup EXIT/);
 assert.match(verify,/age --decrypt[\s\S]*?\|\s*node --input-type=module/);
 assert.match(verify,/PGDMP/);
 assert.match(docs,/Supabase Storage separato/);
 assert.match(docs,/Non equivale a un restore riuscito/);
 assert.doesNotMatch(backup,/--password|STRIPE_SECRET_KEY|SUPABASE_SERVICE_ROLE_KEY/);
});
