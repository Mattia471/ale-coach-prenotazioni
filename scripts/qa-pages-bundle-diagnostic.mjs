// Read-only bundle diagnostic. Never prints key/token contents.
const base='https://ale-coach-prenotazioni.pages.dev';
const home=await fetch(base+'/',{headers:{'Cache-Control':'no-cache'},signal:AbortSignal.timeout(15000)});
if(!home.ok)throw Error('Page unavailable: HTTP '+home.status);
const html=await home.text();
const assets=[...html.matchAll(/(?:src|href)=["']([^"']+\.js(?:\?[^"']*)?)["']/g)].map(m=>new URL(m[1],base).href);
const seen=new Set(),queue=[...assets];
const files=[];
while(queue.length&&seen.size<30){
 const u=queue.shift();
 if(seen.has(u))continue;
 seen.add(u);
 const response=await fetch(u,{signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw Error('JS asset unavailable HTTP '+response.status+' '+new URL(u).pathname);
 const body=await response.text();
 const foundProject=body.includes('mmtnzjdvvlouiwgrydlf.supabase.co');
 const hasGeneralSupabase=body.includes('.supabase.co')||body.includes('supabaseUrl');
 files.push({path:new URL(u).pathname,bytes:body.length,hasProject:foundProject,hasSupabaseRuntime:hasGeneralSupabase});
 // Follow only app-owned JS assets, never off-site URLs.
 for(const match of body.matchAll(/["'`]((?:\.|\/assets\/)[^"'`]+\.js)["'`]/g)){
  try{const url=new URL(match[1],u);if(url.origin===base&&!seen.has(url.href))queue.push(url.href)}catch{}
 }
}
console.log(JSON.stringify({pageStatus:home.status,assetCount:files.length,allFiles:files,projectFound:files.some(f=>f.hasProject)}));
if(!files.length)throw Error('No JS bundle detected in deployment');
