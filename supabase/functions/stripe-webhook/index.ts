import Stripe from 'npm:stripe@22.0.0';
import { createClient } from 'npm:@supabase/supabase-js@2.76.0';
// Il webhook NON usa l'autenticazione Supabase. Firma Stripe verificata sui byte grezzi.
Deno.serve(async req=>{
 if(req.method!=='POST')return new Response('Method not allowed',{status:405});
 const secret=Deno.env.get('STRIPE_SECRET_KEY');
 const signing=Deno.env.get('STRIPE_WEBHOOK_SECRET');
 const signature=req.headers.get('stripe-signature');
 if(!secret||!signing||!signature)return new Response('Missing configuration',{status:503});
 const stripe=new Stripe(secret);
 let event:Stripe.Event;
 try{event=await stripe.webhooks.constructEventAsync(await req.text(),signature,signing,undefined,Stripe.createSubtleCryptoProvider())}
 catch(e){console.error('Invalid Stripe signature',e);return new Response('Invalid signature',{status:400})}
 const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
 try{
  if(event.type==='checkout.session.completed'){
   const session=event.data.object as Stripe.Checkout.Session;
   if(session.payment_status!=='paid')return new Response('OK');
   if(session.metadata?.kind==='package'&&session.metadata.client_id&&session.metadata.package_id){
    const {data:pack}=await admin.from('packages').select('*').eq('id',session.metadata.package_id).single();
    if(!pack||pack.type!=='pack'||session.amount_total!==pack.price_cents||session.currency!=='eur')return new Response('Invalid package payment',{status:409});
    const {data:existing}=await admin.from('wallet_credits').select('id').eq('stripe_session_id',session.id).maybeSingle();
    if(!existing){
     const expires=new Date(Date.now()+pack.validity_days*86400000).toISOString();
     const {error:creditError}=await admin.from('wallet_credits').insert({client_id:session.metadata.client_id,package_id:pack.id,remaining:pack.credits,expires_at:expires,stripe_session_id:session.id});
     if(creditError&&creditError.code!=='23505')throw creditError;
     await admin.from('notifications').insert({recipient_id:session.metadata.client_id,title:'Pacchetto attivo',body:`${pack.name}: ${pack.credits} lezioni disponibili.`,kind:'package_paid'});
    }
    return new Response('OK');
   }
   if(session.metadata?.kind!=='booking'||!session.metadata.booking_id)return new Response('OK');
   const {data:booking,error}=await admin.from('bookings').select('id,client_id,status,payment_status,stripe_checkout_session_id,amount_cents').eq('id',session.metadata.booking_id).single();
   if(error||!booking||booking.stripe_checkout_session_id!==session.id)return new Response('No matching booking',{status:409});
   if(session.amount_total!==booking.amount_cents||session.currency!=='eur')return new Response('Wrong amount',{status:409});
   if(booking.payment_status==='paid')return new Response('OK');
   const pi=typeof session.payment_intent==='string'?session.payment_intent:session.payment_intent?.id||null;
   if(!['awaiting_payment','quoted'].includes(booking.status)){
    // Cliente pagato su una richiesta ormai scaduta/rifiutata: non trattenerne il denaro.
    if(pi)await stripe.refunds.create({payment_intent:pi,reason:'requested_by_customer'},{idempotencyKey:`ale-expired-${booking.id}`});
    return new Response('Refund initiated');
   }
   // Il pagamento è già stato incassato da Stripe. In caso di errore DB restituiamo 500, così Stripe riprova.
   const {data:updated,error:updateError}=await admin.from('bookings').update({status:'confirmed',payment_status:'paid',stripe_payment_intent_id:pi,paid_at:new Date().toISOString()}).eq('id',booking.id).in('status',['awaiting_payment','quoted']).select('id');
   if(updateError)throw updateError;
   if(!updated?.length){
     const {data:current}=await admin.from('bookings').select('payment_status').eq('id',booking.id).single();
     if(current?.payment_status==='paid')return new Response('OK');
     if(pi)await stripe.refunds.create({payment_intent:pi,reason:'requested_by_customer'},{idempotencyKey:`ale-race-${booking.id}`});
     return new Response('Refund initiated');
   }
   const {error:noticeError}=await admin.from('notifications').insert({recipient_id:booking.client_id,title:'Pagamento confermato',body:`Pagamento di ${(booking.amount_cents/100).toFixed(2)} € ricevuto. La tua lezione è confermata.`,kind:'payment_received',booking_id:booking.id});
   if(noticeError)console.error('Notification insert',noticeError);
  }
  return new Response('OK',{status:200});
 }catch(e){console.error('stripe-webhook',e);return new Response('Retry later',{status:500})}
});
