import Stripe from 'npm:stripe@22.0.0';
import { createClient } from 'npm:@supabase/supabase-js@2.76.0';
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
