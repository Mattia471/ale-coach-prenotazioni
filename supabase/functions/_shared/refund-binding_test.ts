import {assert,assertEquals} from 'jsr:@std/assert@1';
import {isRefundIntentForBooking} from './refund-binding.ts';

const booking={
 id:'11111111-1111-4111-8111-111111111111',
 client_id:'22222222-2222-4222-8222-222222222222',
 amount_cents:5500,
 stripe_payment_intent_id:'pi_test_capture_correct'
};
const intent={
 id:'pi_test_capture_correct',amount:5500,amount_received:5500,
 currency:'eur',status:'succeeded',
 metadata:{kind:'booking_authorization',booking_id:booking.id,client_id:booking.client_id}
};
Deno.test('captured Stripe booking payment can be refunded only for its booking',()=>{
 assert(isRefundIntentForBooking(intent,booking));
});
for(const [label,override] of [
 ['wrong payment intent id',{id:'pi_test_other'}],
 ['wrong booking metadata',{metadata:{...intent.metadata,booking_id:'33333333-3333-4333-8333-333333333333'}}],
 ['wrong customer metadata',{metadata:{...intent.metadata,client_id:'44444444-4444-4444-8444-444444444444'}}],
 ['wrong payment type',{metadata:{...intent.metadata,kind:'package'}}],
 ['missing metadata',{metadata:null}],
 ['incorrect currency',{currency:'usd'}],
 ['wrong authorized amount',{amount:5600}],
 ['partially captured amount',{amount_received:5000}],
 ['uncaptured authorization',{status:'requires_capture',amount_received:0}],
 ['canceled charge',{status:'canceled',amount_received:0}],
 ['unpaid charge',{status:'requires_payment_method',amount_received:0}]
] as const){
 Deno.test('refund denies '+label,()=>{
  assertEquals(isRefundIntentForBooking({...intent,...override},booking),false);
 });
}
Deno.test('zero-priced booking cannot invoke refund',()=>{
 assertEquals(isRefundIntentForBooking({...intent,amount:0,amount_received:0},{...booking,amount_cents:0}),false);
});
Deno.test('booking must reference the retrieved intent',()=>{
 assertEquals(isRefundIntentForBooking(intent,{...booking,stripe_payment_intent_id:'pi_test_unrelated'}),false);
});
