// Safe preflight-only probe for the three ALE COACH customer Edge Functions.
// Never sends JWTs, API keys, booking details, or payments.
// Usage: QA_ALLOWED_ORIGIN=https://ale-coach-prenotazioni.vercel.app node scripts/qa-cors-preflight.mjs
import { pathToFileURL } from 'node:url';

const functions = ['create-checkout','cancel-booking','decide-booking'];
const supabaseUrl='https://mmtnzjdvvlouiwgrydlf.supabase.co';
const deniedOrigin='https://evil.example';

function exactHttpsOrigin(value) {
 try {
  const url=new URL(value);
  if(url.protocol!=='https:'||url.username||url.password||url.pathname!=='/'||
     url.search||url.hash||url.origin!==value.replace(/\/$/,''))return false;
  return true;
 } catch {return false;}
}

export async function runCorsPreflight({
 allowedOrigin,
 fetchImpl=fetch
}) {
 if(!exactHttpsOrigin(allowedOrigin)||allowedOrigin===deniedOrigin)
  throw new Error('QA_ALLOWED_ORIGIN must be one exact approved HTTPS origin (no wildcard, path or query)');
 const results=[];
 for(const name of functions) {
  for(const origin of [allowedOrigin,deniedOrigin]) {
   const request=new URL('/functions/v1/'+name,supabaseUrl);
   const response=await fetchImpl(request,{
    method:'OPTIONS',
    redirect:'error',
    signal:AbortSignal.timeout(12000),
    headers:{
     Origin:origin,
     'Access-Control-Request-Method':'POST',
     'Access-Control-Request-Headers':'authorization, x-client-info, apikey, content-type'
    }
   });
   const allow=response.headers.get('access-control-allow-origin');
   if(origin===allowedOrigin){
    const methods=response.headers.get('access-control-allow-methods')||'';
    const vary=response.headers.get('vary')||'';
    if(response.status!==200||allow!==allowedOrigin||!methods.includes('POST')||!vary.toLowerCase().includes('origin'))
     throw new Error(name+': expected HTTP 200 / exact allow-origin / Vary / POST, got HTTP '+response.status+
      ', allow-origin='+String(allow));
   }else if(response.status!==403||allow!==null){
    throw new Error(name+': disallowed Origin must return HTTP 403 without allow-origin, got HTTP '+response.status);
   }
  }
  results.push(name);
 }
 return results;
}

if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url){
 runCorsPreflight({allowedOrigin:process.env.QA_ALLOWED_ORIGIN||''}).then(result=>{
  console.log('PASS:',result.join(', '),'accept approved origin and deny an unrelated origin.');
  console.log('This is a CORS preflight check only, not authenticated E2E booking or Stripe QA.');
 }).catch(error=>{console.error('FAIL:',error.message);process.exitCode=1;});
}
