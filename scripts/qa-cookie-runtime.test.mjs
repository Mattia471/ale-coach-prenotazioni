import test from 'node:test';
import assert from 'node:assert/strict';
import {runCookieRuntimeAudit} from './qa-cookie-runtime.mjs';

const html='<html><head><link rel="stylesheet" href="/assets/app.css"/></head>'+
 '<body><div id="root"></div><script type="module" src="/assets/app.js"></script></body></html>';
const legalJs='A'.repeat(110)+'__stripe_mid Informativa cookie e tecnologie locali Modulo tipo di recesso';
const localCss='/* self hosted */'.repeat(15)+
 "url('/fonts/barlow/Barlow-Regular.ttf')"+
 "url('/fonts/barlow-condensed/BarlowCondensed-BoldItalic.ttf')"+
 "url('/fonts/caveat/Caveat-variable.ttf')";
const fontBytes=new Uint8Array(140);
fontBytes.set([0,1,0,0],0);
function mockNetwork({css=localCss,js=legalJs,htmlCookie,remoteUrl}={}){
 const visits=[];
 const fetchImpl=async (url,options)=>{
  assert.equal(options.method,'GET','The public audit must be GET-only');
  assert.equal(options.redirect,'follow');
  const requested=new URL(url);
  const path=requested.pathname;
  visits.push(path);
  let body,type;
  if(['/','/privacy','/termini','/cookie','/recesso'].includes(path)){
   body=html;type='text/html';
  }else if(path==='/assets/app.js'){body=js;type='text/javascript';}
  else if(path==='/assets/app.css'){body=css;type='text/css';}
  else if(path.startsWith('/fonts/')){body=fontBytes;type='font/ttf';}
  else throw Error('Unexpected test GET '+path);
  const headers=new Headers({'content-type':type});
  if(htmlCookie&&path==='/')headers.append('set-cookie',htmlCookie);
  const bytes=typeof body==='string'?new TextEncoder().encode(body):body;
  return {
   url:remoteUrl||requested.toString(),
   status:200,headers,
   text:async()=>new TextDecoder().decode(bytes),
   arrayBuffer:async()=>bytes.slice().buffer
  };
 };
 return {fetchImpl,visits};
}
test('read-only cookie audit checks all legal paths and actual TTF assets',async()=>{
 const mock=mockNetwork();
 const result=await runCookieRuntimeAudit({fetchImpl:mock.fetchImpl});
 assert.equal(result.pathsVerified,10);
 assert.deepEqual(result.cookieNames,[]);
 assert.ok(mock.visits.includes('/recesso'));
 assert.ok(mock.visits.includes('/fonts/caveat/Caveat-variable.ttf'));
});
test('cookie audit permits technical Cloudflare security cookies',async()=>{
 const mock=mockNetwork({htmlCookie:'__cf_bm=sandbox-value; Path=/; Secure; HttpOnly'});
 const result=await runCookieRuntimeAudit({fetchImpl:mock.fetchImpl});
 assert.deepEqual(result.cookieNames,['__cf_bm']);
});
test('cookie audit blocks marketing cookie without reading or logging its value',async()=>{
 const mock=mockNetwork({htmlCookie:'_ga=fake; Path=/; Secure'});
 await assert.rejects(()=>runCookieRuntimeAudit({fetchImpl:mock.fetchImpl}),/known non-essential marketing cookie _ga/);
});
test('cookie audit rejects tracking domains in deployed assets',async()=>{
 const mock=mockNetwork({css:localCss+' url(https://fonts.googleapis.com/css2?fake)'});
 await assert.rejects(()=>runCookieRuntimeAudit({fetchImpl:mock.fetchImpl}),/compiled CSS unexpectedly references fonts.googleapis.com/);
});
test('cookie audit refuses a cross-site redirect and arbitrary origins',async()=>{
 const mock=mockNetwork({remoteUrl:'https://elsewhere.invalid/'});
 await assert.rejects(()=>runCookieRuntimeAudit({fetchImpl:mock.fetchImpl}),/Cross-site redirect/);
 await assert.rejects(()=>runCookieRuntimeAudit({origin:'https://evil.invalid',fetchImpl:mock.fetchImpl}),/not an approved ALE COACH/);
});
