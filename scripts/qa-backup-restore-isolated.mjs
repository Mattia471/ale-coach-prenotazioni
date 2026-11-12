// Real pg_dump/pg_restore drill on fake CI-only records. Never contacts Supabase Cloud.
// Execute after qa-concurrency and qa-credit-cancellation-isolated in ephemeral PostgreSQL.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp,rm,stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const databaseUrl=process.env.QA_DATABASE_URL;
assert.ok(databaseUrl,'QA_DATABASE_URL required');
const source=new URL(databaseUrl);
assert.ok(['localhost','127.0.0.1'].includes(source.hostname),'Only localhost allowed');
assert.equal(source.pathname,'/alecoach_ci','Only synthetic CI database allowed');
const target=new URL(databaseUrl);
target.pathname='/alecoach_restore_ci';
const dir=await mkdtemp(join(tmpdir(),'ale-coach-restore-ci-'));
const dump=join(dir,'synthetic.dump');
async function run(command,args){
 return await new Promise((resolve,reject)=>{
  const child=spawn(command,args,{stdio:['ignore','pipe','pipe'],env:process.env});
  let out='',err='';
  child.stdout.on('data',d=>out+=d.toString());
  child.stderr.on('data',d=>err+=d.toString());
  child.on('error',reject);
  child.on('close',code=>code===0?resolve(out.trim()):reject(new Error(command+' failed: '+err.slice(0,900))));
 });
}
const sourceDb=source.toString(),targetDb=target.toString();
try{
 // Never dump Auth, service credentials, real users, or the actual project database.
 const expected=await run('psql',['-X','-At','-v','ON_ERROR_STOP=1','-d',sourceDb,
  '-c',"SELECT (SELECT count(*) FROM qa.bookings)::text||':'||(SELECT sum(remaining) FROM qa.wallet_credits)::text"]);
 assert.match(expected,/^\d+:\d+$/);
 await run('pg_dump',['--format=custom','--no-owner','--no-acl','--no-tablespaces',
  '--schema=qa','--file='+dump,sourceDb]);
 assert.ok((await stat(dump)).size>0,'Dump is empty');
 const listing=await run('pg_restore',['--list',dump]);
 assert.match(listing,/TABLE qa bookings/);
 assert.match(listing,/TABLE qa wallet_credits/);
 // Restore to an entirely different DB name, never source. Database creation fails closed if it exists.
 await run('createdb',['--maintenance-db='+sourceDb,'alecoach_restore_ci']);
 await run('pg_restore',['--no-owner','--no-acl','--exit-on-error','--dbname='+targetDb,dump]);
 const actual=await run('psql',['-X','-At','-v','ON_ERROR_STOP=1','-d',targetDb,
  '-c',"SELECT (SELECT count(*) FROM qa.bookings)::text||':'||(SELECT sum(remaining) FROM qa.wallet_credits)::text"]);
 assert.equal(actual,expected,'Restored bookings/wallet counts mismatch');
 const constraints=await run('psql',['-X','-At','-v','ON_ERROR_STOP=1','-d',targetDb,
  '-c',"SELECT count(*) FROM pg_constraint WHERE conname='bookings_no_overlap' AND connamespace='qa'::regnamespace"]);
 assert.equal(constraints,'1','Restored slot-exclusion constraint missing');
 console.log('PASS: actual PostgreSQL custom dump restores into a separate CI database');
 console.log('PASS: synthetic booking counts, wallet totals and exclusion constraint survive restore');
 console.log('No real Supabase data was backed up or restored.');
}finally{
 await rm(dir,{recursive:true,force:true});
 // Drop only the dedicated CI restore database, never the source database.
 await run('dropdb',['--if-exists','--maintenance-db='+sourceDb,'alecoach_restore_ci']);
}
