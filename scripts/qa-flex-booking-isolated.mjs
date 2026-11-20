// QA 93–95. Runs only after qa-credit-cancellation-isolated.mjs in ephemeral CI.
// Imports the REAL create_booking_v2 RPC and stubs only slot availability.
// Never connects to Supabase Cloud, Stripe, or customer data.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {readFileSync} from 'node:fs';

const target=process.env.QA_DATABASE_URL;
if (!target) throw new Error('QA_DATABASE_URL is required');
const url=new URL(target);
if (!['localhost','127.0.0.1'].includes(url.hostname) ||
    url.pathname!=='/alecoach_ci' || (url.port && url.port!=='5432')) {
  throw new Error('Refusing any non-isolated database');
}
const script=readFileSync(new URL('../supabase/migrations/20261104143000_v2_stripe_authorize_before_request.sql',import.meta.url),'utf8');
const start=script.indexOf('CREATE OR REPLACE FUNCTION public.create_booking_v2(');
const end=script.indexOf('$function$;',start);
assert.ok(start>=0&&end>start,'Latest create_booking_v2 migration source missing');
const actualRpc=script.slice(start,end+'$function$;'.length);
assert.match(actualRpc,/remaining>0 and expires_at>v_start/);
assert.match(actualRpc,/for update skip locked/);
assert.match(actualRpc,/remaining=remaining-1/);
assert.match(actualRpc,/pg_advisory_xact_lock/);

function psql(sql) {
  return new Promise((resolve,reject)=>{
    const proc=spawn('psql',['-X','-q','-v','ON_ERROR_STOP=1','-At','-d',target,'-c',sql],{stdio:['ignore','pipe','pipe']});
    let stdout='',stderr='';
    proc.stdout.on('data',chunk=>stdout+=chunk.toString());
    proc.stderr.on('data',chunk=>stderr+=chunk.toString());
    proc.once('error',reject);
    proc.once('close',code=>resolve({code,stdout:stdout.trim(),stderr}));
  });
}
async function must(sql,label) {
  const r=await psql(sql);
  assert.equal(r.code,0,(label||'SQL')+': '+r.stderr.slice(0,1800));
  return r.stdout;
}
async function equals(sql,expected,label) {
  assert.equal(await must(sql,label),String(expected),label);
  console.log('PASS:',label);
}
async function rejects(sql,match,label) {
  const r=await psql(sql);
  assert.notEqual(r.code,0,label+': operation must be denied');
  assert.match(r.stderr,match,label+': '+r.stderr.slice(0,900));
  console.log('PASS:',label);
}

await must([
  // Earlier QA suite creates the public test tables without full booking columns.
  "ALTER TABLE public.wallet_credits ADD COLUMN client_id uuid;",
  "ALTER TABLE public.wallet_credits ADD COLUMN expires_at timestamptz;",
  "ALTER TABLE public.bookings ALTER COLUMN id SET DEFAULT gen_random_uuid();",
  "ALTER TABLE public.bookings ADD COLUMN venue_id text;",
  "ALTER TABLE public.bookings ADD COLUMN duration_minutes integer;",
  "ALTER TABLE public.bookings ADD COLUMN discount_percent integer;",
  "ALTER TABLE public.bookings ADD COLUMN promo_code text;",
  "ALTER TABLE public.bookings ADD COLUMN details jsonb;",
  "ALTER TABLE public.bookings ADD COLUMN source text;",
  "ALTER TABLE public.bookings ADD COLUMN referral text;",
  "CREATE TABLE public.profiles(id uuid PRIMARY KEY,role text NOT NULL DEFAULT 'client',virgin_member boolean NOT NULL,allow_in_person boolean NOT NULL DEFAULT false,full_name text NOT NULL,first_contact_at timestamptz NOT NULL DEFAULT now());",
  "CREATE TABLE public.services(id text PRIMARY KEY,active boolean NOT NULL,kind text NOT NULL,duration_minutes integer NOT NULL,price_cents integer NOT NULL);",
  "CREATE TABLE public.discount_codes(code text PRIMARY KEY,active boolean NOT NULL,first_purchase_only boolean NOT NULL,valid_days_from_contact integer,percent_off integer NOT NULL);",
  // This deliberately provides ONLY fixed synthetic availability, not the live slot RPC.
  "CREATE FUNCTION public.available_slots_v2(p_service_id text,p_day date,p_venue_preference text) RETURNS TABLE(start_minute integer,venue_id text) LANGUAGE sql STABLE AS $stub$",
  " SELECT t.minute,'qa_venue'::text FROM (VALUES(600),(660),(720),(780)) AS t(minute)",
  " WHERE p_venue_preference='qa_venue' AND p_service_id IN('single','couple');",
  "$stub$;",
  "INSERT INTO public.services VALUES ('single',true,'paid',60,5000),('couple',true,'paid',60,8000);",
  "INSERT INTO public.profiles(id,role,virgin_member,full_name) VALUES",
  "('b0000000-0000-4000-8000-000000000001','client',true,'Synthetic Flex QA'),",
  "('b0000000-0000-4000-8000-000000000002','client',true,'Synthetic Other QA'),",
  "('b0000000-0000-4000-8000-000000000003','client',false,'Synthetic Not Eligible QA');"
].join('\n'),'Synthetic booking scaffolding');
await must(actualRpc,'Real booking RPC');
console.log('PASS: actual create_booking_v2 imported into isolated PostgreSQL with fixed synthetic slot stub');

