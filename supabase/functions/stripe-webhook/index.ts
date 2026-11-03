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
    if(!pack||pack.type!=='pack'||session.amount_total!==pack.price_cents||session.currency!=='eur')¶»§q«^