// Simulates the future ALE COACH public-signup GO and emergency rollback,
// applying the ACTUAL staged SQL files to ephemeral localhost/alecoach_ci only.
// Runs AFTER scripts/qa-signup-allowlist-isolated.mjs in CI; no cloud writes.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawn} from 'node:child_process';

const target=process.env.QA_DATABASE_URL;
if(!target)throw Error('QA_DATABASE_URL required for isolated signup GO regression');
const url=new URL(target);
if(!['localhost','127.0.0.1'].includes(url.hostname)||
 url.pathname!=='/alecoach_ci'||(url.port&&url.port!=='5432'))
 throw Error('Unsafe signup GO target: localhost/alecoach_ci required');

const go=readFileSync(new URL('../docs/sql/V1-GO-PUBLIC-SIGNUP-NOT-APPLIED.sql',import.meta.url),'utf8');
const rollback=readFileSync(new URL('../docs/sql/V1-ROLLBACK-RESTORE-SIGNUP-ALLOWLIST-NOT-APPLIED.sql',import.meta.url),'utf8');
assert.match(go,/CREATE OR REPLACE FUNCTION private\.on_signup\(\)/i);
assert.match(rollback,/private\.prelaunch_allowed_emails/i);
for(const sql of [go,rollback]){
 assert.match(sql,/REVOKE ALL ON FUNCTION private\.on_signup\(\) FROM PUBLIC, anon, authenticated/i);
 assert.doesNotMatch(sql,/\b(TRUNCATE|DELETE FROM|DROP TABLE|DROP SCHEMA)\b/i);
}

const psql=sql=>new Promise((resolve,reject)=>{
 const proc=spawn('psql',['-X','-q','-v','ON_ERROR_STOP=1','-At','-d',target,'-c',sql],
  {stdio:['ignore','pipe','pipe']});
 let out='',err='';
 proc.stdout.on('data',x=>out+=x.toString());
 proc.stderr.on('data',x=>err+=x.toString());
 proc.once('error',reject);
 proc.once('close',code=>resolve({code,out:out.trim(),err}));
});
async function pass(sql,label){
 const r=await psql(sql);
 assert.equal(r.code,0,label+': '+r.err.slice(0,1500));
 return r.out;
}
async function denied(sql,pattern,label){
 const r=await psql(sql);
 assert.notEqual(r.code,0,label+': unexpectedly succeeded');
 assert.match(r.err,pattern,label+': '+r.err.slice(0,1400));
 console.log('PASS:',label);
}
async function is(sql,expected,label){
 assert.equal(await pass(sql,label),String(expected),label);
 console.log('PASS:',label);
}
const ids={
 denied:'e1000000-0000-4000-8000-000000000001',
 client:'e1000000-0000-4000-8000-000000000002',
 empty:'e1000000-0000-4000-8000-000000000003',
 approved:'e1000000-0000-4000-8000-000000000004',
 rollbackDenied:'e1000000-0000-4000-8000-000000000005'
};
const insert=(id,email,metadata='{}')=>
 "INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES('"+id+"','"+email+"','"+metadata+"'::jsonb);";

await is("SELECT to_regclass('private.prelaunch_allowed_emails') IS NOT NULL;",'t',
 'prelaunch table was created by previous isolated test');
await is("SELECT position('prelaunch_allowed_emails' in pg_get_functiondef('private.on_signup()'::regprocedure))>0;",'t',
 'prelaunch registration guard is active before commercial GO');

await pass(`
 CREATE TABLE auth.users(
  id uuid PRIMARY KEY,
  email text,
  raw_user_meta_data jsonb NOT NULL DEFAULT '{}'::jsonb
 );
 CREATE TRIGGER on_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION private.on_signup();
`,'Create synthetic auth.users and expected signup trigger');
await denied(insert(ids.denied,'unlisted-before-go@example.test'),
 /Iscrizioni riservate/, 'anonymous signup remains blocked before GO');
await is("SELECT count(*) FROM auth.users;",0,
 'denied prelaunch signup creates no Auth user');

await pass(go,'Run the real staged public-signup SQL in ephemeral PostgreSQL');
await is("SELECT position('prelaunch_allowed_emails' in pg_get_functiondef('private.on_signup()'::regprocedure))=0;",'t',
 'GO removes only the prelaunch email allowlist from signup trigger');
await denied(go,/not the expected prelaunch version/i,
 'repeating the GO migration fails closed on unexpected function state');

await pass(insert(ids.client,'new-client@example.test',
 '{"role":"coach","virgin_member":true,"allow_in_person":true,"full_name":"Synthetic New","phone":"00000"}'),
 'Public signup with malicious metadata');
await is("SELECT role||':'||virgin_member::text||':'||allow_in_person::text FROM public.profiles WHERE id='"+ids.client+"';",
 'client:false:false','unlisted signup succeeds but cannot promote role, Virgin membership, or in-person payments');
await is("SELECT full_name FROM public.profiles WHERE id='"+ids.client+"';",
 'Synthetic New','ordinary profile display fields are preserved');
await denied(insert(ids.empty,''),/Indirizzo email richiesto/,
 'empty Auth email remains rejected even after GO');
await is("SELECT has_function_privilege('authenticated','private.on_signup()','EXECUTE');",
 'f','signed-in users cannot invoke the privileged signup function');
await is("SELECT has_function_privilege('anon','private.on_signup()','EXECUTE');",
 'f','anonymous browsers cannot invoke signup function directly');

await pass(rollback,'Run the real staged emergency rollback SQL in ephemeral PostgreSQL');
await is("SELECT position('prelaunch_allowed_emails' in pg_get_functiondef('private.on_signup()'::regprocedure))>0;",'t',
 'rollback restores the prelaunch signup allowlist');
await denied(insert(ids.rollbackDenied,'unlisted-after-rollback@example.test'),
 /Iscrizioni riservate/, 'new unlisted signup denied after emergency rollback');
await pass(insert(ids.approved,'qa.allowed@example.test'),'Allowlisted tester signs up after rollback');
await is("SELECT role||':'||virgin_member::text||':'||allow_in_person::text FROM public.profiles WHERE id='"+ids.approved+"';",
 'client:false:false','allowlisted tester remains ordinary client after rollback');
await is("SELECT count(*) FROM auth.users;",2,'only the two permitted synthetic Auth users remain');
await is("SELECT count(*) FROM public.profiles WHERE id='"+ids.client+"';",1,
 'rollback preserves a client who registered during public signup');
console.log('All staged public-signup and rollback checks PASSED (local ephemeral PostgreSQL only).');
