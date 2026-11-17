// Tests the *actual staged cancellation RPC* with synthetic PG tables only.
// Never contacts Supabase Cloud, Stripe or a real customer. Runs after current
// isolated-postgres tests, which provide synthetic auth.uid/private.is_coach.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawn} from 'node:child_process';

const target=process.env.QA_DATABASE_URL;
if(!target)throw Error('QA_DATABASE_URL required');
const u=new URL(target);
if(!['localhost','127.0.0.1'].includes(u.hostname)||u.pathname!=='/alecoach_ci'||
 (u.port&&u.port!=='5432'))throw Error('Refusing non-local synthetic DB');
const source=readFileSync(new URL('../supabase/migrations/20261117173000_client_terms_refunds_48h.sql',import.meta.url),'utf8');
assert.match(source,/now\(\)\+interval '48 hours'/);
assert.match(source,/b\.starts_at-interval '2 hours'/);
assert.match(source,/refunded_amount_cents/);
assert.doesNotMatch(source,/TRUNCATE|DELETE FROM public\.bookings/i);
const start=source.indexOf('CREATE OR REPLACE FUNCTION public.cancel_unpaid_booking(');
assert.ok(start>0,'staged cancellation function missing');
const end=source.indexOf('$function$;',start);
assert.ok(end>start,'staged cancellation function delimiter missing');
let cancellation=source.slice(start,end+'$function$;'.length);
cancellation=cancellation
 .replaceAll('public.cancel_unpaid_booking','qa_policy.cancel_unpaid_booking')
 .replaceAll('public.bookings','qa_policy.bookings')
 .replaceAll('public.wallet_credits','qa_policy.wallet_credits')
 .replaceAll('public.notifications','qa_policy.notifications');

const psql=sql=>new Promise((resolve,reject)=>{
 const proc=spawn('psql',['-X','-q','-v','ON_ERROR_STOP=1','-At','-d',target,'-c',sql],{stdio:['ignore','pipe','pipe']});
 let out='',err='';proc.stdout.on('data',x=>out+=x.toString());
 proc.stderr.on('data',x=>err+=x.toString());proc.once('error',reject);
 proc.once('close',code=>resolve({code,out:out.trim(),err}));
});
async function ok(sql,label){let r=await psql(sql);assert.equal(r.code,0,label+' '+r.err.slice(0,1500));return r.out}
async function deny(sql,re,label){let r=await psql(sql);assert.notEqual(r.code,0,label);assert.match(r.err,re);console.log('PASS:',label)}
async function eq(sql,want,label){assert.equal(await ok(sql,label),String(want),label);console.log('PASS:',label)}
const client='d0000000-0000-4000-8000-000000000001';
const stranger='d0000000-0000-4000-8000-000000000002';
const wallet='d0000000-0000-4000-8000-000000000003';
const credit='d0000000-0000-4000-8000-000000000004';
const past='d0000000-0000-4000-8000-000000000005';
const inPerson='d0000000-0000-4000-8000-000000000006';
const cashPaid='d0000000-0000-4000-8000-000000000007';
const as=(uid,id)=>`BEGIN; SET LOCAL request.jwt.claim.sub='${uid}';SELECT qa_policy.cancel_unpaid_booking('${id}'::uuid);COMMIT;`;
await ok(`
 CREATE SCHEMA qa_policy;
 CREATE TABLE qa_policy.wallet_credits(id uuid primary key,remaining integer not null check (remaining>=0));
 CREATE TABLE qa_policy.bookings(
   id uuid primary key,client_id uuid not null,starts_at timestamptz,
   status text not null,payment_mode text not null,payment_status text not null,
   credit_wallet_id uuid, cancelled_at timestamptz
 );
 CREATE TABLE qa_policy.notifications(recipient_id uuid,title text,body text,kind text,booking_id uuid);
 INSERT INTO qa_policy.wallet_credits(id,remaining) VALUES ('${wallet}',0);
 INSERT INTO qa_policy.bookings(id,client_id,starts_at,status,payment_mode,payment_status,credit_wallet_id) VALUES
 ('${credit}','${client}',now()+interval '1 hour','confirmed','credit','paid','${wallet}'),
 ('${past}','${client}',now()-interval '1 minute','confirmed','credit','paid','${wallet}'),
 ('${inPerson}','${client}',now()+interval '1 hour','confirmed','in_person','due_in_person',null),
 ('${cashPaid}','${client}',now()+interval '1 hour','confirmed','in_person','paid',null);
`,'build synthetic dataset');
await ok(cancellation,'install actual staged cancellation function on synthetic tables');
await deny(as(stranger,credit),/Operazione non autorizzata/,'other clients cannot return a foreign credit');
await eq(`select remaining from qa_policy.wallet_credits where id='${wallet}';`,0,'unauthorized request cannot modify credits');
await ok(as(client,credit),'owner cancels credit booking less than 24h before start');
await eq(`select remaining from qa_policy.wallet_credits where id='${wallet}';`,1,'one Flex credit returned for late cancellation');
await eq(`select status||':'||payment_status from qa_policy.bookings where id='${credit}';`,'cancelled:refunded','booking cancelled and credit marked returned');
await deny(as(client,credit),/Stato non cancellabile/,'second cancellation cannot duplicate the credit');
await eq(`select remaining from qa_policy.wallet_credits where id='${wallet}';`,1,'duplicate cancellation has no effect');
await deny(as(client,past),/gia iniziata/,'started/no-show lessons do not restore Flex credit');
await ok(as(client,inPerson),'unpaid in-person booking cancelled without fees 1h before start');
await deny(as(client,cashPaid),/Pagamento in presenza gia registrato/,'captured cash cannot be silently erased');
await eq("select count(*) from qa_policy.notifications;",2,'only two successful cancellations notify clients');
console.log('All client late-cancellation rules pass in isolated PostgreSQL.');
