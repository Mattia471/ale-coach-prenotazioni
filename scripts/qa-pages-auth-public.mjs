// Read-only public Auth + PostgREST smoke from the Cloudflare Pages release.
// Never sends credentials, creates accounts, sends emails, or prints any API keys/data.
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';

const pageUrl='https://ale-coach-prenotazioni.pages.dev';
const base='https://mmtnzjdvvlouiwgrydlf.supabase.co';
const requestTimeoutMs=12000;

async function safeFetch(url,headers={}){
 const response=await fetch(url,{
  method:'GET',redirect:'error',signal:AbortSignal.timeout(requestTimeoutMs),
  headers:{'Cache-Control':'no-cache',...headers}
 });
 return response;
}
async function loadPagePublishableKey(){
 const home=await safeFetch(pageUrl+'/');
 assert.equal(home.status,200,'Cloudflare Pages not serving frontend');
 const html=await home.text();
 const paths=[...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+\.js(?:\?[^"']*)?)["']/gi)]
   .map(match=>match[1]);
 assert.ok(paths.length>0,'No frontend JS referenced');
 const keys=new Set();
 for(const path of paths.slice(0,10)){
  const asset=new URL(path,pageUrl);
  assert.equal(asset.origin,pageUrl,'Unexpected external script URL');
  const fetched=await safeFetch(asset);
  assert.equal(fetched.status,200,'Failed to read frontend JS');
  const code=await fetched.text();
  for(const match of code.matchAll(/sb_publishable_[A-Za-z0-9_-]{12,}/g))keys.add(match[0]);
 }
 assert.equal(keys.size,1,'Exactly one modern public Supabase key must be compiled in frontend');
 return [...keys][0];
}
function report(label){console.log('PASS: '+label)}
export async function run(){
 const key=await loadPagePublishableKey();
 const headers={apikey:key,'Accept':'application/json'};
 report('Cloudflare bundle contains exactly one public Supabase publishable key');

 const health=await safeFetch(base+'/auth/v1/health',headers);
 assert.equal(health.status,200,'Supabase Auth is unhealthy or rejects frontend publishable key');
 report('public publishable key reaches Supabase Auth health endpoint');

 const settings=await safeFetch(base+'/auth/v1/settings',headers);
 assert.equal(settings.status,200,'Supabase Auth settings endpoint unavailable');
 const config=await settings.json();
 assert.equal(typeof config,'object','Auth settings must be JSON');
 report('Supabase Auth accepts public key on read-only settings endpoint');

 for(const table of ['services','venues','packages']){
  const response=await safeFetch(base+'/rest/v1/'+table+'?select=id&limit=1',headers);
  assert.equal(response.status,200,'Public catalog '+table+' cannot be loaded anonymously, HTTP '+response.status);
  const rows=await response.json();
  assert.ok(Array.isArray(rows),'Expected catalog array '+table);
  report('public catalog '+table+' reachable anonymously (no rows logged)');
 }

 for(const table of ['profiles','bookings','wallet_credits','notifications','slot_holds']){
  const response=await safeFetch(base+'/rest/v1/'+table+'?select=id&limit=1',headers);
  if([401,403].includes(response.status)){
   report(table+' denies anonymous access with HTTP '+response.status);
   continue;
  }
  assert.equal(response.status,200,'Unexpected private-table response '+table+' HTTP '+response.status);
  const rows=await response.json();
  assert.ok(Array.isArray(rows)&&rows.length===0,'Anonymous user could see private '+table+' records');
  report(table+' returned no rows to anonymous visitor');
 }

 const invalidUser=await safeFetch(base+'/auth/v1/user',{
  ...headers,Authorization:'Bearer invalid.synthetic.jwt'
 });
 assert.ok([400,401,403].includes(invalidUser.status),
  'Supabase Auth must deny a fabricated access token');
 report('Auth user endpoint rejects fabricated JWT');

 console.log('PASS: Cloudflare public Auth and anon RLS connectivity QA completed.');
 console.log('NOT TESTED: real password login, signout, reset email, redirect allowlist, two-account booking or Stripe checkout.');
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url){
 run().catch(e=>{console.error('FAIL:',e.message);process.exitCode=1;});
}
