import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {onRequest} from '../functions/_middleware.js';

const strongPassword='S5mF_vg4QeT7bW8!pN2yL6cR';
function request({path='/',password,secret=strongPassword}={}){
 const headers=new Headers();
 if(password!==undefined)headers.set('Authorization','Basic '+Buffer.from('ale-tester:'+password).toString('base64'));
 const url='https://qa-example.ale-coach-prenotazioni.pages.dev'+path;
 let served=0;
 const context={
  env:secret===null?{}:{QA_ACCESS_PASSWORD:secret},
  request:new Request(url,{headers}),
  next:async()=>{served++;return new Response('STATIC CONTENT',{status:200,headers:{'Cache-Control':'public,max-age=999'}})}
 };
 return {context,served:()=>served};
}

test('QA gate protects SPA, JS, manifest, sw, static files and deep links',async()=>{
 const routes=JSON.parse(readFileSync(new URL('../public/_routes.json',import.meta.url),'utf8'));
 assert.deepEqual(routes.include,['/*']);
 assert.deepEqual(routes.exclude,[]);
 for(const path of ['/','/privacy','/assets/index-test.js','/manifest.webmanifest','/sw.js','/favicon.ico']){
  const r=request({path});
  const response=await onRequest(r.context);
  assert.equal(response.status,401,path);
  assert.equal(r.served(),0,path);
  assert.match(response.headers.get('WWW-Authenticate'),/^Basic /);
  assert.match(response.headers.get('Cache-Control'),/no-store/);
  assert.equal(response.headers.get('X-Robots-Tag'),'noindex, nofollow, noarchive');
 }
});

test('QA gate rejects invalid password and malformed Authorization, no assets served',async()=>{
 for(const value of [undefined,'wrongpassword','',strongPassword+'-extra']){
  const r=request({password:value});
  assert.equal((await onRequest(r.context)).status,401);
  assert.equal(r.served(),0);
 }
 const r=request();
 r.context.request=new Request('https://qa-example.pages.dev/',{headers:{Authorization:'Bearer '+ 'x'.repeat(700)}});
 assert.equal((await onRequest(r.context)).status,401);
 assert.equal(r.served(),0);
});

test('QA gate fails closed when Preview secret is missing, short, or malformed',async()=>{
 for(const secret of [null,'','short','with a space but very long secret text','x'.repeat(129)]){
  const r=request({password:strongPassword,secret});
  const response=await onRequest(r.context);
  assert.equal(response.status,503);
  assert.equal(r.served(),0);
  assert.match(response.headers.get('Cache-Control'),/no-store/);
 }
});

test('QA gate lets authenticated testers through, preserving no-store on assets',async()=>{
 for(const path of ['/','/assets/index-test.js','/sw.js']){
  const r=request({path,password:strongPassword});
  const response=await onRequest(r.context);
  assert.equal(response.status,200);
  assert.equal(r.served(),1);
  assert.equal(await response.text(),'STATIC CONTENT');
  assert.match(response.headers.get('Cache-Control'),/no-store/);
  assert.equal(response.headers.get('X-Robots-Tag'),'noindex, nofollow, noarchive');
 }
});

test('middleware never contains a hardcoded tester password or public VITE secret',()=>{
 const code=readFileSync(new URL('../functions/_middleware.js',import.meta.url),'utf8');
 assert.match(code,/context\.env\?\.QA_ACCESS_PASSWORD/);
 assert.doesNotMatch(code,/VITE_QA_ACCESS_PASSWORD|STRIPE_SECRET_KEY|SUPABASE_SERVICE_ROLE_KEY/);
});
