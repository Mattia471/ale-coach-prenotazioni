// Test-only state, loaded solely by the Deno import-map mocks. No real accounts.
export const state = {
 clientId: '22222222-2222-4222-8222-222222222222',
 coachId: '55555555-5555-4555-8555-555555555555',
 bookingId: '11111111-1111-4111-8111-111111111111',
 booking: {} as Record<string,unknown>,
 intent: {} as Record<string,unknown>,
 refundCalls: 0,
 refundsCreated: 0,
 refundedCents: 0,
 refundKeys: new Set<string>(),
 retrievals: 0,
 updates: 0,
 notifications: 0,
 failStripeOnce: false,
 failDbUpdateOnce: false
};
export function reset() {
 state.booking = {
  id:state.bookingId,client_id:state.clientId,status:'confirmed',
  payment_status:'paid',payment_mode:'online',
  stripe_payment_intent_id:'pi_test_fake_refundable',
  starts_at:new Date(Date.now()+5*24*3600000).toISOString(),
  amount_cents:5500
 };
 state.intent = {
  id:'pi_test_fake_refundable',status:'succeeded',amount:5500,
  amount_received:5500,currency:'eur',
  metadata:{kind:'booking_authorization',booking_id:state.bookingId,client_id:state.clientId}
 };
 state.refundCalls = 0;
 state.refundsCreated = 0;
 state.refundedCents = 0;
 state.refundKeys.clear();
 state.retrievals = 0;
 state.updates = 0;
 state.notifications = 0;
 state.failStripeOnce = false;
 state.failDbUpdateOnce = false;
}
reset();
