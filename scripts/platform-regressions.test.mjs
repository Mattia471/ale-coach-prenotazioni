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
 assert.match(app,/aria-label="Notifiche coach"/);
 assert.match(app,/className="bottom-nav coach-bottom-nav"/);
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
 assert.match(app,/INCASSI DI PROVA · SANDBOX/);
 assert.match(app,/PROSSIME LEZIONI/);
});
