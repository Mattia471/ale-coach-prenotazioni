import Stripe from 'npm:stripe@22.0.0';
import { createClient } from 'npm:@supabase/supabase-js@2';

// Tutti gli eventi vengono verificati sulla firma Stripe originale prima del DB.
// Le autorizzazioni "requires_capture" NON sono pagamenti incassati.
Deno.serve(async req=>{
 if(req.method!=='POST')return new Response('Method not allowed',{status:405});
 const secret=Deno.env.get('STRIPE_SECRET_KEY');
 const signing=Deno.env.get('STRIPE_WEBHOOK_SECRET');
 const signature=req.headers.get('stripe-signature');
 const environment=Deno.env.get('STRIPE_ENVIRONMENT')||'test';
 const testMode=environment==='test'&&!!secret?.startsWith('sk_test_');
 const liveMode=environment==='live'&&Deno.env.get('STRIPE_LIVE_APPROVED')==='true'&&!!secret?.startsWith('sk_live_');
 if(Deno.env.get('STRIPE_PAYMENTS_ENABLED')!=='true'||(!testMode&&!liveMode)||!signing||!signature)
  return new Response('Payment integration not configured',{status:503});
 const stripe=new Stripe(secret);
 let event:Stripe.Event;
 try{
  event=await stripe.webhooks.constructEventAsync(await req.text(),signature,signing,undefined,Stripe.createSubtleCryptoProvider());
 }catch(e){console.error('Invalid Stripe signature',e);return new Response('Invalid signature',{status:400})}
 if(event.livemode !== liveMode)return new Response('Stripe environment mismatch',{status:400});
 const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{
  auth:{persistSession:false,autoRefreshToken:false}
 });
 try{
  if(event.type==='checkout.session.completed'){
   const session=event.data.object as Stripe.Checkout.Session;
   if(session.metadata?.kind==='package'){
    if(session.payment_status!=='paid')return new Response('OK');
    const orderId=session.metadata.order_id;
    const {data:order,error:orderError}=orderId
      ?await admin.from('package_checkout_orders').select('*').eq('id',orderId).maybeSingle()
      :{data:null,error:null};
    const pi=typeof session.payment_intent==='string'?session.payment_intent:session.payment_intent?.id||null;
    if(orderError)throw orderError;
    if(order?.status==='paid'&&order.stripe_session_id===session.id)return new Response('OK');
    if(!order||order.stripe_session_id!==session.id||order.client_id!==session.metadata.client_id
      ||order.package_id!==session.metadata.package_id||session.amount_total!==order.amount_cents
      ||session.currency!=='eur'||order.status!=='pending'){
      // Pagamento accreditato senza un ordine valido: rimborsiamo, non concediamo crediti.
      if(!pi)throw new Error('Pagamento pacchetto non riconciliabile: PaymentIntent assente');
      await stripe.refunds.create({payment_intent:pi,reason:'requested_by_customer'},
       {idempotencyKey:`ale-package-invalid-${session.id}`});
      return new Response('Refund initiated');
    }
    const {error:settleError}=await admin.rpc('settle_package_checkout_order',{
      p_order_id:order.id,p_session_id:session.id
    });
    if(settleError)throw settleError;
    return new Response('OK');
   }

   if(session.metadata?.kind!=='booking_authorization')return new Response('OK');
   const bookingId=session.metadata.booking_id;
   const piId=typeof session.payment_intent==='string'?session.payment_intent:session.payment_intent?.id;
   if(!bookingId||!piId)throw new Error('Checkout manual capture: PaymentIntent mancante');
   const {data:booking,error}=await admin.from('bookings')
    .select('id,client_id,status,payment_mode,payment_status,amount_cents,expires_at,stripe_checkout_session_id,stripe_payment_intent_id')
    .eq('id',bookingId).maybeSingle();
   if(error)throw error;
   const pi=await stripe.paymentIntents.retrieve(piId,{expand:['latest_charge']});
   if(!booking||booking.stripe_checkout_session_id!==session.id||
      booking.client_id!==session.metadata.client_id||booking.client_id!==pi.metadata.client_id||
      pi.metadata.booking_id!==bookingId||pi.metadata.kind!=='booking_authorization'||
      pi.amount!==booking.amount_cents||session.amount_total!==booking.amount_cents||
      pi.currency!=='eur'||session.currency!=='eur'){
     console.error('Checkout non riconciliabile',bookingId,session.id,piId);
     throw new Error('Checkout non riconciliabile; intervento necessario');
   }
   // Eventi Stripe possono essere ripetuti o arrivare fuori ordine.
   // Non annullare una carta gia' autorizzata mentre il coach sta decidendo.
   if(booking.stripe_payment_intent_id===pi.id&&
      (booking.status==='pending'&&booking.payment_status==='authorized'||
       booking.status==='processing'||booking.status==='confirmed'))
    return new Response('OK');
   if(booking.status!=='authorizing'||Date.parse(booking.expires_at)<=Date.now()){
    if(pi.status==='requires_capture')
     await stripe.paymentIntents.cancel(pi.id,{}, {idempotencyKey:`ale-expired-authorization-${bookingId}`});
    if(pi.status==='succeeded')
     await stripe.refunds.create({payment_intent:pi.id,reason:'requested_by_customer'},
      {idempotencyKey:`ale-late-auth-refund-${bookingId}`});
    return new Response('Late authorization released',{status:200});
   }
   if(pi.status!=='requires_capture'||pi.amount_capturable!==booking.amount_cents)
    throw new Error('Carta non autorizzata o importo non catturabile');

   const charge=typeof pi.latest_charge==='object'?pi.latest_charge as Stripe.Charge|null:null;
   const captureBefore=charge?.payment_method_details?.card?.capture_before;
   const {error:authorizationError}=await admin.rpc('finalize_booking_authorization',{
    p_booking_id:booking.id,p_session_id:session.id,p_intent_id:pi.id,
    p_capture_before:captureBefore?new Date(captureBefore*1000).toISOString():null
   });
   if(authorizationError)throw authorizationError;
   return new Response('Authorized, coach notified');
  }

  if(event.type==='checkout.session.expired'){
   const session=event.data.object as Stripe.Checkout.Session;
   if(session.metadata?.kind!=='booking_authorization'||!session.metadata.booking_id)return new Response('OK');
   const {data:booking,error}=await admin.from('bookings')
    .select('id,status,client_id,stripe_checkout_session_id').eq('id',session.metadata.booking_id).maybeSingle();
   if(error)throw error;
   if(!booking||booking.stripe_checkout_session_id!==session.id||booking.status!=='authorizing')
    return new Response('OK');
   const {error:expireError}=await admin.from('bookings')
    .update({status:'expired',payment_status:'unpaid'}).eq('id',booking.id)
    .eq('status','authorizing').eq('stripe_checkout_session_id',session.id);
   if(expireError)throw expireError;
   return new Response('Checkout expired');
  }

  if(event.type==='payment_intent.succeeded'){
   const pi=event.data.object as Stripe.PaymentIntent;
   if(pi.metadata?.kind!=='booking_authorization'||!pi.metadata.booking_id)return new Response('OK');
   const {data:booking,error}=await admin.from('bookings')
    .select('id,status,amount_cents,client_id,service_id,payment_status,stripe_payment_intent_id,stripe_decision')
    .eq('id',pi.metadata.booking_id).maybeSingle();
   if(error)throw error;
   if(!booking||booking.stripe_payment_intent_id!==pi.id||booking.amount_cents!==pi.amount_received
      ||pi.currency!=='eur')throw new Error('Capture non riconciliabile');
   if(booking.status==='confirmed'&&booking.payment_status==='paid')return new Response('OK');
   if(booking.status!=='processing'||booking.stripe_decision!=='approve')
    throw new Error('Capture senza approvazione: riconciliazione richiesta');
   const {error:completeError}=await admin.rpc('complete_booking_decision',{
    p_booking_id:booking.id,p_action:'approve',p_intent_id:pi.id
   });
   if(completeError)throw completeError;
   return new Response('Captured and confirmed');
  }

  if(event.type==='payment_intent.canceled'){
   const pi=event.data.object as Stripe.PaymentIntent;
   if(pi.metadata?.kind!=='booking_authorization'||!pi.metadata.booking_id)return new Response('OK');
   const {data:booking,error}=await admin.from('bookings')
    .select('id,status,payment_status,stripe_payment_intent_id,stripe_decision,client_id')
    .eq('id',pi.metadata.booking_id).maybeSingle();
   if(error)throw error;
   if(!booking)return new Response('OK');
   if(booking.status==='processing'&&['reject','cancel'].includes(booking.stripe_decision)){
    const {error:completeError}=await admin.rpc('complete_booking_decision',{
     p_booking_id:booking.id,p_action:booking.stripe_decision,
     p_intent_id:booking.stripe_payment_intent_id
    });
    if(completeError)throw completeError;
   }else if(['pending','authorizing','processing'].includes(booking.status)&&booking.stripe_payment_intent_id===pi.id){
    const {data:expired,error:updateError}=await admin.from('bookings')
     .update({status:'expired',payment_status:'unpaid'})
     .eq('id',booking.id).in('status',['pending','authorizing','processing'])
     .eq('stripe_payment_intent_id',pi.id).select('id');
    if(updateError)throw updateError;
    if(expired?.length){
     const {error:noticeError}=await admin.from('notifications').insert({
      recipient_id:booking.client_id,title:'Autorizzazione annullata',
      body:'La richiesta non è più attiva. La preautorizzazione della carta è stata rilasciata senza incasso.',
      kind:'booking_expired',booking_id:booking.id
     });
     if(noticeError)console.error('Cancellation notice failed',noticeError);
    }
   }
   return new Response('Authorization canceled');
  }

  return new Response('OK');
 }catch(e){console.error('stripe-webhook',e);return new Response('Retry later',{status:500})}
});
