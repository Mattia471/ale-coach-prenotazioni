import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('PWA mobile conserva il viewport stabile e i form senza zoom involontario',()=>{
 const html=read('index.html');
 const css=read('src/styles.css');
 assert.match(html,/maximum-scale=1,user-scalable=no,viewport-fit=cover/);
 assert.match(css,/input,textarea,select\{font-size:max\(16px,1em\)\}/);
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
test('prompt notifiche disponibile all’avvio, anche prima dell’accesso',()=>{
 const app=read('src/App.tsx');
 assert.match(app,/ACCEDI E ATTIVA/);
 assert.match(app,/ATTIVA NOTIFICHE/);
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
