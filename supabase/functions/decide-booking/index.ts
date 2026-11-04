import Stripe from 'npm:stripe@22.0.0';
import { createClient } from 'npm:@supabase/supabase-js@2';

const appUrl=Deno.env.get('PUBLIC_APP_URL')||'';
const cors={'Access-Control-Allow-Origin':appUrl||'null',
 'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type',
 'Access-Control-Allow-Methods':'POST, OPTIONS'};
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{
 status,headers:{...cors,'Content-Type':'application/json'}
});

// Approva: ricontrolla slot, corsi, trasferimenti e chiusure nell'agenda interna -> cattura Stripe -> conferma nel DB.
// Rifiuta: annulla autorizzazione su Stripe -> rifiuta in DB.
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 if(req.method!=='POST')return json({error:'Metodo non consentito'},405);
 const key=Deno.env.get('STRIPE_SECRET_KEY');
 const environment=Deno.env.get('STRIPE_ENVIRONMENT')||'test';
 const valid=environment==='test'&&!!key?.startsWith('sk_test_')||
  environment==='live'&&Deno.env.get('STRIPE_LIVE_APPROVED')==='true'&&!!key?.startsWith('sk_live_');
 if(Deno.env.get('STRIPE_PAYMENTS_ENABLED')!=='true'||!valid)
  return json({error:'Pagamenti sandbox non attivati'},503);
 try{
  const body=await req.json();
  const bookingId=String(body.bookingId||'');
  const action=String(body.action||'');
  if(!/^[a-f0-9-]{36}$/i.test(bookingId)||!['approve','reject'].includes(action))
   return json({error:'Richiesta non valida'},400);
  const token=req.headers.get('Authorization')?.replace(/^Bearer\s+/i,'')||'';
  if(!token)return json({error:'Accedi come coach'},401);
  const url=Deno.env.get('SUPABASE_URL')!;
  const anon=Deno.env.get('SUPABASE_ANON_KEY')!;
  const userDb=createClient(url,anon,{
   global:{headers:{Authorization:`Bearer ${token}`}},
   auth:{persistSession:false,autoRefreshToken:false}
  });
  const {data:{user},error:authError}=await userDb.auth.getUser(token);
  if(authError||!user)return json({error:'Sessione non valida'},401);
  const admin=createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{
   auth:{persistSession:false,autoRefreshToken:false}
  });
  const {data:profile,error:profileError}=await admin.from('profiles').select('role').eq('id',user.id).maybeSingle();
  if(profileError||profile?.role!=='coach')return json({error:'Riservato al coach'},403);
  const {data:existing}=await admin.from('bookings')
   .select('status,payment_status,stripe_decision').eq('id',bookingId).maybeSingle();
  if(action==='approve'&&existing?.status==='confirmed'&&existing?.payment_status==='paid')
   return json({ok:true,status:'confirmed'});
  if(action==='reject'&&existing?.status==='rejected')return json({ok:true,status:'rejected'});
  const {error:claimError}=await userDb.rpc('claim_booking_decision',{
   p_booking_id:bookingId,p_action:action
  });
  if(claimError)return json({error:claimError.message},409);
  const {data:booking,error:bookingError}=await admin.from('bookings')
   .select('id,status,stripe_payment_intent_id,amount_cents,stripe_decision')
   .eq('id',bookingId).single();
  if(bookingError||!booking||booking.status!=='processing'||booking.stripe_decision!==action||
     !booking.stripe_payment_intent_id)return json({error:'Autorizzazione non riconciliabile'},409);
  const stripe=new Stripe(key);
  const intent=await stripe.paymentIntents.retrieve(booking.stripe_payment_intent_id);
  if(intent.metadata.kind!=='booking_authorization'||intent.metadata.booking_id!==booking.id||
     intent.amount!==booking.amount_cents||intent.currency!=='eur')
   throw new Error('Stripe PaymentIntent mismatch');
  if(action==='approve'){
   if(intent.status==='requires_capture'){
    const captured=await stripe.paymentIntents.capture(intent.id,{},
     {idempotencyKey:`ale-manual-capture-v2-${booking.id}`});
    if(captured.status!=='succeeded')throw new Error('Cattura Stripe non confermata');
   }else if(intent.status!=='succeeded')return json({error:'Autorizzazione scaduta o non catturabile'},409);
  }else{
   if(intent.status==='requires_capture'){
    const canceled=await stripe.paymentIntents.cancel(intent.id,{},
     {idempotencyKey:`ale-manual-reject-v2-${booking.id}`});
    if(canceled.status!=='canceled')throw new Error('Annullamento Stripe non confermato');
   }else if(intent.status!=='canceled')return json({error:'Non è possibile annullare una transazione già incassata'},409);
  }
  const {error:completeError}=await admin.rpc('complete_booking_decision',{
   p_booking_id:booking.id,p_action:action,p_intent_id:intent.id
  });
  if(completeError)throw completeError;
  return json({ok:true,status:action==='approve'?'confirmed':'rejected'});
 }catch(e){
  console.error('decide-booking',e);
  return json({error:'Stato Stripe da riconciliare: riprova la stessa azione o contatta il supporto.'},500);
 }
});
