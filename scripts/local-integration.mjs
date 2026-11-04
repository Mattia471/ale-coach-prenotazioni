/**
 * Test locali di integrazione: crea 2 utenti effimeri, verifica RLS, overbooking e promo.
 * Non esegue mai su Supabase cloud: readLocalStatus + assertLoopback obbligatori.
 * Non sono richiesti Stripe o segreti esterni.
 */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { assertLoopback, readLocalStatus } from './local-status.mjs';

const env = readLocalStatus();
const origin = assertLoopback(env.API_URL);
const anonymousKey = env.PUBLISHABLE_KEY || env.ANON_KEY;
const secretKey = env.SECRET_KEY || env.SERVICE_ROLE_KEY;
assert(anonymousKey && secretKey, 'Chiavi Supabase locale mancanti.');

async function request(path, {method='GET',body,key=anonymousKey,token,prefer}={}) {
  const response=await fetch(origin+path,{
    method,headers:{
      apikey:key,
      ...(token?{Authorization:`Bearer ${token}`}:key===secretKey?{Authorization:`Bearer ${secretKey}`}:{}),
      ...(body===undefined?{}:{'Content-Type':'application/json'}),
      ...(prefer?{Prefer:prefer}:{}),
    },
    ...(body===undefined?{}:{body:JSON.stringify(body)}),
  });
  const raw=await response.text();
  let data;try{data=raw?JSON.parse(raw):null;}catch{data=raw;}
  return {status:response.status,ok:response.ok,data};
}
const db=async (path,opts)=>{
  const r=await request(path,{...opts,key:secretKey});
  assert(r.ok,`API admin ${path}: HTTP ${r.status} ${JSON.stringify(r.data)}`);
  return r.data;
};
const dayInRome=offset=>new Intl.DateTimeFormat('sv-SE',{
  timeZone:'Europe/Rome',year:'numeric',month:'2-digit',day:'2-digit'
}).format(new Date(Date.now()+offset*86400000));
const createdUserIds=[];
const bookingIds=[];
let assertionCount=0;
const confirm=(condition,message)=>{assert(condition,message);assertionCount++;console.log('✓ '+message)};
try{
  const pwd='AleBookingTestLocal2026!';
  const accounts=[];
  for(let i=0;i<2;i++){
    const email=`integration-${randomUUID()}@example.test`;
    const user=await db('/auth/v1/admin/users',{
      method:'POST',body:{email,password:pwd,email_confirm:true,user_metadata:{full_name:'Integrazione Locale'}},
    });
    assert(user?.id,'ID utente test non restituito');
    createdUserIds.push(user.id);
    await db(`/rest/v1/profiles?id=eq.${user.id}`,{
      method:'PATCH',body:{virgin_member:true},prefer:'return=representation',
    });
    const login=await request('/auth/v1/token?grant_type=password',{
      method:'POST',body:{email,password:pwd},
    });
    assert(login.ok&&login.data.access_token,`Accesso utente test: ${login.status}`);
    accounts.push({id:user.id,token:login.data.access_token});
  }

  const [a,b]=accounts;
  const visible=await request(`/rest/v1/profiles?select=id&id=eq.${b.id}`,{token:a.token});
  confirm(visible.ok&&visible.data.length===0,'RLS impedisce di leggere il profilo di un altro cliente');

  await request(`/rest/v1/profiles?id=eq.${a.id}`,{
    method:'PATCH',token:a.token,body:{role:'coach'},prefer:'return=representation',
  });
  const own=await db(`/rest/v1/profiles?select=role&id=eq.${a.id}`);
  confirm(own?.[0]?.role==='client','Il cliente non può promuoversi a coach');

  // L'upload schede è bloccato anche nel backend, non soltanto nascosto nella UI.
  const bucket=await request('/storage/v1/bucket/client-documents',{key:secretKey});
  confirm(bucket.ok,'Bucket privato presente nel progetto');
  const onePixelPng=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/5p8AAAAASUVORK5CYII=','base64');
  const upload=await fetch(`${origin}/storage/v1/object/client-documents/${a.id}/test-${randomUUID()}.png`,{
    method:'POST',
    headers:{apikey:anonymousKey,Authorization:`Bearer ${a.token}`,'Content-Type':'image/png'},
    body:onePixelPng,
  });
  const uploadError=await upload.text();
  confirm(upload.status===403||(upload.status===400&&/row.level|policy|permission/i.test(uploadError)),
   'RLS Storage blocca upload di documenti anche tramite API diretta');

  const promo=await db('/rest/v1/discount_codes?select=code,active,percent_off&code=eq.ALECOACH15');
  confirm(promo?.[0]?.active===true&&promo[0].percent_off===15,'ALECOACH15 attivo al 15%');
  const oldPromo=await db('/rest/v1/discount_codes?select=active&code=eq.ALECOACH10');
  confirm(oldPromo?.[0]?.active===false,'ALECOACH10 precedente disattivato');
  const prices=await db('/rest/v1/services?select=id,price_cents&id=in.(single,couple,check,start)');
  const money=Object.fromEntries(prices.map(x=>[x.id,x.price_cents]));
  confirm(money.single===5500&&money.couple===8000&&money.check===3500&&money.start===5000,
    'Listino v2 corretto nei centesimi');
  const oldRpc=await request('/rest/v1/rpc/available_slots',{
   method:'POST',body:{p_service_id:'single',p_day:dayInRome(3)}
  });
  confirm(!oldRpc.ok,'RPC orario intero legacy non più accessibile ai clienti');

  let choice;
  for(let offset=2;offset<=7&&!choice;offset++){
    const day=dayInRome(offset);
    const [intro,single]=await Promise.all([
      request('/rest/v1/rpc/available_slots_v2',{method:'POST',
       body:{p_service_id:'intro',p_day:day,p_venue_preference:'indifferente'}}),
      request('/rest/v1/rpc/available_slots_v2',{method:'POST',
       body:{p_service_id:'single',p_day:day,p_venue_preference:'indifferente'}}),
    ]);
    if(!intro.ok||!single.ok)throw Error('RPC available_slots_v2 non disponibile');
    for(const slot of intro.data||[]){
      const later=(single.data||[]).filter(x=>x.venue_id===slot.venue_id&&x.start_minute>=slot.start_minute+60);
      if(later.length>=2){choice={day,introHour:slot.start_minute,venue:slot.venue_id,
       first:later[0].start_minute,second:later[1].start_minute};break}
    }
  }
  assert(choice,'Nessun giorno con 3 slot disponibili: libera orari test oppure riprova.');
  console.log(`Collaudo: ${choice.day}, slot ${choice.introHour}, ${choice.first}, ${choice.second}`);

  const book=(token,service,startMinute,p_code)=>request('/rest/v1/rpc/create_booking_v2',{
    method:'POST',token,
    body:{
      p_service_id:service,p_venue_id:choice.venue,p_day:choice.day,p_start_minute:startMinute,
      p_details:service==='single'?{discipline:'Hyrox'}:{},
      p_payment_mode:'online',...(p_code?{p_code}:{}),
    },
  });
  confirm(choice.introHour%15===0&&choice.first%15===0,'Griglia slot a multipli di 15 minuti');
  // Hold: un utente blocca 10 minuti lo stesso slot su tutte le sedi.
  const holdA=await request('/rest/v1/rpc/reserve_slot_v2',{method:'POST',token:a.token,
   body:{p_service_id:'intro',p_day:choice.day,p_start_minute:choice.introHour,p_venue_id:choice.venue}});
  confirm(holdA.ok&&Date.parse(holdA.data)>Date.now(),'Hold tecnico di 10 minuti creato');
  const holdB=await request('/rest/v1/rpc/reserve_slot_v2',{method:'POST',token:b.token,
   body:{p_service_id:'intro',p_day:choice.day,p_start_minute:choice.introHour,p_venue_id:choice.venue}});
  confirm(!holdB.ok,'Un secondo cliente non può riservare uno slot già tenuto');
  const released=await request('/rest/v1/rpc/release_slot_hold_v2',{method:'POST',token:a.token,body:{}});
  confirm(released.ok,'Hold liberato dopo cambio idea');
  const collision=await Promise.all([
    book(a.token,'intro',choice.introHour),
    book(b.token,'intro',choice.introHour),
  ]);
  const accepted=collision.filter(x=>x.ok);
  confirm(accepted.length===1,'Due clienti simultanei sullo stesso slot: esattamente una richiesta accettata');
  if(accepted[0])bookingIds.push(accepted[0].data);

  if(accepted[0]){
    const fromA=await db(`/rest/v1/bookings?select=id,status,amount_cents&id=eq.${accepted[0].data}`);
    const id=fromA[0].id;
    await request(`/rest/v1/bookings?id=eq.${id}`,{
      method:'PATCH',token:a.token,body:{status:'confirmed',amount_cents:0},
      prefer:'return=representation',
    });
    const verify=await db(`/rest/v1/bookings?select=status,amount_cents&id=eq.${id}`);
    confirm(verify[0].status==='pending','Il browser non può confermare da solo una prenotazione');
  }

  const discounted=await book(a.token,'single',choice.first,'ALECOACH15');
  confirm(discounted.ok&&typeof discounted.data==='string','Prima richiesta scontata accettata');
  if(discounted.ok){
   bookingIds.push(discounted.data);
   const amount=await db(`/rest/v1/bookings?select=amount_cents,discount_percent&id=eq.${discounted.data}`);
   confirm(amount?.[0]?.amount_cents===4675&&amount?.[0]?.discount_percent===15,
    'Prima individuale a 46,75 €: promo applicata solo dal server');
  }
  const repeated=await book(a.token,'single',choice.second,'ALECOACH15');
  confirm(!repeated.ok,'Una seconda prenotazione attiva con lo stesso sconto viene respinta');

  const hiddenEvents=await request('/rest/v1/external_calendar_events?select=id',{token:a.token});
  confirm(!hiddenEvents.ok||(hiddenEvents.data||[]).length===0,
   'Gli impegni Google esterni non sono esposti ai clienti');
  console.log(`\nOK: ${assertionCount} controlli applicativi superati. Utenti di prova eliminati.`);
}catch(e){
  console.error('❌ Test di integrazione fallito:',e instanceof Error?e.message:String(e));
  process.exitCode=1;
}finally{
  // Le notifiche rivolte al coach vanno eliminate prima del cascade sui booking.
  if(bookingIds.length){
    const ids=bookingIds.filter(id=>/^[0-9a-f-]{36}$/i.test(id));
    if(ids.length)await request(`/rest/v1/notifications?booking_id=in.(${ids.join(',')})`,{
      method:'DELETE',key:secretKey,
    }).catch(()=>{});
  }
  for(const id of createdUserIds){
    await request(`/auth/v1/admin/users/${id}`,{method:'DELETE',key:secretKey}).catch(()=>{});
  }
}
