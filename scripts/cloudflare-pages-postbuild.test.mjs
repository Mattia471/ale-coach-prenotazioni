import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {buildCloudflareHeaders,assertPagesBuild} from './cloudflare-pages-postbuild.mjs';

const src=`# Prelaunch
/*
  X-Robots-Tag: noindex, nofollow, noarchive
  X-Frame-Options: DENY
  Referrer-Policy: no-referrer
`;
const legal='Termini e informativa approvati senza segnaposto.';
const ready={
 PAGES_RELEASE_MODE:'live',
 VITE_PUBLIC_SITE_URL:'https://alecoach.online',
 VITE_SUPABASE_URL:'https://mmtnzjdvvlouiwgrydlf.supabase.co',
 VITE_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_dummy',
 VITE_LEGAL_CONTROLLER_NAME:'Titolare Verificato',
 VITE_LEGAL_CONTROLLER_ADDRESS:'Roma',
 VITE_LEGAL_CONTACT_EMAIL:'info@alecoach.online',
 VITE_LEGAL_TAX_ID:'00000000000',
 VITE_LEGAL_POLICY_VERSION:'2026-11-10',
 VITE_LEGAL_APPROVED:'true',
 VITE_GOOGLE_ENABLED:'false',
 VITE_PRELAUNCH_QA:'false',
};
test('Cloudflare Pages starts with global prelaunch noindex',()=>{
 const headers=buildCloudflareHeaders(src,{});
 assert.match(headers,/\/\*\n  X-Robots-Tag: noindex, nofollow, noarchive/);
 assert.match(headers,/X-Frame-Options: DENY/);
});
test('Public live mode fails closed without legal approval or with QA mode',()=>{
 assert.throws(()=>buildCloudflareHeaders(src,{PAGES_RELEASE_MODE:'live'},legal),/NO-GO/);
 assert.throws(()=>buildCloudflareHeaders(src,{...ready,VITE_PRELAUNCH_QA:'true'},legal),/QA/);
 assert.throws(()=>buildCloudflareHeaders(src,{...ready,VITE_GOOGLE_ENABLED:'true'},legal),/Google/);
 assert.throws(()=>buildCloudflareHeaders(src,{...ready,VITE_PUBLIC_SITE_URL:'https://unknown.test'},legal),/NO-GO/);
 assert.throws(()=>buildCloudflareHeaders(src,{...ready},'[DA COMPILARE: privacy]'),/placeholder/);
});
test('Approved launch clears global noindex but keeps Pages previews noindex',()=>{
 const headers=buildCloudflareHeaders(src,ready,legal);
 assert.doesNotMatch(headers,/^\/\*\n  X-Robots-Tag: noindex/m);
 assert.match(headers,/https:\/\/:project\.pages\.dev\/\*/);
 assert.match(headers,/https:\/\/:version\.:project\.pages\.dev\/\*/);
 assert.match(headers,/X-Frame-Options: DENY/);
});
test('Cloudflare build has native SPA fallback and expected static artifacts',()=>{
 const folder=mkdtempSync(join(tmpdir(),'ale-pages-'));
 try{
  for(const name of ['index.html','_headers','manifest.webmanifest','sw.js'])
   writeFileSync(join(folder,name),'x');
  assert.doesNotThrow(()=>assertPagesBuild(folder));
  writeFileSync(join(folder,'_redirects'),'/* /index.html 200');
  assert.throws(()=>assertPagesBuild(folder),/_redirects/);
  rmSync(join(folder,'_redirects'));
  writeFileSync(join(folder,'404.html'),'not found');
  assert.throws(()=>assertPagesBuild(folder),/404.html/);
 }finally{rmSync(folder,{recursive:true,force:true})}
});
