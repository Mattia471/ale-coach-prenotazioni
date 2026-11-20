// Stripe refunds must target only the captured PaymentIntent belonging to
// the authenticated booking. Keep this check pure so it can be regression-tested.
export type RefundBooking={
 id:string;
 client_id:string;
 amount_cents:number;
 stripe_payment_intent_id:string;
};
export type RefundPaymentIntent={
 id:string;
 amount:number;
 amount_received:number;
 currency:string;
 status:string;
 metadata:Record<string,string>|null;
};
export function isRefundIntentForBooking(
 intent:RefundPaymentIntent,booking:RefundBooking
):boolean{
 return intent.id===booking.stripe_payment_intent_id
  && intent.metadata?.kind==='booking_authorization'
  && intent.metadata.booking_id===booking.id
  && intent.metadata.client_id===booking.client_id
  && intent.currency==='eur'
  && intent.amount===booking.amount_cents
  && intent.amount_received===booking.amount_cents
  && booking.amount_cents>0
  && intent.status==='succeeded';
}
