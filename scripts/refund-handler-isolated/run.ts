// Executes the ACTUAL cancel-booking Edge handler with local-only fake Stripe
// and fake Supabase modules selected by import_map.json. No real keys, accounts,
// hosted URLs, checkout sessions, bookings, or database writes are possible.
import assert from 'node:assert/strict';
import {reset,state} from './state.ts';

const port=8000;
const origin='https://alecoach.online';
const base='http://127.0.0.1:'+port+'/';
const delay=(ms:number)=>new Promise<void>(resolve=>setTimeout(resolve,ms));

async function post(
 token='qa-valid-client',
 from=origin
):Promise<{status:number;body:Record<string,unknown>}>{
 const res=await fetch(base,{
  method:'POST',redirect:'error',signal:AbortSignal.timeout(10000),
  headers:{
   'Authorization':'Bearer '+token,
   'Origin':from,
   'Content-Type':'application/json'
  },
  body:JSON.stringify({bookingId:state.bookingId})
 });
 return {status:res.status,body:await res.json()};
}
function mustUnchanged(label:string){
 assert.equal(state.refundsCreated,0,label+' must not refund');
 assert.equal(state.refundCalls,0,label+' must not invoke Stripe Refunds API');
 assert.equal(state.updates,0,label+' must not update booking');
 assert.equal(state.notifications,0,label+' must not notify');
 assert.equal(state.booking.status,'confirmed',label+' must keep booking confirmed');
}
function pass(label:string){console.log('PASS: '+label);}

try{
 // Importing the production handler starts Deno.serve, but its two external
 // modules are remapped ONLY for this test. Production imports are unmodified.
 await import('../../supabase/functions/cancel-booking/index.ts');
 let ready=false;
 for(let i=0;i<60;i++){
  try{
   const res=await fetch(base,{method:'GET',signal:AbortSignal.timeout(500)});
   if(res.status===405){ready=true;break;}
  }catch{/* Deno.serve still initializing */}
  await delay(100);
 }
 assert.ok(ready,'Local mock Edge handler never became ready');
 pass('production cancellation handler started with local import-map mocks');

 reset();
 let result=await post();
 assert.equal(result.status,200,JSON.stringify(result.body));
 assert.equal(result.body.ok,true);
 assert.equal(state.refundCalls,1);
 assert.equal(state.refundsCreated,1);
 assert.equal(state.refundKeys.size,1);
 assert.equal(state.booking.status,'cancelled');
 assert.equal(state.booking.payment_status,'refunded');
 assert.equal(state.updates,1);
 assert.equal(state.notifications,1);
 pass('captured matching payment refunded and booking cancelled exactly once');

 result=await post();
 assert.equal(result.status,409);
 assert.equal(state.refundsCreated,1);
 assert.equal(state.refundCalls,1);
 assert.equal(state.notifications,1);
 pass('repeated cancellation does not trigger a second Stripe refund');

 reset();
 result=await post('qa-other-client');
 assert.equal(result.status,404);
 mustUnchanged('foreign client');
 pass('other client cannot request a refund for a foreign booking');

 reset();
 result=await post('invalid-token');
 assert.equal(result.status,401);
 mustUnchanged('invalid JWT');
 pass('invalid JWT fails before any payment or database operation');

 reset();
 result=await post('qa-valid-client','https://attacker.invalid');
 assert.equal(result.status,403);
 mustUnchanged('untrusted browser origin');
 pass('untrusted browser origin receives HTTP 403');

 reset();
 state.booking.starts_at=new Date(Date.now()+23*3600000).toISOString();
 result=await post();
 assert.equal(result.status,409);
 mustUnchanged('less than 24h cancellation');
 pass('self-service 24-hour cancellation cutoff enforced');

 reset();
 (state.intent.metadata as Record<string,string>).client_id='44444444-4444-4444-8444-444444444444';
 result=await post();
 assert.equal(result.status,409);
 mustUnchanged('wrong Stripe customer');
 assert.equal(state.retrievals,1);
 pass('refund blocked for foreign Stripe customer metadata');

 reset();
 (state.intent.metadata as Record<string,string>).booking_id='44444444-4444-4444-8444-444444444444';
 result=await post();
 assert.equal(result.status,409);
 mustUnchanged('wrong Stripe booking');
 pass('refund blocked for foreign Stripe booking metadata');

 reset();
 state.intent.amount_received=2000;
 result=await post();
 assert.equal(result.status,409);
 mustUnchanged('not fully captured');
 pass('refund blocked for partially captured amount');

 reset();
 state.intent.status='requires_capture';
 state.intent.amount_received=0;
 result=await post();
 assert.equal(result.status,409);
 mustUnchanged('uncaptured authorization');
 pass('refund blocked for uncaptured Stripe authorization');

 reset();
 state.failStripeOnce=true;
 result=await post();
 assert.equal(result.status,500);
 mustUnchanged('Stripe transient error');
 assert.equal(state.refundCalls,1);
 pass('Stripe failure does not mark booking refunded or notify');

 reset();
 state.failDbUpdateOnce=true;
 result=await post();
 assert.equal(result.status,500);
 assert.equal(state.refundCalls,1);
 assert.equal(state.refundsCreated,1);
 assert.equal(state.booking.status,'confirmed');
 assert.equal(state.notifications,0);
 result=await post();
 assert.equal(result.status,200);
 assert.equal(state.refundCalls,2);
 assert.equal(state.refundsCreated,1);
 assert.equal(state.refundKeys.size,1);
 assert.equal(state.booking.status,'cancelled');
 assert.equal(state.booking.payment_status,'refunded');
 assert.equal(state.updates,1);
 assert.equal(state.notifications,1);
 pass('retry after DB failure reuses idempotency key and avoids duplicate refund');

 console.log('All isolated production refund handler checks PASSED. Stripe and Supabase were fake modules only.');
 Deno.exit(0);
}catch(error){
 console.error('FAILED:',error instanceof Error?error.stack:String(error));
 Deno.exit(1);
}
