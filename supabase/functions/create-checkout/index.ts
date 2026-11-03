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
  if(!secret)return json({error:'Pagamenti non ancora attivi. Il coach deve collegare Stripe.'},503);
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
   const {data:profile}=await admin.from('profiles').select('virgin_member').eq('id',user.id).single();
   if(!profile?.virgin_member)return json({error:'Per acquistare devi essere iscritto a Virgin Active'},403);
   const {data:pack}=await admin.from('packages').select('*').eq('id',String(body.packageId)).eq('active',true).single();
   if(!pack)return json({error:'Pacchetto non disponibile'},404);
   if(pack.type==='subscription')return json({error:'Gli abbonamenti ricorrenti non sono ancora attivati su Stripe.'},503);
   if(!appUrl.startsWith('https://'))return json({error:'URL app non configurato'},503);
   const session=await stripe.checkout.sessions.create({mode:'payment',payment_method_types:['card'],customer_email:user.email,
    line_items:[{price_data:{currency:'eur',unit_amount:pack.price_cents,product_data:{name:`Ale Coach · ${pack.name}`}},quantity:1}],
    metadata:{client_id:user.id,kind:'package',package_id:pack.id},
    success_url:`${appUrl}/?payment=success`,cancel_url:`${appUrl}/?payment=cancelled`
   });
   return json({url:session.url});
  }
  const bookingId=String(body.bookingId||'');
  if(!/^[a-f0-9-]{36}$/i.test(bookingId))return json({error:'Prenotazione non valida'},400);
  const {data:booking,error}=await admin.from('bookings').select('id,client_id,service_id,status,payment_mode,amount_cents,approved_at,stripe_checkout_session_id').eq('id',bookingId).single();
  if(error||!booking||booking.client_id!==user.id)return json({error:'Prenotazione non trovata'},404);
  if(!['awaiting_payment','quoted'].includes(booking.status)||booking.payment_mode!=='online'&&booking.status!=='quoted')return json({error:'Pagamento non disponibile'},409);
  if(booking.status==='awaiting_payment'&&(!booking.approved_at||Date.now()-Date.parse(booking.approved_at)>60*60000))return json({error:'Il termine per iniziare il pagamento è scaduto. Contatta Ale.'},409);
  if(!Number.isInteger(booking.amount_cents)||booking.amount_cents<50)return json({error:'Importo non valido'},409);
  if(!appUrl.startsWith('https://'))return json({error:'URL pubblico dell’app non configurato'},503);
  if(booking.stripe_checkout_session_id){
   const previous=await stripe.checkout.sessions.retrieve(booking.stripe_checkout_session_id);
   if(previous.status==='open'&&previous.url)return json({url:previous.url});
   if(previous.payment_status==='paid')return json({error:'Pagamento già completato'},409);
  }
  const {data:serviceData}=await admin.from('services').select('name').eq('id',booking.service_id).single();
  const session=await stripe.checkout.sessions.create({
   mode:'payment',payment_method_types:['card'],customer_email:user.email,
   line_items:[{price_data:{currency:'eur',unit_amount:booking.amount_cents,product_data:{name:`Ale Coach · ${serviceData?.name||'Allenamento'}`}},quantity:1}],
   metadata:{booking_id:booking.id,client_id:user.id,kind:'booking'},
   client_reference_id:booking.id,
   success_url:`${appUrl}/?payment=success`,cancel_url:`${appUrl}/?payment=cancelled`,
   expires_at:Math.floor(Date.now()/1000)+1800
  },{idempotencyKey:`ale-booking-${booking.id}-${booking.amount_cents}-${Math.floor(Date.now()/(30*60*1000))}`});
  const {error:saveError}=await admin.from('bookings').update({stripe_checkout_session_id:session.id}).eq('id',booking.id).in('status',['awaiting_payment','quoted']);
  if(saveError)throw saveError;
  return json({url:session.url});
 }catch(e){console.error('create-checkout',e);return json({error:'Checkout temporaneamente non disponibile'},500)}
});
