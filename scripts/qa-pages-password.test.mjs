import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {onRequest} from '../functions/_middleware.js';

const strongPassword='A_very-long-only-for-QA-test-password_2026!';
function ctx({password=strongPassword,header,method='GET',path='/',next}={}){
 let called=0;
 const nextFn=async()=>{called++;return next?next():new Response('preview content',{status:200,headers:{'Cache-Control':'public,max-age=900','X-Test':'yes'}})};
 const request=new Request('https://qa-booking-stripe-sandbox.ale-coach-prenotazioni.pages.dev'+path,{
   method,headers:header?{'Authorization':header}:undefined
 });
 return {context:{env:{QA_ACCESS_PASSWORD:password},request,next:nextFn},calls:()=>called};
}
function basic(password=strongPassword){return 'Basic '+btoa('ale-tester:'+password)}
test('password not configured or weak: fail closed before serving HTML and JS',async()=>{
 for(const password of ['',undefined,'short','x'.repeat(129),'unicodeé'.repeat(5)]){
  const {context,calls}=ctx({password});
  const response=await onRequest(context);
  assert.equal(response.status,503);
  assert.equal(calls(),0);
  assert.match(response.headers.get('X-Robots-Tag'),/noindex/);
 }
});
test('missing, wrong, malformed and too long Basic Auth: 401, no content leak',async()=>{
 for(const header of [undefined,'Basic anything','Bearer token',basic('wrong'),basic().replace('Basic ','BASIC '),'a'.repeat(513)]){
  const {context,calls}=ctx({header});
  const response=await onRequest(context);
  assert.equal(response.status,401);
  assert.equal(calls(),0);
  assert.match(response.headers.get('WWW-Authenticate'),/^Basic realm=/);
  assert.match(response.headers.get('Cache-Control'),/no-store/);
 }
});
test('protect all application paths, pages, assets, service worker and non-GET methods',async()=>{
 const routes=['/','/privacy','/termini','/cookie','/manifest.webmanifest','/sw.js','/assets/app-random.js','/assets/app.css','/favicon.ico'];
 for(const path of routes){
  const {context,calls}=ctx({path});
  const response=await onRequest(context);
  assert.equal(response.status,401,path);
  assert.equal(calls(),0);
 }
 for(const method of ['HEAD','POST','OPTIONS']){
  const {context,calls}=ctx({method,path:'/api/check'});
  const response=await onRequest(context);
  assert.equal(response.status,401,method);
  assert.equal(calls(),0);
 }
});
test('authenticated requests continue once, cannot be cached publicly',async()=>{
 const {context,calls}=ctx({header:basic(),path:'/assets/app.js'});
 const response=await onRequest(context);
 assert.equal(response.status,200);
 assert.equal(await response.text(),'preview content');
 assert.equal(calls(),1);
 assert.equal(response.headers.get('X-Test'),'yes');
 assert.match(response.headers.get('Cache-Control'),/private, no-store/);
 assert.match(response.headers.get('X-Robots-Tag'),/noindex/);
});
test('every Cloudflare Pages route invokes password middleware',()=>{
 const r=JSON.parse(readFileSync(new URL('../public/_routes.json',import.meta.url),'utf8'));
 assert.deepEqual(r,{version:1,include:['/*'],exclude:[]});
});
