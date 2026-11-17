import { corsForRequest, isDisallowedBrowserOrigin } from '../_shared/trusted-origins.ts';
import Stripe from 'npm:stripe@22.0.0';
import {isRefundIntentForBooking} from '../_shared/refund-binding.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
Deno.serve(async req=>{
 const cors=corsForRequest(req);
 const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,'Content-Type':'application/json'}});

 if(req.method==='OPTIONS')return new Response('ok',{status:isDisallowedBrowserOrigin(req)?403:200,headers:cors});
 if(isDisallowedBrowserOrigin(req))return json({error:'Origine non autorizzata'},403);
 if(req.method!=='POST')return json({error:'Metodo non consentito'},405);
 const key=Deno.env.get('STRIPE_SECRET_KEY');
 const environment=Deno.env.get('STRIPE_ENVIRONMENT')||'test';
 if(Deno.env.get('STRIPE_PAYMENTS_ENABLED')!=='true'||
   !(environment==='test'&&key?.startsWith('sk_test_')||
     environment==='live'&&Deno.env.get('STRIPE_LIVE_APPROVED')==='true'&&key?.startsWith('sk_live_')))
  return json({error:'Stripe non attivo: verifica configurazione e collaudo.'},503);
 try{
  const auth=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_ANON_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
  const token=req.headers.get('Authorization')?.replace(/^Bearer\s+/i,'')||'';
  const {data:{user},error:authError}=await auth.auth.getUser(token);
  if(authError||!user)return json({error:'Sessione non valida'},401);
  const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
  const body=await req.json();
  const bookingId=String(body.bookingId||'');
  const coachCancellation=body.actor==='coach';
  if(coachCancellation){
   const {data:actorProfile,error:roleError}=await admin.from('profiles')
    .select('role').eq('id',user.id).maybeSingle();
   if(roleError||actorProfile?.role!=='coach')
    return json({error:'Operazione riservata al coach'},403);
  }
  const {data:b,error}=await admin.from('bookings').select('*').eq('id',bookingId).single();
  if(error||!b||(!coachCancellation&&b.client_id!==user.id))
   return json({error:'Prenotazione non trovata'},404);
  if(coachCancellation&&b.status!=='confirmed')
   return json({error:'Il coach può annullare solo lezioni confermate'},409);
  // Prima dell'approvazione si ANNULLA solo la preautorizzazione:
  // mai un rimborso di fondi che non sono stati incassati.
  const isBeforeApproval=!coachCancellation&&b.payment_mode==='online'&&
   (b.status==='authorizing'||
     b.status==='pending'&&['authorized','unpaid'].includes(b.payment_status)||
     b.status==='processing'&&b.stripe_decision==='cancel');
  if(isBeforeApproval){
   const userDb=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_ANON_KEY')!,{
    global:{headers:{Authorization:`Bearer ${token}`}},
    auth:{persistSession:false,autoRefreshToken:false}
   });
   const {error:claimError}=await userDb.rpc('claim_booking_cancellation',{p_booking_id:b.id});
   if(claimError)return json({error:claimError.message},409);
   const stripe=new Stripe(key);
   let piId:string|null=b.stripe_payment_intent_id;
   if(b.stripe_checkout_session_id){
    const session=await stripe.checkout.sessions.retrieve(b.stripe_checkout_session_id);
    if(session.status==='open'){
     await stripe.checkout.sessions.expire(session.id,{},{
      idempotencyKey:`ale-cancel-checkout-v2-${b.id}`
     });
    }
    if(session.status==='complete')
     piId=typeof session.payment_intent==='string'?session.payment_intent:session.payment_intent?.id||null;
   }
   if(piId){
    const pi=await stripe.paymentIntents.retrieve(piId);
    if(pi.metadata.booking_id!==b.id||pi.metadata.kind!=='booking_authorization')
     throw new Error('Autorizzazione Stripe non corrispondente alla richiesta');
    if(pi.status==='requires_capture'){
     await stripe.paymentIntents.cancel(pi.id,{},{
      idempotencyKey:`ale-cancel-authorization-v2-${b.id}`
     });
    }else if(pi.status!=='canceled')
     return json({error:'La transazione necessita di verifica del supporto'},409);
   }
   const {error:completeError}=await admin.rpc('complete_booking_decision',{
    p_booking_id:b.id,p_action:'cancel',p_intent_id:b.stripe_payment_intent_id
   });
   if(completeError)throw completeError;
   return json({ok:true,authorizationReleased:true});
  }
  if(b.status!=='confirmed'||b.payment_status!=='paid'||b.payment_mode!=='online'||!b.stripe_payment_intent_id)return json({error:'Prenotazione non rimborsabile online'},409);
  if(!b.starts_at||new Date(b.starts_at).getTime()<=Date.now())return json({error:'La lezione è già iniziata: contatta il coach'},409);
  // Cancellation >=24h before start refunds 100%; later cancellations refund
  // 50%. Do not modify the captured price or silently erase the remainder.
  const requestedAmountCents=coachCancellation||new Date(b.starts_at).getTime()-Date.now()>=24*3600000
   ? b.amount_cents : Math.round(b.amount_cents/2);
  if(!Number.isInteger(requestedAmountCents)||requestedAmountCents<1)
   return json({error:'Importo del rimborso non valido'},409);
  const stripe=new Stripe(key);
  // Fails closed before any money-moving API call if the DB booking has a
  // mismatched, uncaptured, wrong-customer, or wrong-amount PaymentIntent.
  const intent=await stripe.paymentIntents.retrieve(b.stripe_payment_intent_id);
  if(!isRefundIntentForBooking(intent,b))
   return json({error:'Pagamento Stripe non corrispondente alla prenotazione: contatta il coach'},409);
  // Persist the intended refund amount BEFORE calling Stripe. A retry crossing
  // the 24-hour threshold must reuse the identical amount and idempotency key.
  // Pending amount is distinguishable from completed refund by refunded_at.
  let refundAmountCents=Number(b.refunded_amount_cents)||0;
  if(refundAmountCents===0){
   const {data:claimed,error:claimError}=await admin.from('bookings')
    .update({refunded_amount_cents:requestedAmountCents})
    .eq('id',b.id).eq('status','confirmed').eq('payment_status','paid')
    .eq('refunded_amount_cents',0)
    .select('refunded_amount_cents').maybeSingle();
   if(claimError)throw claimError;
   if(claimed)refundAmountCents=claimed.refunded_amount_cents;
   else {
    const {data:current,error:readError}=await admin.from('bookings')
     .select('status,payment_status,refunded_amount_cents').eq('id',b.id).single();
    if(readError||current?.status!=='confirmed'||current.payment_status!=='paid')
     return json({error:'Prenotazione già modificata, aggiorna la pagina'},409);
    refundAmountCents=Number(current.refunded_amount_cents)||0;
   }
  }
  if(!Number.isInteger(refundAmountCents)||refundAmountCents<1||refundAmountCents>b.amount_cents)
   return json({error:'Rimborso non riconciliabile, contatta il coach'},409);
  if(coachCancellation&&refundAmountCents!==b.amount_cents)
   return json({error:'È già stata avviata una disdetta con importo diverso: riconcilia il residuo manualmente'},409);
  await stripe.refunds.create({
   payment_intent:intent.id,
   amount:refundAmountCents,
   ...(coachCancellation?{}:{reason:'requested_by_customer' as const})
  },{idempotencyKey:`ale-refund-${b.id}`});
  const {data:saved,error:saveError}=await admin.from('bookings')
   .update({status:'cancelled',payment_status:'refunded',refunded_amount_cents:refundAmountCents,refunded_at:new Date().toISOString(),cancelled_at:new Date().toISOString()})
   .eq('id',b.id).eq('status','confirmed').eq('payment_status','paid')
   .select('id').maybeSingle();
  if(saveError)throw saveError;
  if(!saved)throw new Error('Rimborso avviato su Stripe, ma la prenotazione va riconciliata manualmente');
  await admin.from('notifications').insert({recipient_id:b.client_id,title:coachCancellation?'Annullamento e rimborso del coach':'Disdetta e rimborso',body:`${coachCancellation?'Il coach ha annullato la lezione.':'Lezione disdetta.'} Rimborso di ${(refundAmountCents/100).toFixed(2)} € avviato sul metodo originale.`,kind:'booking_cancelled',booking_id:b.id});
  return json({ok:true,refundAmountCents});
 }catch(e){console.error('cancel-booking',e);return json({error:'Rimborso non completato. Contatta il coach.'},500)}
});
