import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
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
 assert.equal((sql.match(/^ROLLBACK;$/gm)||[]).length,4);
 assert.equal((sql.match(/^SET LOCAL ROLE authenticated;$/gm)||[]).length,4);
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


test('Cloudflare / Vercel CORS preflight checks approved origin and blocks lookalike domains',async()=>{
 const {runCorsPreflight}=await import('./qa-cors-preflight.mjs');
 const approved='https://ale-coach-prenotazioni.vercel.app';
 const origins=[];
 const fakeFetch=async (_url, options)=>{
  const origin=options.headers.Origin;
  origins.push(origin);
  assert.equal(options.method,'OPTIONS');
  assert.equal(options.redirect,'error');
  assert.match(options.headers['Access-Control-Request-Headers'],/authorization/);
  if(origin==='https://evil.example')return new Response('',{status:403});
  return new Response('',{status:200,headers:{
   'Access-Control-Allow-Origin':approved,
   'Access-Control-Allow-Methods':'POST, OPTIONS',
   'Vary':'Origin'
  }});
 };
 assert.deepEqual(await runCorsPreflight({allowedOrigin:approved,fetchImpl:fakeFetch}),
  ['create-checkout','cancel-booking','decide-booking']);
 assert.equal(origins.length,6);
 await assert.rejects(runCorsPreflight({allowedOrigin:'https://evil.example',fetchImpl:fakeFetch}),/approved HTTPS origin/);
 await assert.rejects(runCorsPreflight({allowedOrigin:'http://alecoach.online',fetchImpl:fakeFetch}),/approved HTTPS origin/);
 await assert.rejects(runCorsPreflight({allowedOrigin:'https://alecoach.online/',fetchImpl:fakeFetch}),/approved HTTPS origin/);
 await assert.rejects(runCorsPreflight({allowedOrigin:'https://alecoach.online/checkout',fetchImpl:fakeFetch}),/approved HTTPS origin/);
 const badFetch=async()=>new Response('',{status:200,headers:{'Access-Control-Allow-Origin':'*'}});
 await assert.rejects(runCorsPreflight({allowedOrigin:approved,fetchImpl:badFetch}),/expected HTTP 200/);
});


