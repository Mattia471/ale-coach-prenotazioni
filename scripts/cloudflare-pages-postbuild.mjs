import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {validateRelease} from './release-check.mjs';

const noIndex='  X-Robots-Tag: noindex, nofollow, noarchive';
const pagesHostRules=`
# Keep Pages technical/preview URLs out of search indexes after public launch.
https://:project.pages.dev/*
  X-Robots-Tag: noindex, nofollow, noarchive

https://:version.:project.pages.dev/*
  X-Robots-Tag: noindex, nofollow, noarchive
`;

export function buildCloudflareHeaders(source,env={},legalText='') {
 const mode=String(env.PAGES_RELEASE_MODE||'prelaunch').trim();
 if(!['prelaunch','live'].includes(mode))throw new Error('PAGES_RELEASE_MODE: usa prelaunch o live.');
 if(!source.includes(noIndex))throw new Error('Manca la protezione pre-lancio X-Robots-Tag.');
 if(mode==='prelaunch')return source;
 const errors=validateRelease(env,legalText);
 const site=String(env.VITE_PUBLIC_SITE_URL||'');
 if(!['https://alecoach.online','https://www.alecoach.online'].includes(site.replace(/\/$/,''))) {
  errors.push('Il dominio pubblico Cloudflare deve essere alecoach.online.');
 }
 if(env.VITE_PRELAUNCH_QA==='true')errors.push('Disattiva la modalità QA prima del lancio.');
 if(env.VITE_GOOGLE_ENABLED==='true')errors.push('Google è fuori dal perimetro V1.');
 if(env.VITE_CANCELLATION_POLICY_V2_ENABLED==='true')errors.push('Disdette e rimborsi V2 non autorizzati per la release V1.');
 if(errors.length)throw new Error('NO-GO Cloudflare Pages: '+errors.join(' | '));
 // No blanket noindex on the approved commercial domain.
 // The separate *.pages.dev rules remain, for preview and technical URLs.
 return source.replace(noIndex+'\n','')+pagesHostRules;
}

export function assertPagesBuild(dist='dist') {
 const paths=['index.html','_headers','manifest.webmanifest','sw.js'];
 for(const path of paths)if(!existsSync(`${dist}/${path}`))
  throw new Error(`Cloudflare Pages: manca ${dist}/${path}`);
 if(existsSync(`${dist}/404.html`))
  throw new Error('Cloudflare Pages SPA fallback richiede assenza di 404.html alla radice.');
 if(existsSync(`${dist}/_redirects`))
  throw new Error('Cloudflare Pages SPA usa il fallback nativo; rimuovi _redirects per evitare riscritture degli asset.');
}

if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
 assertPagesBuild();
 const source=readFileSync('dist/_headers','utf8');
 const legalText=readFileSync('src/LegalPage.tsx','utf8');
 const modified=buildCloudflareHeaders(source,process.env,legalText);
 writeFileSync('dist/_headers',modified);
 console.log('✓ Cloudflare Pages: assets, SPA routing e header verificati.');
 console.log(process.env.PAGES_RELEASE_MODE==='live'
  ?'✓ Modalità LIVE: gate legali superati, noindex solo su pages.dev.'
  :'✓ PRELAUNCH: noindex attivo su tutti gli host. Nessun go-live commerciale.');
}
