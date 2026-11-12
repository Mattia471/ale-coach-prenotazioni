// Exercises the actual deployed-source cancellation RPC in a synthetic, ephemeral PG database.
// Never connects to Supabase Cloud or handles actual customers. Enforce localhost only.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';

const databaseUrl=process.env.QA_DATABASE_URL;
if(!databaseUrl)throw new Error('QA_DATABASE_URL required');
const url=new URL(databaseUrl);
if(!['127.0.0.1','localhost'].includes(url.hostname)||url.pathname!=='/alecoach_ci')
 throw new Error('Refusing non-isolated database target');

const migration=readFileSync(new URL('../supabase/migrations/20261110144000_cancel_unpaid_booking_null_identity.sql',import.meta.url),'utf8');
assert.match(migration,/CREATE OR REPLACE FUNCTION public\.cancel_unpaid_booking/i);
const psql=sql=>new Promise((resolve,reject)=>{
 const proc=spawn('psql',['-X','-q','-v','ON_ERROR_STOP=1','-At','-d',databaseUrl,'-c',sql],{stdio:['ignore','pipe','pipe']});
 let stdout='',stderr='';
 proc.stdout.on('data',c=>stdout+=c.toString());
 proc.stderr.on('data',c=>stderr+=c.toString());
 proc.once('error',reject);
 proc.once('close',code=>resolve({code,stdout:stdout.trim(),stderr}));
});
async function passSql(sql){
 const result=await psql(sql);
 assert.equal(result.code,0,result.stderr.slice(0,1400));
 return result.stdout;
}
async function denied(sql,expected,label){
 const r=await psql(sql);
 assert.notEqual(r.code,0,label+': should be denied');
 assert.match(r.stderr,new RegExp(expected,'i'),label+': '+r.stderr.slice(0,600));
 console.log('PASS:',label);
}
async function is(sql,expected,label){
 assert.equal(await passSql(sql),String(expected),label);
 console.log('PASS:',label);
}
const owner='11111111-1111-4111-8111-111111111111';
const other='22222222-2222-4222-8222-222222222222';
const booking='33333333-3333-4333-8333-333333333333';
const soon='44444444-4444-4444-8444-444444444444';
const online='55555555-5555-4555-8555-555555555555';
const wallet='66666666-6666-4666-8666-666666666666';
const walletSoon='77777777-7777-4777-8777-777777777777';
const walletOnline='88888888-8888-4888-8888-888888888888';
function invoke(id,user){
 const jwt=user?"SET LOCAL request.jwt.claim.sub='"+user+"';":"SET LOCAL request.jwt.claim.sub='';";
 return "BEGIN; "+jwt+" SELECT public.cancel_unpaid_booking('"+id+"'::uuid); COMMIT;";
}
await passSql(`
 CREATE SCHEMA IF NOT EXISTS auth;
 CREATE SCHEMA IF NOT EXISTS private;
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $q$
  SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
 $q$;
 CREATE FUNCTION private.is_coach() RETURNS boolean LANGUAGE sql STABLE AS $q$
  SELECT false
 $q$;
 CREATE TABLE public.wallet_credits(id uuid PRIMARY KEY,remaining integer NOT NULL CHECK(remaining>=0));
 CREATE TABLE public.bookings(
   id uuid PRIMARY KEY,client_id uuid NOT NULL,payment_mode text NOT NULL,
   starts_at timestamptz,status text NOT NULL,credit_wallet_id uuid,
   payment_status text, cancelled_at timestamptz
 );
 CREATE TABLE public.notifications(
   recipient_id uuid NOT NULL,title text,body text,kind text,booking_id uuid
 );
 INSERT INTO public.wallet_credits(id,remaining) VALUES
  ('${wallet}',0),('${walletSoon}',0),('${walletOnline}',0);
 INSERT INTO public.bookings(id,client_id,payment_mode,starts_at,status,credit_wallet_id,payment_status) VALUES
  ('${booking}','${owner}','credit',now()+interval '5 days','confirmed','${wallet}','unpaid'),
  ('${soon}','${owner}','credit',now()+interval '2 hours','confirmed','${walletSoon}','unpaid'),
  ('${online}','${owner}','online',now()+interval '5 days','confirmed','${walletOnline}','paid');
`);
await passSql(migration);
console.log('PASS: actual cancellation migration loaded into an ephemeral database');

await denied(invoke(booking,other),'Operazione non autorizzata','another client cannot cancel the booking');
await denied(invoke(booking,null),'Operazione non autorizzata','missing JWT cannot cancel the booking');
await is("SELECT status||':'||remaining FROM public.bookings b JOIN public.wallet_credits w ON w.id=b.credit_wallet_id WHERE b.id='"+booking+"';",'confirmed:0','denied actions do not change booking or credit');

await denied(invoke(soon,owner),'Disdetta online non disponibile nelle 24 ore precedenti','24-hour cancellation window enforced');
await denied(invoke(online,owner),'Per annullare richieste online usa il server Stripe','online payment cannot be cancelled without Stripe server');

await passSql(invoke(booking,owner));
await is("SELECT status||':'||payment_status||':'||remaining FROM public.bookings b JOIN public.wallet_credits w ON w.id=b.credit_wallet_id WHERE b.id='"+booking+"';",'cancelled:refunded:1','successful cancellation restores exactly one credit');
await is("SELECT count(*) FROM public.notifications WHERE booking_id='"+booking+"';",'1','exactly one client notification created');

await denied(invoke(booking,owner),'Stato non cancellabile','a repeated cancellation is denied');
await is("SELECT remaining FROM public.wallet_credits WHERE id='"+wallet+"';",'1','repeating cancellation never duplicates the credit');
await is("SELECT COUNT(*) FROM public.bookings WHERE status='confirmed';",'2','rejected online / under-24h cancellations remain confirmed');
console.log('All actual-source cancellation and credit-restoration tests PASSED in isolated PostgreSQL only.');