test('Prelaunch senza approvazione legale blocca tutti i checkout dal frontend',()=>{
 const app=read('src/App.tsx');
 const legal=read('src/legal.ts');
 assert.match(legal,/blockUnreviewedLegal\s*=\s*import\.meta\.env\.PROD\s*&&\s*!legalReady\s*&&\s*!internalQa/);
 assert.match(app,/const buyPackage=async\(p:Pack\)=>\{\s*if\(blockUnreviewedLegal\)\{submitMsg\('Acquisti non attivi:[^']*','error'\);return\}/);
 assert.match(app,/const payBooking=async\(b:Booking\)=>\{\s*if\(blockUnreviewedLegal\)\{submitMsg\('Pagamenti non attivi:[^']*','error'\);return\}/);
 assert.match(app,/onClick=\{\(\)=>void buyPackage\(p\)\} disabled=\{busy\|\|p\.type==='subscription'\|\|blockUnreviewedLegal\}/);
 assert.equal((app.match(/onClick=\{\(\)=>void payBooking\(b\)\} disabled=\{busy\|\|blockUnreviewedLegal\}/g)||[]).length,2);
 assert.match(app,/Prenotazioni non attive: informative legali non ancora approvate/);
 // The test-only QA override does not imply permission to activate live payments.
 const pages=read('scripts/cloudflare-pages-postbuild.mjs');
 assert.match(pages,/env\.VITE_PRELAUNCH_QA==='true'/);
 assert.match(pages,/NO-GO Cloudflare Pages/);
});


test('Cloudflare main production refuses legal QA bypass before publishing',async()=>{
 const {assertCloudflareRuntimeConfig}=await import('./cloudflare-pages-postbuild.mjs');
 const base={CF_PAGES:'1',CF_PAGES_BRANCH:'main',
  VITE_SUPABASE_URL:'https://mmtnzjdvvlouiwgrydlf.supabase.co',
  VITE_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_example_only'};
 assert.throws(()=>assertCloudflareRuntimeConfig({...base,VITE_PRELAUNCH_QA:'true'}),/VITE_PRELAUNCH_QA is restricted/);
 assert.doesNotThrow(()=>assertCloudflareRuntimeConfig({...base,VITE_PRELAUNCH_QA:'false'}));
 assert.throws(()=>assertCloudflareRuntimeConfig({...base,CF_PAGES_BRANCH:'qa/another-preview',VITE_PRELAUNCH_QA:'true'}),/VITE_PRELAUNCH_QA is restricted/);
 assert.throws(()=>assertCloudflareRuntimeConfig({...base,CF_PAGES_BRANCH:undefined,VITE_PRELAUNCH_QA:'true'}),/VITE_PRELAUNCH_QA is restricted/);
 assert.doesNotThrow(()=>assertCloudflareRuntimeConfig({...base,CF_PAGES_BRANCH:'qa/booking-stripe-sandbox',VITE_PRELAUNCH_QA:'true'}));
 // A non-Pages build is unaffected, preserving local and GitHub CI workflows.
 assert.doesNotThrow(()=>assertCloudflareRuntimeConfig({...base,CF_PAGES:'',VITE_PRELAUNCH_QA:'true'}));
});

test('Approved Minimal Focus visual baseline is restored pending desktop redesign',()=>{
 const base=read('src/styles.css');
 const focus=read('src/minimal-focus.css');
 const live=read('src/minimal-focus-live.css');
 assert.match(base,/\.client-layout\{max-width:516px;margin:0 auto/);
 assert.match(focus,/\.mf-workspace\{max-width:1490px;margin:0 auto/);
 assert.match(focus,/\.mf-view-key\{max-width:1000px;margin:0 auto/);
 assert.match(live,/\.mf-live \.mf-main>section,[^\n]*max-width:1000px/);
 assert.match(live,/@media\(max-width:760px\)/);
 assert.doesNotMatch(live,/V1 desktop polish|Responsive authenticated workspace:/);
 assert.doesNotMatch(base,/V1 fluid layout|V1 desktop: the public landing/);
});

test('Auth reset and signup redirect to the current trusted site origin',()=>{
 const app=read('src/App.tsx');
 assert.match(app,/resetPasswordForEmail\(authForm\.email,\{redirectTo:\`\$\{location\.origin\}\/\`\}\)/);
 assert.match(app,/emailRedirectTo:\`\$\{location\.origin\}\/\`/);
 assert.match(app,/event==='PASSWORD_RECOVERY'/);
 assert.match(app,/supabase\.auth\.updateUser\(\{password:newPassword\}\)/);
 // Prevent accidental hard-coded Vercel callback in new Auth code.
 const callbackMethods=['resetPasswordForEmail(','signUp('];
 for(const method of callbackMethods){
  const offset=app.indexOf(method);
  assert.ok(offset>=0,'Missing '+method+' Auth call');
  const callSnippet=app.slice(offset,offset+250);
  assert.ok(!callSnippet.includes('ale-coach-prenotazioni.vercel.app'),
   'Auth callback must follow current site origin, not Vercel');
 }
 const guide=read('docs/AUTH-SMTP-GO-LIVE.md');
 assert.match(guide,/ale-coach-qa-sandbox\.pages\.dev/);
 assert.match(guide,/alecoach\.online/);
 assert.match(guide,/SPF\/DKIM\/DMARC/);
});

test('Scheduled prelaunch Cloudflare checks stay read-only and never use secrets',()=>{
 const pages=read('.github/workflows/pages-live-smoke.yml');
 const auth=read('.github/workflows/pages-auth-public-smoke.yml');
 for(const workflow of [pages,auth]){
  assert.match(workflow,/workflow_dispatch:/);
  assert.match(workflow,/schedule:\s*\n\s*- cron: '[0-9]+ [0-9]+ \* \* \*'/);
  assert.match(workflow,/contents: read/);
  assert.doesNotMatch(workflow,/secrets\.|STRIPE_SECRET|SUPABASE_SERVICE_ROLE|GITHUB_TOKEN:/);
  assert.doesNotMatch(workflow,/POST|PATCH|DELETE|stripe_api_write/);
 }
 assert.match(pages,/node scripts\/qa-cloudflare-pages-smoke\.mjs/);
 assert.match(pages,/node scripts\/qa-cors-preflight\.mjs/);
 assert.match(auth,/node scripts\/qa-pages-auth-public\.mjs/);
});

test('Privacy, Termini e Cookie sono pagine consultabili senza navigazione verso l’app',()=>{
 const legal=read('src/LegalPage.tsx');
 assert.match(legal,/<span className="legal-logo">ALE COACH<\/span>/);
 assert.doesNotMatch(legal,/Torna all.app|href=["']\/["']/i);
 assert.doesNotMatch(legal,/<a href=["']\/["'] className="legal-logo"/);
 assert.match(legal,/href=\{legalPaths\.privacy\}/);
 assert.match(legal,/href=\{legalPaths\.terms\}/);
 assert.match(legal,/href=\{legalPaths\.cookies\}/);
 assert.match(legal,/kind === 'privacy'/);
 assert.match(legal,/kind === 'termini'/);
 assert.match(legal,/kind === 'cookie'/);
});

test('Cookie V1: font locali presenti con licenze e CDN Google disattivato',()=>{
 const html=read('index.html');
 const main=read('src/main.tsx');
 const css=read('src/local-fonts.css');
 const headers=read('public/_headers');
 const legal=read('src/LegalPage.tsx');
 for(const host of ['fonts.googleapis.com','fonts.gstatic.com']){
  assert.ok(!html.includes(host),'Unexpected external font host in index.html: '+host);
  assert.ok(!headers.includes(host),'Unexpected external font host in CSP: '+host);
 }
 assert.ok(main.includes("import './local-fonts.css';"),'Local fonts stylesheet not imported');
 for(const family of ["font-family:'Barlow'","font-family:'Barlow Condensed'","font-family:'Caveat'"]){
  assert.ok(css.includes(family),'Missing font face: '+family);
 }
 const files=css.split('\n').filter(line=>line.includes("src:url('/fonts/"))
  .map(line=>line.split("url('/")[1].split("')")[0]);
 assert.equal(files.length,12,'12 original font styles are required');
 assert.equal(new Set(files).size,12,'Duplicate local font path');
 for(const path of files){
  const stats=statSync(new URL('../public/'+path,import.meta.url));
  assert.ok(stats.size>10000,'Invalid local font: '+path);
 }
 for(const family of ['barlow','barlow-condensed','caveat']){
  const license=read('public/fonts/'+family+'/OFL.txt');
  assert.ok(license.includes('SIL OPEN FONT LICENSE Version 1.1'),'Missing font license: '+family);
 }
 assert.ok(legal.includes("I font dell'interfaccia sono ospitati direttamente sul dominio ALE COACH"));
 assert.ok(legal.includes('legal-tools-table'));
 for(const name of ['__cf_bm','__stripe_mid','__stripe_sid']){
  assert.ok(legal.includes(name),'Cookie transparency table missing '+name);
 }
 const app=read('src/App.tsx');
 assert.ok(app.includes('referrerPolicy="no-referrer"'),'External portrait must not receive a page referrer');
});

test('Cookie V1: nessun SDK pubblicitario o tracking CDN caricato dai sorgenti',()=>{
 const sources=['index.html','src/App.tsx','src/lib.ts','src/main.tsx',
  'src/styles.css','src/minimal-focus.css','src/minimal-focus-live.css','public/sw.js'];
 const code=sources.map(read).join('\n').toLowerCase();
 const forbidden=[
  'googletagmanager.com','google-analytics.com',
  'connect.facebook.net','facebook.com/tr?',
  'hotjar.com','clarity.ms/tag','segment.io/analytics',
  'gtag(', 'fbq(', 'fonts.googleapis.com','fonts.gstatic.com'
 ];
 for(const text of forbidden){
  assert.ok(!code.includes(text),'Unexpected external tracking resource: '+text);
 }
});


test('audit RLS/RPC covers coach cancellation and fails for newly exposed privileged RPCs',()=>{
 const audit=read('docs/QA-RPC-SECURITY-AUDIT.sql');
 assert.match(audit,/unaudited authenticated SECURITY DEFINER function/);
 assert.match(audit,/coach_cancel_confirmed_booking/);
 assert.match(audit,/coach-only RPC lacks expected guard/);
 assert.match(audit,/client RPC lacks expected auth.uid\(\) guard/);
 assert.match(audit,/anonymous EXECUTE on privileged function/);
 assert.match(audit,/server-only RPC exposed to authenticated/);
 assert.match(audit,/search_path/);
 const rls=read('docs/QA-RPC-RLS-READONLY.sql');
 assert.match(rls,/coach_cancel_confirmed_booking/);
 assert.match(rls,/cash_flag IN ARRAY ARRAY\[false,true\]/);
 assert.match(rls,/BEGIN TRANSACTION READ ONLY/);
});


test('legal privacy and cookie disclosures include observed external coach-image technical cookies',()=>{
 const legal=read('src/LegalPage.tsx');
 for(const name of ['ARRAffinitySameSite','TiPMix','x-ms-routing-name'])
  assert.ok(legal.includes(name),'Missing observed Virgin Active cookie disclosure: '+name);
 assert.match(legal,/www\.virginactive\.it/);
 assert.match(legal,/cookie tecnici di instradamento/);
 assert.match(legal,/informativa cookie/);
 assert.match(legal,/__stripe_mid/);
 assert.match(legal,/__stripe_sid/);
});


test('RC2 booking presentation separates active and historical lessons, uses recorded refund amounts',async()=>{
 const ts=await import('typescript');
 const js=ts.transpileModule(read('src/bookingPresentation.ts'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
 const {isArchivedBooking,refundSummary}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
 const now=Date.parse('2026-11-24T13:00:00Z');
 const future={status:'confirmed',starts_at:'2026-11-25T12:00:00Z',duration_minutes:60,payment_mode:'online',payment_status:'paid',amount_cents:5500,refunded_amount_cents:0,paid_at:'2026-11-23T12:00:00Z'};
 assert.equal(isArchivedBooking(future,now),false);
 assert.equal(isArchivedBooking({...future,starts_at:'2026-11-24T12:30:00Z'},now),false);
 assert.equal(isArchivedBooking({...future,starts_at:'2026-11-24T11:00:00Z'},now),true);
 for(const status of ['cancelled','rejected','expired'])assert.equal(isArchivedBooking({...future,status},now),true);
 assert.equal(isArchivedBooking({...future,status:'pending'},now),false);
 assert.equal(refundSummary(future),null);
 const full=refundSummary({...future,status:'cancelled',payment_status:'refunded',refunded_amount_cents:5500,refunded_at:'2026-11-24T13:00:00Z'});
 assert.match(full,/integrale.*55,00.*avviato/);
 assert.match(full,/tempi della tua banca/);
 const half=refundSummary({...future,status:'cancelled',payment_status:'refunded',refunded_amount_cents:2750,refunded_at:'2026-11-24T13:00:00Z'});
 assert.match(half,/50%.*27,50/);
 assert.match(refundSummary({...future,refunded_amount_cents:2750}),/attesa di conferma/);
 assert.match(refundSummary({...future,status:'rejected',payment_status:'unpaid',paid_at:null}),/Nessun importo incassato/);
 assert.match(refundSummary({...future,status:'cancelled',payment_mode:'credit',payment_status:'refunded'}),/credito Flex.*scadenza originaria/);
 assert.equal(refundSummary({...future,status:'cancelled',payment_status:'unpaid'}),null);
});

test('RC2 client feedback: only individual bookings, editable Virgin courses and accessible legal pages',()=>{
 const app=read('src/App.tsx'),legal=read('src/LegalPage.tsx'),css=read('src/minimal-focus-live.css');
 assert.ok(app.includes("s.active&&s.id==='single'"));
 assert.ok(!app.includes('Disciplina (facoltativa)'));
 assert.ok(app.includes("const editCourseBlock="));
 assert.ok(app.includes("newBlock.recurring?"));
 assert.ok(app.includes("before_minutes:isCourse?15:0"));
 assert.ok(app.includes("after_minutes:isCourse?10:0"));
 assert.ok(app.includes("const activeWallets="));
 assert.ok(app.includes("activeMyBookings.map(renderClientBooking)"));
 assert.ok(app.includes("archivedMyBookings.map(renderClientBooking)"));
 assert.ok(app.includes("Nessun orario libero nelle due sedi"));
 assert.ok(app.includes('rc2-profile-legal'));
 assert.ok(app.includes('onNavigate={kind=>'));
 assert.ok(legal.includes('onNavigate?:'));
 assert.ok(css.includes('env(safe-area-inset-bottom)'));
 assert.ok(app.includes('/ale-coach-signature.svg'));
 assert.ok(read('public/ale-coach-signature.svg').includes('fill-rule="evenodd"'));
 assert.ok(app.includes('instagram.com/alecoach.pt/'));
 assert.ok(app.includes("await subscription.unsubscribe()"));
});
