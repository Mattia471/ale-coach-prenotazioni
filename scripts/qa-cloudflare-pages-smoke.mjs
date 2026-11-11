// External read-only Cloudflare Pages smoke test: no credentials or payments.
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';

const host='ale-coach-prenotazioni.pages.dev';
const origin='https://'+host;
const expectedSupabaseHost='mmtnzjdvvlouiwgrydlf.supabase.co';
const timeoutMs=15000;
async function fetchPage(path,accept='*/*'){
 const url=new URL(path,origin);
 const res=await fetch(url,{
  headers:{Accept:accept,'Cache-Control':'no-cache'},
  redirect:'follow',signal:AbortSignal.timeout(timeoutMs)
 });
 const final=new URL(res.url);
 assert.equal(final.hostname,host,'Unexpected cross-site redirect for '+path);
 assert.equal(res.status,200,path+': expected HTTP 200, got '+res.status);
 return res;
}
function report(label){console.log('PASS: '+label)}
function checkNoIndex(res,path){
 const robots=res.headers.get('x-robots-tag')||'';
 assert.match(robots,/noindex/i,path+': prelaunch must set X-Robots-Tag noindex');
}
export async function runPagesSmoke(){
 const root=await fetchPage('/','text/html');
 const html=await root.text();
 assert.match(root.headers.get('content-type')||'',/text\/html/i,'Root is not HTML');
 assert.match(html,/id=["']root["']/i,'SPA root element missing');
 checkNoIndex(root,'/');
 report('Pages HTTPS serves React/Vite shell with noindex prelaunch header');

 const headers={
  'x-content-type-options':/nosniff/i,
  'x-frame-options':/DENY/i,
  'referrer-policy':/no-referrer/i,
  'content-security-policy-report-only':/default-src/
 };
 for(const [key,value] of Object.entries(headers))
  assert.match(root.headers.get(key)||'',value,'Missing security header '+key);
 report('security headers are active on the live Pages host');

 for(const path of ['/privacy','/termini','/cookie']){
  const res=await fetchPage(path,'text/html');
  const body=await res.text();
  assert.match(res.headers.get('content-type')||'',/text\/html/i,path+' not SPA HTML');
  assert.match(body,/id=["']root["']/i,path+': SPA fallback missing');
  checkNoIndex(res,path);
 }
 report('SPA fallback works for privacy, terms and cookie deep links');

 const jsSources=[...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/gi)]
  .map(match=>match[1]).filter(value=>value.includes('/assets/'));
 const cssSources=[...html.matchAll(/<link\b[^>]*\bhref=["']([^"']+\.css(?:\?[^"']*)?)["']/gi)]
  .map(match=>match[1]);
 assert.ok(jsSources.length>0,'No Vite script asset referenced in HTML');
 assert.ok(cssSources.length>0,'No CSS bundle referenced in HTML');
 const [script,css]=await Promise.all([
  fetchPage(jsSources[0],'application/javascript'),
  fetchPage(cssSources[0],'text/css')
 ]);
 const scriptBody=await script.text();
 const cssBody=await css.text();
 assert.ok(scriptBody.length>1000,'JS asset unexpectedly small');
 assert.ok(cssBody.length>1000,'CSS asset unexpectedly small');
 assert.match(script.headers.get('content-type')||'',/javascript/i,'JS asset has wrong content type');
 assert.match(css.headers.get('content-type')||'',/css/i,'CSS asset has wrong content type');
 report('versioned JS/CSS assets are served and have correct MIME types');

 const manifestRes=await fetchPage('/manifest.webmanifest','application/manifest+json');
 const manifest=await manifestRes.json();
 assert.equal(manifest.display,'standalone','PWA must be installable');
 assert.ok(Array.isArray(manifest.icons)&&manifest.icons.length>0,'No PWA icons');
 const icon=manifest.icons.find(x=>x.sizes==='192x192')||manifest.icons[0];
 const iconRes=await fetchPage(icon.src,'image/*');
 assert.match(iconRes.headers.get('content-type')||'',/image\//i,'PWA icon is not an image');
 const swRes=await fetchPage('/sw.js','application/javascript');
 const sw=await swRes.text();
 assert.ok(sw.length>40,'Service Worker missing or empty');
 assert.match(swRes.headers.get('content-type')||'',/javascript/i,'Service Worker is not JS');
 report('PWA manifest, icon and service worker are served successfully');
 assert.ok(scriptBody.includes(expectedSupabaseHost),
  'Supabase URL missing from built frontend bundle; set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in Cloudflare Production and redeploy');
 report('compiled frontend bundle includes the expected Supabase project hostname');

 console.log('PASS: all Cloudflare Pages static/deep-link checks passed.');
 console.log('NOTE: authenticated booking, recovery email, Stripe Sandbox and mobile require other QA.');
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url){
 runPagesSmoke().catch(error=>{console.error('FAIL:',error.message);process.exitCode=1;});
}
