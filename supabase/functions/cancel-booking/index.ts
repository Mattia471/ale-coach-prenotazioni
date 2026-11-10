import Stripe from 'npm:stripe@22.0.0';
import { createClient } from 'npm:@supabase/supabase-js@2';
const appUrl=Deno.env.get('PUBLIC_APP_URL')||'';
const cors={'Access-Control-Allow-Origin':appUrl||'null','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'};
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,'Content-Type':'application/json'}});
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
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
  const {bookingId}=await req.json();
  const {data:b,error}=await admin.from('bookings').select('*').eq('id',bookingId).single();
  if(error||!b||b.client_id!==user.id)return json({error:'Prenotazione non trovata'},404);
  // Prima dell'approvazione si ANNULLA solo la preautorizzazione:
  // mai un rimborso di fondi che non sono stati incassati.
  const isBeforeApproval=b.payment_mode==='online'&&
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
  // Policy V2 remains disabled until its migration, Stripe Sandbox QA and legal approval.
  if(Deno.env.get('CANCELLATION_POLICY_V2_ENABLED')==='true' &&
    b.status==='confirmed'&&b.payment_status==='paid'&&b.payment_mode==='online'){
   if(!b.starts_at||new Date(b.starts_at).getTime()<=Date.now())
    return json({error:'La lezione è già iniziata: contatta il coach'},409);
   const userDb=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_ANON_KEY')!,{
    global:{headers:{Authorization:`Bearer ${token}`}},
    auth:{persistSession:false,autoRefreshToken:false}
   });
   // Lock and freeze the amount on DB once, so retries cannot change the 24h band.
   const {data:claimed,error:claimError}=await userDb.rpc('claim_paid_booking_refund',{p_booking_id:b.id});
   if(claimError)return json({error:claimError.message},409);
   const refundCents=Number(claimed);
   if(!Number.isSafeInteger(refundCents)||refundCents<=0||refundCents>b.amount_cents)
    throw new Error('Importo rimborso non valido');
   const stripe=new Stripe(key);
   const intent=await stripe.paymentIntents.retrieve(b.stripe_payment_intent_id);
   if(intent.status!=='succeeded'||
      intent.metadata.booking_id&&intent.metadata.booking_id!==b.id||
      intent.metadata.kind&&intent.metadata.kind!=='booking_authorization')
    return json({error:'Pagamento Stripe da verificare prima della disdetta'},409);
   // Reconcile an earlier Stripe success before creating a new refund.
   // Unlike idempotency keys alone, this also protects retries after 24 hours.
   const existing=await stripe.refunds.list({payment_intent:b.stripe_payment_intent_id,limit:100});
   let refund=existing.data.find(item=>item.metadata?.booking_id===b.id && item.metadata?.policy==='cancel-v2');
   if(refund && refund.amount!==refundCents)
    throw new Error('Importo del rimborso precedente non coerente');
   if(!refund){
    refund=await stripe.refunds.create({
     payment_intent:b.stripe_payment_intent_id,amount:refundCents,
     reason:'requested_by_customer',metadata:{booking_id:b.id,policy:'cancel-v2'}
    },{idempotencyKey:`ale-cancel-v2-${b.id}`});
   }
   if(refund.status!=='succeeded'&&refund.status!=='pending')
    return json({error:'Rimborso Stripe da verificare: contatta il coach'},409);
   // Persist the exact Stripe refund id and amount; only the service role can finalise.
   const {error:completeError}=await admin.rpc('complete_paid_booking_refund',{
    p_booking_id:b.id,p_refund_id:refund.id,p_refund_amount_cents:refundCents,p_refund_status:refund.status
   });
   if(completeError)throw completeError;
   return json({ok:true,refundAmountCents:refundCents,refundStatus:refund.status,
    partialRefund:refundCents<b.amount_cents});
  }
  if(b.status!=='confirmed'||b.payment_status!=='paid'||b.payment_mode!=='online'||!b.stripe_payment_intent_id)return json({error:'Prenotazione non rimborsabile online'},409);
  if(!b.starts_at||new Date(b.starts_at).getTime()-Date.now()<24*3600000)return json({error:'Il limite per la disdetta gratuita è di 24 ore prima'},409);
  const stripe=new Stripe(key);
  await stripe.refunds.create({payment_intent:b.stripe_payment_intent_id,reason:'requested_by_customer'},{idempotencyKey:`ale-refund-${b.id}`});
  const {data:saved,error:saveError}=await admin.from('bookings')
   .update({status:'cancelled',payment_status:'refunded',cancelled_at:new Date().toISOString()})
   .eq('id',b.id).eq('status','confirmed').eq('payment_status','paid')
   .select('id').maybeSingle();
  if(saveError)throw saveError;
  if(!saved)throw new Error('Rimborso avviato su Stripe, ma la prenotazione va riconciliata manualmente');
  await admin.from('notifications').insert({recipient_id:b.client_id,title:'Disdetta e rimborso',body:'La tua lezione è stata disdetta. Il rimborso è stato avviato sul metodo originale.',kind:'booking_cancelled',booking_id:b.id});
  return json({ok:true});
 }catch(e){console.error('cancel-booking',e);return json({error:'Rimborso non completato. Contatta il coach.'},500)}
});
