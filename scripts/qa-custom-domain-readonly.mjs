// One-shot public DNS/HTTPS checks. No credentials, user data or writes.
import dns from 'node:dns/promises';

async function records(domain,rrtype) {
 try { return await dns.resolve(domain,rrtype); }
 catch(e){ console.log('DNS',domain,rrtype,'unavailable:',e.code||'error'); return []; }
}
for(const host of ['alecoach.online','www.alecoach.online']) {
 const a=await records(host,'A');
 const aaaa=await records(host,'AAAA');
 const cname=await records(host,'CNAME');
 console.log('DNS',host,'A-count',a.length,'AAAA-count',aaaa.length,
  'CNAME-targets',cname.filter(x=>x.endsWith('pages.dev')));
 try {
  const r=await fetch('https://'+host+'/',{
   redirect:'follow',signal:AbortSignal.timeout(12000),
   headers:{'Cache-Control':'no-cache'}
  });
  const html=(r.headers.get('content-type')||'').includes('text/html')
   ? await r.text() : '';
  console.log('HTTPS',host,'status',r.status,'final',r.url,
    'react_shell',/ALE COACH|<div id="root"/i.test(html),
    'noindex',r.headers.get('x-robots-tag')||'(none)');
 }catch(e){console.log('HTTPS',host,'ERROR',e.cause?.code||e.name||'fetch failed');}
}
const mx=await records('alecoach.online','MX');
const txt=await records('alecoach.online','TXT');
const dmarc=await records('_dmarc.alecoach.online','TXT');
const hasPrefix=(xs,prefix)=>xs.map(r=>Array.isArray(r)?r.join(''):String(r))
 .some(v=>v.toLowerCase().startsWith(prefix.toLowerCase()));
console.log('MAIL DNS: MX records',mx.length,
 'SPF-present',hasPrefix(txt,'v=spf1'),
 'DMARC-present',hasPrefix(dmarc,'v=DMARC1'));
console.log('NOTE: SPF/DKIM/DMARC authenticity and SMTP delivery cannot be certified by DNS presence alone.');
