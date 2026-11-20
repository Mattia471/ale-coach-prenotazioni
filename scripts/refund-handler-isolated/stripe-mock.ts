// Fake Stripe SDK used only when imported via the isolated test import map.
import {state} from './state.ts';
export default class Stripe {
 constructor(_key:string) {}
 paymentIntents = {
  retrieve: async (id:string) => {
   state.retrievals++;
   if (id !== state.intent.id) throw new Error('Unknown synthetic PaymentIntent');
   return structuredClone(state.intent);
  }
 };
 refunds = {
  create: async (
   params:{payment_intent:string;reason:string;amount:number},
   options:{idempotencyKey:string}
  ) => {
   state.refundCalls++;
   if(state.failStripeOnce){
    state.failStripeOnce=false;
    throw new Error('Synthetic Stripe transient failure');
   }
   if(params.payment_intent!==state.intent.id || !options.idempotencyKey)
    throw new Error('Fake Stripe rejected wrong intent or missing idempotency key');
   if(!state.refundKeys.has(options.idempotencyKey)){
    state.refundKeys.add(options.idempotencyKey);
    state.refundsCreated++;
    state.refundedCents+=params.amount;
   }
   return {id:'re_test_fake_once',status:'succeeded'};
  }
 };
}
