/**
 * Cloudflare Pages QA-only server-side Basic authentication.
 * This file MUST stay on qa/booking-stripe-sandbox and MUST NOT be merged to main.
 * Every route, including static assets and service workers, is protected by
 * public/_routes.json. Never put QA_ACCESS_PASSWORD into VITE_* variables.
 */
const noStoreHeaders={
  'Cache-Control':'private, no-store, no-cache, must-revalidate',
  'Pragma':'no-cache',
  'X-Robots-Tag':'noindex, nofollow, noarchive',
  'X-Content-Type-Options':'nosniff'
};
const loginChallenge='Basic realm="ALE COACH QA", charset="UTF-8"';
const encoder=new TextEncoder();
function unavailable(){
  return new Response('ALE COACH QA non configurato.',{
    status:503,headers:{...noStoreHeaders,'Content-Type':'text/plain; charset=utf-8'}
  });
}
function denied(){
  return new Response('Accesso riservato ai tester ALE COACH.',{
    status:401,headers:{
      ...noStoreHeaders,'Content-Type':'text/plain; charset=utf-8',
      'WWW-Authenticate':loginChallenge
    }
  });
}
async function sameDigest(a,b){
  const [left,right]=await Promise.all([
    crypto.subtle.digest('SHA-256',encoder.encode(a)),
    crypto.subtle.digest('SHA-256',encoder.encode(b))
  ]);
  const x=new Uint8Array(left),y=new Uint8Array(right);
  let difference=0;
  for(let i=0;i<x.length;i++)difference|=x[i]^y[i];
  return difference===0;
}
export async function onRequest(context){
  // If a runtime binding is missing, misconfigured or too weak, never serve
  // frontend HTML, JS, static assets or the service worker.
  const password=context.env?.QA_ACCESS_PASSWORD;
  if(typeof password!=='string'||password.length<24||password.length>128||
    !/^[\x21-\x7E]+$/.test(password))return unavailable();

  const provided=context.request.headers.get('Authorization')||'';
  if(provided.length>512)return denied();
  const expected='Basic '+btoa('ale-tester:'+password);
  if(!await sameDigest(provided,expected))return denied();

  // Do not let authenticated assets become publicly cacheable.
  const response=await context.next();
  const headers=new Headers(response.headers);
  for(const [key,value] of Object.entries(noStoreHeaders))headers.set(key,value);
  return new Response(response.body,{
    status:response.status,statusText:response.statusText,headers
  });
}
