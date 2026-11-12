import {
 allowedAppOrigins,normalizeHttpsOrigin,trustedRequestOrigin,isDisallowedBrowserOrigin
} from './trusted-origins.ts';

const primary='https://ale-coach-prenotazioni.vercel.app';
const extra='https://alecoach.online, https://www.alecoach.online';
const ensure=(condition:boolean,message:string)=>{if(!condition)throw new Error(message)};
const req=(origin:string)=>new Request('https://example.supabase.co/functions/v1/create-checkout',{
 method:'OPTIONS',headers:{Origin:origin,'Access-Control-Request-Method':'POST'}
});

Deno.test('Only exact HTTPS origins from operator configuration are trusted',()=>{
 const allowed=allowedAppOrigins(primary,extra);
 ensure(allowed.size===3,'Expected three exact origins');
 ensure(allowed.has('https://alecoach.online'),'Missing Cloudflare origin');
 ensure(allowed.has(primary),'Missing Vercel origin');
 ensure(!allowed.has('https://evil.alecoach.online'),'No wildcard subdomains');
 ensure(!allowed.has('http://alecoach.online'),'No HTTP');
 ensure(normalizeHttpsOrigin('https://alecoach.online/checkout')===null,'No paths');
});
Deno.test('Browser preflight rejects lookalike origins but permits approved hosts',()=>{
 ensure(trustedRequestOrigin(req(primary),primary,extra)===primary,'Vercel rejected');
 ensure(trustedRequestOrigin(req('https://alecoach.online'),primary,extra)==='https://alecoach.online','Cloudflare rejected');
 for(const origin of ['https://alecoach.online.evil.example','https://attacker.example','null','http://alecoach.online']){
  ensure(trustedRequestOrigin(req(origin),primary,extra)===null,'Untrusted origin passed: '+origin);
  ensure(isDisallowedBrowserOrigin(req(origin),primary,extra),'Untrusted origin not blocked: '+origin);
 }
});
Deno.test('Server requests with no Origin are not mistaken for browsers',()=>{
 const server=new Request('https://example.supabase.co/functions/v1/create-checkout',{method:'POST'});
 ensure(!isDisallowedBrowserOrigin(server,primary,extra),'Server request rejected');
});

Deno.test('Password-protected Cloudflare QA checkout retains its exact return origin',()=>{
 const qa='https://ale-coach-qa-sandbox.pages.dev';
 const prodPages='https://ale-coach-prenotazioni.pages.dev';
 const configured=[extra,qa,prodPages].join(',');
 const browser=new Request('https://example.supabase.co/functions/v1/create-checkout',{
  method:'POST',headers:{Origin:qa}
 });
 ensure(allowedAppOrigins(primary,configured).has(qa),'Missing the QA host in allowlist');
 ensure(trustedRequestOrigin(browser,primary,configured)===qa,
  'Stripe checkout would fall back to Vercel instead of its QA browser Origin');
 ensure(!isDisallowedBrowserOrigin(browser,primary,configured),'QA host wrongly rejected');
 const attacker=req('https://ale-coach-qa-sandbox.pages.dev.attacker.example');
 ensure(isDisallowedBrowserOrigin(attacker,primary,configured),'QA subdomain lookalike accepted');
 const publicPages=req(prodPages);
 ensure(trustedRequestOrigin(publicPages,primary,configured)===prodPages,
  'Public Cloudflare Pages origin wrongly rejected');
});
