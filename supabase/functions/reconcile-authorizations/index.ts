import Stripe from 'npm:stripe@22.0.0';
import { createClient } from 'npm:@supabase/supabase-js@2';

// Supabase Cloud cron every five minutes. Never creates or captures a charge.
// It can release test authorizations even if new checkouts are disabled.
Deno.serve(async req=>{
 if(req.method!=='POST')return new Response('Method not allowed',{status:405});
 const admin=createClient(Deno.env.get('SUPABASE_URL')!,
   Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
   {auth:{persistSession:false,autoRefreshToken:false}});
 try{
  const {data:housekeepingSecret,error:tokenError}=await admin.rpc('get_stripe_housekeeping_token');
  if(tokenError||!housekeepingSecret)return new Response('Housekeeping unavailable',{status:503});
  if(req.headers.get('x-ale-housekeeping-secret')!==housekeepingSecret)
   return new Response('Unauthorized',{status:401});

  const key=Deno.env.get('STRIPE_SECRET_KEY');
  const environment=Deno.env.get('STRIPE_ENVIRONMENT')||'test';
  const valid=environment==='test'&&!!key?.startsWith('sk_test_')||
   environment==='live'&&Deno.env.get('STRIPE_LIVE_APPROVED')==='true'&&!!key?.startsWith('sk_live_');
  if(!valid)return new Response('Stripe credentials unavailable',{status:503});
  const stripe=new Stripe(key);
  const now=new Date().toISOString();
  let released=0,repaired=0,skipped=0,errors=0;

  const {data:expired,error:findError}=await admin.from('bookings')
   .select('id,status,payment_mode,payment_status,stripe_decision,amount_cents,stripe_payment_intent_id,expires_at')
   .in('status',['pending','processing']).eq('payment_mode','online')
   .eq('payment_status','authorized').lt('expires_at',now)
   .not('stripe_payment_intent_id','is',null).limit(50);
  if(findError)throw findError;

  for(const b of expired||[]){
   try{
    const pi=await stripe.paymentIntents.retrieve(b.stripe_payment_intent_id);
    if(pi.metadata?.kind!=='booking_authorization'||pi.metadata?.booking_id!==b.id
      ||pi.currency!=='eur'||pi.amount!==b.amount_cents){
     throw new Error('PaymentIntent does not match booking');
    }
    if(pi.status==='requires_capture'){
     // Releasing an authorization, never capturing or refunding funds.
     const canceled=await stripe.paymentIntents.cancel(pi.id,{},{
      idempotencyKey:`ale-24h-timeout-v1-${b.id}`
     });
     if(canceled.status!=='canceled')throw new Error('Stripe cancellation not confirmed');
    }else if(pi.status!=='canceled'){
     if(pi.status==='succeeded'&&b.status==='processing'&&b.stripe_decision==='approve'){
      const {error}=await admin.rpc('complete_booking_decision',{
       p_booking_id:b.id,p_action:'approve',p_intent_id:pi.id
      });
      if(error)throw error;
      repaired++;continue;
     }
     console.error('Stripe authorization in unexpected state; review required',b.id,pi.status);
     skipped++;continue;
    }
    const {data:result,error:expiryError}=await admin.rpc('expire_released_stripe_authorization',{
     p_booking_id:b.id,p_intent_id:pi.id
    });
    if(expiryError)throw expiryError;
    if(result)released++;else skipped++;
   }catch(e){errors++;console.error('Stripe authorization cleanup failed',b.id,e instanceof Error?e.message:'unknown');}
  }

  // Recover interrupted success paths: Stripe already captured/released funds,
  // but the app failed to persist the final state. Do not initiate a capture here.
  const {data:processing,error:processingError}=await admin.from('bookings')
   .select('id,status,stripe_decision,stripe_payment_intent_id,amount_cents')
   .eq('status','processing').not('stripe_payment_intent_id','is',null).limit(50);
  if(processingError)throw processingError;
  for(const b of processing||[]){
   try{
    if(!['approve','reject','cancel'].includes(b.stripe_decision||''))continue;
    const pi=await stripe.paymentIntents.retrieve(b.stripe_payment_intent_id);
    if(pi.metadata.kind!=='booking_authorization'||pi.metadata.booking_id!==b.id||
       pi.currency!=='eur'||pi.amount!==b.amount_cents)
     throw new Error('PaymentIntent metadata mismatch');
    if(pi.status==='succeeded'&&b.stripe_decision==='approve'){
     const {error}=await admin.rpc('complete_booking_decision',{
      p_booking_id:b.id,p_action:'approve',p_intent_id:pi.id
     });
     if(error)throw error;
     repaired++;
    }else if(pi.status==='canceled'&&['reject','cancel'].includes(b.stripe_decision)){
     const {error}=await admin.rpc('complete_booking_decision',{
      p_booking_id:b.id,p_action:b.stripe_decision,p_intent_id:pi.id
     });
     if(error)throw error;
     repaired++;
    }else{
     skipped++;
    }
   }catch(e){errors++;console.error('Stripe processing reconciliation failed',b.id,e instanceof Error?e.message:'unknown');}
  }

  return Response.json({ok:errors===0,released,repaired,skipped,errors},
   {status:errors>0?207:200});
 }catch(e){
  console.error('Stripe scheduled reconciliation failed',e instanceof Error?e.message:'unknown');
  return new Response('Reconciliation failed',{status:500});
 }
});