const day=await must("select ((now() at time zone 'Europe/Rome')::date+5)::text");
assert.match(day,/^\d{4}-\d{2}-\d{2}$/);
const owner='b0000000-0000-4000-8000-000000000001';
const other='b0000000-0000-4000-8000-000000000002';
const ineligible='b0000000-0000-4000-8000-000000000003';
const walletId=n=>'b2000000-0000-4000-8000-'+String(n).padStart(12,'0');

await must([
  "INSERT INTO public.wallet_credits(id,remaining,client_id,expires_at) VALUES",
  "('"+walletId(1)+"',0,'"+owner+"',now()+interval '20 days'),",
  "('"+walletId(2)+"',1,'"+owner+"',now()+interval '1 day'),",
  "('"+walletId(3)+"',2,'"+other+"',now()+interval '20 days'),",
  "('"+walletId(4)+"',1,'"+owner+"',('"+day+" 10:00'::timestamp at time zone 'Europe/Rome'));"
].join('\n'),'Seed synthetic credit cases');

function book(actor,minute=600,service='single',details='{}') {
  const jwt=actor?"SET LOCAL request.jwt.claim.sub='"+actor+"';":"SET LOCAL request.jwt.claim.sub='';";
  const sql="SELECT public.create_booking_v2('"+service+"','qa_venue','"+day+"'::date,"+minute+",'"+details+"'::jsonb,'credit',NULL,'qa',NULL);";
  return 'BEGIN; '+jwt+' '+sql+' COMMIT;';
}
await rejects(book(null),/Devi accedere/i,'anonymous booking rejected before any credit operation');
await rejects(book(ineligible),/Per prenotare occorre iscrizione/i,'non-eligible client cannot book');
await rejects(book(owner),/Crediti insufficienti o in scadenza prima della lezione/i,'depleted, expiring-before-lesson and exact-expiry credits all rejected');
await rejects(book(owner,600,'couple','{"partner":"QA test"}'),/Crediti validi solo per individuale/i,'Flex credit is restricted to individual lessons');
await equals("SELECT count(*) FROM public.bookings WHERE client_id='"+owner+"';",'0','denied requests create no booking');
await equals("SELECT remaining FROM public.wallet_credits WHERE id='"+walletId(2)+"';",'1','credit expiring after today but before the lesson remains untouched');
await equals("SELECT remaining FROM public.wallet_credits WHERE id='"+walletId(4)+"';",'1','credit expiring exactly at lesson start is rejected (strict >)');

await must("INSERT INTO public.wallet_credits(id,remaining,client_id,expires_at) VALUES ('"+walletId(5)+"',1,'"+owner+"',now()+interval '20 days');");
const created=await must(book(owner,600),'One valid Flex booking');
assert.match(created,/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i);
console.log('PASS: credit valid past lesson start creates exactly one booking');
await equals("SELECT status||':'||payment_mode||':'||credit_wallet_id::text FROM public.bookings WHERE id='"+created+"';",
 'pending:credit:'+walletId(5),'booking references wallet and starts pending');
await equals("SELECT remaining FROM public.wallet_credits WHERE id='"+walletId(5)+"';",'0','successful booking debits one credit immediately');
await rejects(book(owner,660),/Crediti insufficienti o in scadenza prima della lezione/i,'second booking without valid credits fails');
await equals("SELECT count(*) FROM public.bookings WHERE client_id='"+owner+"';",'1','failed second attempt leaves one booking only');

await must("INSERT INTO public.wallet_credits(id,remaining,client_id,expires_at) VALUES ('"+walletId(6)+"',1,'"+owner+"',now()+interval '20 days');");
const requests=await Promise.all([psql(book(owner,660)),psql(book(owner,720))]);
assert.equal(requests.filter(x=>x.code===0).length,1,'exactly one concurrent booking must succeed');
assert.equal(requests.filter(x=>x.code!==0&&/Crediti insufficienti o in scadenza prima della lezione/i.test(x.stderr)).length,1,
 'the other concurrent booking must fail with insufficient credit');
console.log('PASS: parallel credit bookings consume the last valid credit only once');
await equals("SELECT remaining FROM public.wallet_credits WHERE id='"+walletId(6)+"';",'0','concurrent use cannot make the last credit negative');
await equals("SELECT count(*) FROM public.bookings WHERE client_id='"+owner+"';",'2','exactly two successful credit bookings persisted');
await equals("SELECT count(*) FROM public.wallet_credits WHERE remaining<0;",'0','no wallet becomes negative');
await equals("SELECT count(*) FROM public.bookings WHERE client_id='"+owner+"' AND credit_wallet_id='"+walletId(3)+"';",'0','wallet from a different client is never consumed');
await equals("SELECT remaining FROM public.wallet_credits WHERE id='"+walletId(3)+"';",'2','other client balance remains unchanged');

console.log('PASS: QA 93/94/95 real booking RPC negative/expiry/parallel credit tests complete with synthetic data only.');
