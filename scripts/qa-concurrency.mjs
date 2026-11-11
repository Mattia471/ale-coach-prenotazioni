// Only the isolated PostgreSQL service in GitHub Actions is allowed.
// This script never connects to a live Supabase database.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';

const databaseUrl=process.env.QA_DATABASE_URL;
if (!databaseUrl) throw new Error('QA_DATABASE_URL required for ephemeral database');
const url=new URL(databaseUrl);
if (!['127.0.0.1','localhost'].includes(url.hostname) || url.pathname!=='/alecoach_ci')
 throw new Error('Unsafe database target: only localhost/alecoach_ci is accepted');

const oldMigration=readFileSync(new URL('../supabase/migrations/202611030001_initial.sql',import.meta.url),'utf8');
const currentMigration=readFileSync(new URL('../supabase/migrations/20261104143000_v2_stripe_authorize_before_request.sql',import.meta.url),'utf8');
assert.match(oldMigration,/bookings_no_overlap exclude using gist/i);
assert.match(currentMigration,/for update skip locked/i);
assert.match(currentMigration,/remaining=remaining-1/i);

const psql=(sql)=>new Promise((resolve,reject)=>{
 const proc=spawn('psql',['-X','-q','-v','ON_ERROR_STOP=1','-At','-d',databaseUrl,'-c',sql],{stdio:['ignore','pipe','pipe']});
 let stdout='',stderr='';
 proc.stdout.on('data',chunk=>stdout+=chunk.toString());
 proc.stderr.on('data',chunk=>stderr+=chunk.toString());
 proc.on('error',reject);
 proc.on('close',code=>resolve({code,stdout,stderr}));
});
async function mustPass(sql){
 const result=await psql(sql);
 if(result.code!==0)throw new Error('Isolated SQL failed: '+result.stderr.slice(0,1200));
 return result.stdout.trim();
}
function ok(condition,title){assert.ok(condition,title);console.log('PASS:',title);}

await mustPass([
 'CREATE SCHEMA qa;',
 'CREATE TABLE qa.bookings (',
 ' id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,',
 ' client_id integer NOT NULL, venue_id text NOT NULL,',
 ' starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL, status text NOT NULL,',
 ' CONSTRAINT bookings_no_overlap EXCLUDE USING gist (tstzrange(starts_at, ends_at, \u0027[)\u0027) WITH &&)',
 ' WHERE (starts_at IS NOT NULL AND status IN (\u0027authorizing\u0027,\u0027pending\u0027,\u0027processing\u0027,\u0027awaiting_payment\u0027,\u0027confirmed\u0027))',
 ');',
 'CREATE TABLE qa.wallet_credits(id integer PRIMARY KEY, remaining integer NOT NULL CHECK (remaining>=0));',
 'INSERT INTO qa.wallet_credits(id,remaining) VALUES(1,1);'
].join('\n'));

function booking(client,venue,status){
 return [
  'BEGIN;',
  "SET LOCAL lock_timeout='5s';",
  "INSERT INTO qa.bookings(client_id,venue_id,starts_at,ends_at,status)",
  "VALUES("+client+",'"+venue+"','2027-02-10 10:00+01','2027-02-10 11:00+01','"+status+"');",
  'SELECT pg_sleep(1.0);',
  'COMMIT;'
 ].join('\n');
}
const bookings=await Promise.all([psql(booking(1,'talenti','pending')),psql(booking(2,'nuovo_salario','authorizing'))]);
ok(bookings.filter(x=>x.code===0).length===1&&bookings.filter(x=>x.code!==0&&/exclusion constraint/i.test(x.stderr)).length===1,
 'two simultaneous customers: exactly one slot reservation succeeds across both venues');
ok((await mustPass("SELECT count(*) FROM qa.bookings WHERE status IN ('pending','authorizing','confirmed');"))==='1',
 'only one active booking persists');

const creditSql=[
 'BEGIN;',
 "SET LOCAL lock_timeout='5s';",
 'WITH picked AS (SELECT id FROM qa.wallet_credits WHERE remaining>0 ORDER BY id FOR UPDATE SKIP LOCKED LIMIT 1),',
 'debited AS (UPDATE qa.wallet_credits c SET remaining=remaining-1 FROM picked WHERE c.id=picked.id RETURNING c.id)',
 "SELECT 'DEBITS='||count(*) FROM debited;",
 'SELECT pg_sleep(1.0);',
 'COMMIT;'
].join('\n');
const debits=await Promise.all([psql(creditSql),psql(creditSql)]);
ok(debits.every(x=>x.code===0),'both credit transactions complete safely');
const count=debits.map(x=>Number(x.stdout.match(/DEBITS=(\d+)/)?.[1]??-1)).sort().join(',');
ok(count==='0,1','only one customer gets the last credit');
ok((await mustPass('SELECT remaining FROM qa.wallet_credits WHERE id=1;'))==='0','wallet cannot become negative');

await mustPass('UPDATE qa.wallet_credits SET remaining=1 WHERE id=1;');
const conflicted=await psql([
 'BEGIN;',
 'UPDATE qa.wallet_credits SET remaining=remaining-1 WHERE id=1;',
 "INSERT INTO qa.bookings(client_id,venue_id,starts_at,ends_at,status) VALUES(3,'talenti','2027-02-10 10:00+01','2027-02-10 11:00+01','pending');",
 'COMMIT;'
].join('\n'));
ok(conflicted.code!==0&&/exclusion constraint/i.test(conflicted.stderr),
 'a conflicting booking aborts the credit consumption transaction');
ok((await mustPass('SELECT remaining FROM qa.wallet_credits WHERE id=1;'))==='1',
 'failed booking restores the credit via SQL transaction rollback');

await mustPass("UPDATE qa.bookings SET status='rejected';");
await mustPass("INSERT INTO qa.bookings(client_id,venue_id,starts_at,ends_at,status) VALUES(4,'talenti','2027-02-10 10:00+01','2027-02-10 11:00+01','confirmed');");
ok((await mustPass("SELECT count(*) FROM qa.bookings WHERE status='confirmed';"))==='1',
 'rejection releases an occupied slot for a new confirmed booking');
console.log('All isolated PostgreSQL concurrency tests passed. No customer data accessed.');
