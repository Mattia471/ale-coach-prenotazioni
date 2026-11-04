import Stripe from 'npm:stripe@22.0.0';
import { createClient } from 'npm:@supabase/supabase-js@2.76.0';

const appUrl=Deno.env.get('PUBLIC_APP_URL')||'';
const cors={ 'Access-Control-Allow-Origin': appUrl||'null', 'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods':'POST, OPTIONS' };
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,'Content-Type':'application/json'}});
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 if(req.method!=='POST')return json({error:'Metodo non consentito'},405);
 try{
  const secret=Deno.env.get('STRIPE_SECRET_KEY');
  const paymentsEnabled=Deno.env.get('STRIPE_PAYMENTS_ENABLED')==='true';
  const stripeEnvironment=Deno.env.get('STRIPE_ENVIRONMENT')||'test';
  const testMode=stripeEnvironment==='test'&&!!secret?.startsWith('sk_test_');
  const liveMode=stripeEnvironment==='live'&&Deno.env.get('STRIPE_LIVE_APPROVED')==='true'&&!!secret?.startsWith('sk_live_');
  if(!paymentsEnabled||(!testMode&&!liveMode))
   return json({error:'Pagamenti non attivi: attesa configurazione Stripe e collaudo.'},503);
  const url=Deno.env.get('SUPABASE_URL')!;
  const anon=Deno.env.get('SUPABASE_ANON_KEY')!;
  const service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const token=req.headers.get('Authorization')?.replace(/^Bearer\s+/i,'');
  if(!token)return json({error:'Effettua l’accesso'},401);
  const auth=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user},error:authError}=await auth.auth.getUser(token);
  if(authError||!user)return json({error:'Sessione non valida'},401);
  const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
  const body=await req.json();
  const stripe=new Stripe(secret);
  if(body.packageId){
   const packageId=String(body.packageId);
   if(!appUrl.startsWith('https://'))return json({error:'URL app non configurato'},503);
   const {data:order,error:orderError}=await admin.rpc('begin_package_checkout',{p_client_id:user.id,p_package_id:packageId});
   if(orderError||!order)return json({error:'Pacchetto non disponibile o checkout temporaneamente non disponibile'},409);
   if(order.stripe_session_id){
    const previous=await stripe.checkout.sessions.retrieve(order.stripe_session_id);
    if(previous.status==='open'&&previous.url)return json({url:previous.url});
    if(previous.payment_status==='paid')return json({error:'Pagamento già ricevuto, attendi la conferma del pacchetto'},409);
    if(previous.status!=='expired')return json({error:'Checkout precedente ancora in elaborazione'},409);
    const {error:expireError}=await admin.rpc('expire_package_checkout_order',{p_order_id:order.id});
    if(expireError)throw expireError;
    const retried=await admin.rpc('begin_package_checkout',{p_client_id:user.id,p_package_id:packageId});
    if(retried.error||!retried.data)return json({error:'Impossibile riavviare il checkout'},409);
    return await createPackageSession(retried.data);
   }
   return await createPackageSession(order);
  }
  async function createPackageSession(order:{id:string;package_id:string;amount_cents:number;expires_at:string;client_id:string}) {
   const {data:pack}=await admin.from('packages').select('name').eq('id',order.package_id).single();
   const session=await stripe.checkout.sessions.create({
    mode:'payment',payment_method_types:['card'],customer_email:user.email,
    line_items:[{price_data:{currency:'eur',unit_amount:order.amount_cents,product_data:{name:`Ale Coach · ${pack?.name||'Pacchetto lezioni'}`}},quantity:1}],
    client_reference_id:order.id,
    metadata:{kind:'package',order_id:order.id,client_id:user.id,package_id:order.package_id},
    success_url:`${appUrl}/?payment=success`,cancel_url:`${appUrl}/?payment=cancelled`,
    expires_at:Math.floor(Date.now()/1000)+31*60
   },{idempotencyKey:`ale-package-order-${order.id}`});
   const {data:saved,error:saveError}=await admin.from('package_checkout_orders')
    .update({stripe_session_id:session.id}).eq('id',order.id).eq('status','pending')
    .is('stripe_session_id',null).select('id').maybeSingle();
   if(saveError)throw saveError;
   if(!saved) {
    const {data:current}=await admin.from('package_checkout_orders').select('stripe_session_id').eq('id',order.id).single();
    if(current?.stripe_session_id!==session.id)throw new Error('Ordine modificato durante il checkout');
   }
   return json({url:session.url});
  }
  const bookingId=String(body.bookingId||'');
  if(!/^[a-f0-9-]{36}$/i.test(bookingId))return json({error:'Prenotazione non valida'},400);
  const {data:booking,error}=await admin.from('bookings').select('id,client_id,service_id,status,payment_mode,amount_cents,approved_at,expires_at,stripe_checkout_session_id').eq('id',bookingId).single();
  if(error||!booking||booking.client_id!==user.id)return json({error:'Prenotazione non trovata'},404);
  if(!['awaiting_payment','quoted'].includes(booking.status)||booking.payment_mode!=='online'&&booking.status!=='quoted')return json({error:'Pagamento non disponibile'},409);
  if(!booking.expires_at||Date.parse(booking.expires_at)-Date.now()<32*60000)return json({error:'Tempo insufficiente per aprire il checkout. Contatta Ale per una nuova conferma.'},409);
  if(!Number.isInteger(booking.amount_cents)||booking.amount_cents<50)return json({error:'Importo non valido'},409);
  if(!appUrl.startsWith('https://'))return json({error:'URL pubblico dell’app non configurato'},503);
  if(booking.stripe_checkout_session_id){
   const previous=await stripe.checkout.sessions.retrieve(booking.stripe_checkout_session_id);
   if(previous.status==='open'&&previous.url)return json({url:previous.url});
   if(previous.payment_status==='paid')return json({error:'Pagamento già completato'},409);
   if(previous.status!=='expired')return json({error:'Checkout precedente in elaborazione'},409);
  }
  const {data:serviceData}=await admin.from('services').select('name').eq('id',booking.service_id).single();
  const session=await stripe.checkout.sessions.create({
   mode:'payment',payment_method_types:['card'],customer_email:user.email,
   line_items:[{price_data:{currency:'eur',unit_amount:booking.amount_cents,product_data:{name:`Ale Coach · ${serviceData?.name||'Allenamento'}`}},quantity:1}],
   metadata:{booking_id:booking.id,client_id:user.id,kind:'booking'},
   client_reference_id:booking.id,
   success_url:`${appUrl}/?payment=success`,cancel_url:`${appUrl}/?payment=cancelled`,
   expires_at:Math.floor(Date.now()/1000)+31*60
  },{idempotencyKey:`ale-booking-${booking.id}-${booking.amount_cents}-${booking.stripe_checkout_session_id||'first'}`});
  const {error:saveError}=await admin.from('bookings').update({stripe_checkout_session_id:session.id}).eq('id',booking.id).in('status',['awaiting_payment','quoted']);
  if(saveError)throw saveError;
  return json({url:session.url});
 }catch(e){console.error('create-checkout',e);return json({error:'Checkout temporaneamente non disponibile'},500)}
});
