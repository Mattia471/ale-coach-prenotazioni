// ALE COACH public, read-only GET audit. No cookies, credentials, API keys,
// signups, real customer data, checkout sessions or payment mutations are sent.
// This is a network/static-asset smoke, NOT a replacement for a real browser
// inspection of first- and third-party cookies during Stripe Checkout.
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';

const approvedOrigins=new Set([
 'https://alecoach.online',
 'https://www.alecoach.online',
 'https://ale-coach-prenotazioni.pages.dev'
]);
const expectedFontPaths=[
 '/fonts/barlow/Barlow-Regular.ttf',
 '/fonts/barlow-condensed/BarlowCondensed-BoldItalic.ttf',
 '/fonts/caveat/Caveat-variable.ttf'
];
const prohibitedNetworkHosts=[
 'fonts.googleapis.com','fonts.gstatic.com','googletagmanager.com',
 'google-analytics.com','connect.facebook.net','static.hotjar.com',
 'script.hotjar.com','clarity.ms/tag','segment.io/analytics'
];
const marketingCookiePattern=/^(?:_ga(?:_|$)|_gid$|_gat(?:_|$)|_fbp$|_fbc$|_gcl_|_hj|_clck$|_clsk$|_uet|_pin_unauth|_tt_enable_cookie|ttcsid|hubspotutk)/i;
const timeoutMs=15000;
function cookieNames(headers){
 // Node 22 supports getSetCookie(); do not log sensitive cookie values.
 const raw=typeof headers.getSetCookie==='function'?headers.getSetCookie():[];
 return raw.map(header=>String(header).split(';',1)[0].split('=',1)[0].trim()).filter(Boolean);
}
function checkNoKnownTrackers(text,label){
 const lower=text.toLowerCase();
 for(const host of prohibitedNetworkHosts)
  assert.ok(!lower.includes(host),label+' unexpectedly references '+host);
}
async function safeGet(origin,path,fetchImpl){
 const target=new URL(path,origin);
 assert.equal(target.origin,origin,'GET target must be the approved origin');
 const res=await fetchImpl(target.toString(),{
  method:'GET',redirect:'follow',signal:AbortSignal.timeout(timeoutMs),
  headers:{Accept:'*/*','Cache-Control':'no-cache'}
 });
 const destination=new URL(res.url);
 const validDestinations=origin==='https://www.alecoach.online'
  ? new Set(['www.alecoach.online','alecoach.online'])
  : new Set([new URL(origin).hostname]);
 assert.equal(destination.protocol,'https:','Insecure redirect for '+path);
 assert.ok(validDestinations.has(destination.hostname),'Cross-site redirect for '+path);
 assert.equal(res.status,200,'GET '+path+' returned '+res.status);
 return res;
}
export async function runCookieRuntimeAudit({origin='https://alecoach.online',fetchImpl=fetch}={}){
 if(!approvedOrigins.has(origin))throw Error('QA_SITE_ORIGIN not an approved ALE COACH HTTPS host');
 const pages=['/','/privacy','/termini','/cookie','/recesso'];
 const cookieNamesSeen=new Set();
 let html='';
 for(const path of pages){
  const r=await safeGet(origin,path,fetchImpl);
  const body=await r.text();
  if(path==='/')html=body;
  assert.match(r.headers.get('content-type')||'',/text\/html/i,path+' is not HTML');
  assert.match(body,/id=["']root["']/i,path+': React root not present');
  checkNoKnownTrackers(body,path+' HTML');
  for(const name of cookieNames(r.headers)){
   assert.ok(!marketingCookiePattern.test(name),
    path+' emitted a known non-essential marketing cookie '+name);
   cookieNamesSeen.add(name);
  }
 }
 const jsPaths=[...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+\.js(?:\?[^"']*)?)["']/gi)]
  .map(match=>match[1]);
 const cssPaths=[...html.matchAll(/<link\b[^>]*\bhref=["']([^"']+\.css(?:\?[^"']*)?)["']/gi)]
  .map(match=>match[1]);
 assert.ok(jsPaths.length>0,'No Vite JS referenced from production HTML');
 assert.ok(cssPaths.length>0,'No Vite CSS referenced from production HTML');
 const js=await safeGet(origin,jsPaths[0],fetchImpl);
 const css=await safeGet(origin,cssPaths[0],fetchImpl);
 const jsText=await js.text();
 const cssText=await css.text();
 assert.match(js.headers.get('content-type')||'',/javascript/i);
 assert.match(css.headers.get('content-type')||'',/css/i);
 assert.ok(jsText.length>100,'Frontend JS asset missing');
 assert.ok(cssText.length>100,'Frontend CSS asset missing');
 checkNoKnownTrackers(jsText,'compiled JavaScript');
 checkNoKnownTrackers(cssText,'compiled CSS');
 for(const required of ['__stripe_mid','Informativa cookie e tecnologie locali','Modulo tipo di recesso'])
  assert.ok(jsText.includes(required),'A deployed legal/cookie statement is missing: '+required);
 assert.ok(cssText.includes('/fonts/barlow/'),'Missing same-origin font references in compiled CSS');
 assert.ok(cssText.includes('/fonts/barlow-condensed/'),'Missing Barlow Condensed in compiled CSS');
 assert.ok(cssText.includes('/fonts/caveat/'),'Missing Caveat in compiled CSS');
 for(const path of expectedFontPaths){
  const font=await safeGet(origin,path,fetchImpl);
  const data=new Uint8Array(await font.arrayBuffer());
  assert.ok(data.length>100,'Missing/empty local font '+path);
  const signature=Array.from(data.subarray(0,4)).join(',');
  assert.ok(signature==='0,1,0,0'||signature==='79,84,84,79',
    'The local font did not return a valid TTF/OTF header: '+path);
  const type=font.headers.get('content-type')||'';
  assert.match(type,/font|octet-stream|application\/x-font/i,'Wrong font MIME: '+path);
  for(const name of cookieNames(font.headers)){
   assert.ok(!marketingCookiePattern.test(name),'Font endpoint emitted marketing cookie '+name);
   cookieNamesSeen.add(name);
  }
 }
 console.log('PASS: legal routes and compiled Cookie/withdrawal copy present on '+origin);
 console.log('PASS: no known tracking host in HTML, compiled JS or CSS');
 console.log('PASS: 3 representative original fonts delivered from the same host with valid font signatures');
 console.log('INFO: cookie names seen in direct GET responses: '+([ ...cookieNamesSeen ].join(', ')||'(none)'));
 console.log('LIMIT: this does not inspect JavaScript-set storage, browser network, third-party Stripe Checkout cookies or rights to the trainer photo.');
 return {origin,pathsVerified:pages.length+2+expectedFontPaths.length,cookieNames:[...cookieNamesSeen]};
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url){
 runCookieRuntimeAudit({origin:process.env.QA_SITE_ORIGIN||'https://alecoach.online'})
  .catch(error=>{console.error('FAIL:',error.message);process.exitCode=1});
}
