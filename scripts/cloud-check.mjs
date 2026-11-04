/**
 * Smoke test sicuro, SOLO LETTURA, contro l'unico Supabase Cloud Ale Coach.
 * Richiede le variabili pubbliche Vite. Non crea utenti, prenotazioni o pagamenti.
 */
import assert from 'node:assert/strict';

const url=String(process.env.VITE_SUPABASE_URL||'').trim().replace(/\/$/,'');
const apikey=String(process.env.VITE_SUPABASE_PUBLISHABLE_KEY||'').trim();
assert.equal(url,'https://mmtnzjdvvlouiwgrydlf.supabase.co',
  'Questo comando può verificare soltanto il Supabase del progetto Ale Coach');
assert(apikey.startsWith('sb_publishable_'),
  'Manca la chiave PUBBLICA sb_publishable_* (mai service_role).');

async function read(path,{method='GET',body}={}){
 const r=await fetch(url+path,{
  method,
  headers:{
   apikey,
   Authorization:`Bearer ${apikey}`,
   ...(body?{'Content-Type':'application/json'}:{})
  },
  ...(body?{body:JSON.stringify(body)}:{})
 });
 const raw=await r.text();
 let data;try{data=JSON.parse(raw)}catch{data=raw}
 return {status:r.status,data};
}

const eq=(actual,expected,description)=>{
 assert.deepEqual(actual,expected,description);
 console.log('✓ '+description);
};
const main=async()=>{
 const services=await read('/rest/v1/services?select=id,price_cents&order=sort_order');
 eq(services.status,200,'Catalogo accessibile (API pubblica)');
 const prices=Object.fromEntries(services.data.map(x=>[x.id,x.price_cents]));
 eq(prices,{single:5500,couple:8000,check:3500,start:5000,intro:0,other:0},
   'Prezzi v2 corretti, compresi i servizi gratuiti');

 const packages=await read('/rest/v1/packages?select=id,price_cents&order=sort_order');
 eq(packages.status,200,'Pacchetti accessibili');
 eq(Object.fromEntries(packages.data.map(x=>[x.id,x.price_cents])),
   {five:25000,ten:45000,monthly4:15000,monthly8:26000},
   'Flex e Continuity del listino v2');

 const venues=await read('/rest/v1/venues?select=id&order=id');
 eq(venues.status,200,'Sedi pubbliche accessibili');
 eq(venues.data.map(x=>x.id),['nuovo_salario','talenti'],'Entrambe le sedi presenti');

 const windows=await read('/rest/v1/availability_windows?select=venue_id,weekday,start_minute&limit=2');
 eq(windows.status,200,'Finestre di disponibilità leggibili senza login');

 const auth=await read('/auth/v1/settings');
 eq(auth.status,200,'Configurazione Auth disponibile');
 eq(auth.data.mailer_autoconfirm,false,'Conferma email obbligatoria');

 const protectedRpc=await read('/rest/v1/rpc/available_slots_v2',{
  method:'POST',body:{p_service_id:'single',p_day:'2026-11-09',p_venue_preference:'indifferente'}
 });
 assert([401,403].includes(protectedRpc.status),
  'L’endpoint delle disponibilità deve richiedere autenticazione');
 console.log('✓ RPC privata vietata senza login');

 const discount=await read('/rest/v1/discount_codes?select=code');
 const discountsHidden= [401,403].includes(discount.status)
  || (discount.status===200&&Array.isArray(discount.data)&&discount.data.length===0);
 assert(discountsHidden,'Sconti interni non devono essere pubblicamente leggibili');
 console.log('✓ Codici interni non visibili a utenti anonimi');

 console.log('\nCloud smoke OK: nessun dato è stato modificato.');
};
main().catch(e=>{console.error('❌ Cloud smoke:',e.message);process.exitCode=1});
