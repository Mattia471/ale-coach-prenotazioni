// P0. Test the ACTUAL signup trigger migration in an ephemeral PostgreSQL DB.
// Only localhost/alecoach_ci permitted; never contacts Supabase Cloud.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {readFileSync} from 'node:fs';

const target=process.env.QA_DATABASE_URL;
if(!target)throw Error('QA_DATABASE_URL required');
const url=new URL(target);
if(!['localhost','127.0.0.1'].includes(url.hostname) ||
   url.pathname!=='/alecoach_ci' || (url.port && url.port!=='5432'))
 throw Error('Unsafe target: ephemeral localhost/alecoach_ci required');
const migration=readFileSync(new URL('../supabase/migrations/20261113120000_reinstate_prelaunch_signup_allowlist.sql',import.meta.url),'utf8');
assert.match(migration,/CREATE OR REPLACE FUNCTION private\.on_signup\(\)/i);
assert.match(migration,/private\.prelaunch_allowed_emails/i);
assert.match(migration,/REVOKE ALL ON FUNCTION private\.on_signup\(\)/i);

function psql(sql){
 return new Promise((resolve,reject)=>{
  const proc=spawn('psql',['-X','-q','-v','ON_ERROR_STOP=1','-At','-d',target,'-c',sql],{stdio:['ignore','pipe','pipe']});
  let out='',err='';
  proc.stdout.on('data',d=>out+=d.toString());
  proc.stderr.on('data',d=>err+=d.toString());
  proc.once('error',reject);
  proc.once('close',code=>resolve({code,out:out.trim(),err}));
 });
}
async function pass(sql,label){
 const r=await psql(sql);
 assert.equal(r.code,0,label+': '+r.err.slice(0,1300));
 return r.out;
}
async function denied(sql,regex,label){
 const r=await psql(sql);
 assert.notEqual(r.code,0,label+': unexpectedly succeeded');
 assert.match(r.err,regex,label+': '+r.err.slice(0,900));
 console.log('PASS:',label);
}
async function is(sql,want,label){
 assert.equal(await pass(sql,label),String(want),label);
 console.log('PASS:',label);
}
await pass([
 "DO $roles$ BEGIN",
 " IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF;",
 " IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;",
 "END $roles$;",
 "ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text NOT NULL DEFAULT '';",
 "ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone text NOT NULL DEFAULT '';",
 "CREATE SCHEMA qa_signup;",
 "CREATE TABLE qa_signup.users(id uuid PRIMARY KEY,email text,raw_user_meta_data jsonb NOT NULL DEFAULT '{}'::jsonb);",
 "CREATE TABLE private.prelaunch_allowed_emails(email text PRIMARY KEY,added_at timestamptz NOT NULL DEFAULT now());",
 "REVOKE ALL ON private.prelaunch_allowed_emails FROM PUBLIC,anon,authenticated;",
 "INSERT INTO private.prelaunch_allowed_emails(email) VALUES ('qa.allowed@example.test');"
].join('\n'),'Synthetic isolated signup tables and roles');
await pass(migration,'Load real prelaunch signup migration');
await pass("CREATE TRIGGER qa_signup_trigger AFTER INSERT ON qa_signup.users FOR EACH ROW EXECUTE FUNCTION private.on_signup();",
 'Install synthetic equivalent of auth.users signup trigger');

const good1='d1000000-0000-4000-8000-000000000001';
const good2='d1000000-0000-4000-8000-000000000002';
const bad='d1000000-0000-4000-8000-000000000003';
const bad2='d1000000-0000-4000-8000-000000000004';
const signup=(id,email,metadata='{}')=>
 "INSERT INTO qa_signup.users(id,email,raw_user_meta_data) VALUES ('"+id+"','"+email+"','"+metadata+"'::jsonb);";

await denied(signup(bad,'unlisted@example.test'),
 /Iscrizioni riservate agli account autorizzati/,
 'unlisted email rejected by real trigger');
await denied(signup(bad2,''),
 /Iscrizioni riservate agli account autorizzati/,
 'blank email rejected by real trigger');
await is("SELECT count(*) FROM qa_signup.users;",0,'denied signup creates no auth user');
await is("SELECT count(*) FROM public.profiles WHERE id IN('"+bad+"','"+bad2+"');",0,
 'denied signup creates no user profile');

await pass(signup(good1,'qa.allowed@example.test',
 '{"full_name":"Synthetic Allowed","phone":"0000","role":"coach","virgin_member":true}'),
 'allowlisted signup');
await is("SELECT role||':'||virgin_member::text||':'||full_name FROM public.profiles WHERE id='"+good1+"';",
 'client:false:Synthetic Allowed',
 'JWT user_metadata cannot promote coach or grant membership');

await pass(signup(good2,' QA.ALLOWED@EXAMPLE.TEST '),'normalized email accepted');
await is("SELECT role||':'||virgin_member::text FROM public.profiles WHERE id='"+good2+"';",
 'client:false','case/space normalization creates ordinary client');
await is("SELECT count(*) FROM qa_signup.users;",2,'only authorized users persisted');
await is("SELECT count(*) FROM public.profiles WHERE id IN('"+good1+"','"+good2+"');",2,
 'exactly one profile per allowlisted signup');
await denied("SET ROLE authenticated; SELECT count(*) FROM private.prelaunch_allowed_emails;",
 /permission denied/,'browser role cannot read signup allowlist');
await is("SELECT has_function_privilege('authenticated','private.on_signup()','EXECUTE');",
 'f','browser cannot execute signup trigger directly');
await is("SELECT position('prelaunch_allowed_emails' in pg_get_functiondef('private.on_signup()'::regprocedure))>0;",
 't','deployed definition in synthetic DB still enforces allowlist');
console.log('All isolated P0 prelaunch signup checks passed.');
