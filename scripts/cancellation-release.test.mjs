import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=(path)=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const sql=read('supabase/migrations/20261110113000_paid_booking_partial_refunds.sql');
const fn=read('supabase/functions/cancel-booking/index.ts');
const webhook=read('supabase/functions/stripe-webhook/index.ts');
const app=read('src/App.tsx');
const terms=read('src/LegalPage.tsx');

// The amount is derived server-side from the actual paid amount, in integer cents.
const quote=(paidCents,msRemaining)=>msRemaining>=24*3600000?paidCents:Math.ceil(paidCents/2);
test('100% refund for 24h or more, 50% in final 24h rounded in client favour',()=>{
 assert.equal(quote(4675,24*3600000+1),4675);
 assert.equal(quote(4675,24*3600000),4675);
 assert.equal(quote(4675,24*3600000-1),2338);
 assert.equal(quote(5500,23*3600000),2750);
 assert.equal(quote(1,1000),1);
 assert.equal(quote(555,3600000),278);
 assert.match(sql,/b\.starts_at - now\(\) >= interval '24 hours'/);
 assert.match(sql,/else \(b\.amount_cents \+ 1\) \/ 2/);
 assert.match(app,/Math\.ceil\(b\.amount_cents\/2\)/);
});
test('Refund release is off by default until reviewed and configured',()=>{
 assert.match(fn,/Deno\.env\.get\('CANCELLATION_POLICY_V2_ENABLED'\)==='true'/);
 assert.match(app,/VITE_CANCELLATION_POLICY_V2_ENABLED==='true'/);
 assert.match(terms,/VITE_CANCELLATION_POLICY_V2_ENABLED==='true'/);
});
test('A claim locks booking and freezes the refund amount; only server finalises',()=>{
 assert.match(sql,/where id=p_booking_id for update/);
 assert.match(sql,/if b\.cancellation_refund_cents is not null then/);
 assert.match(sql,/b\.client_id is distinct from p_client_id/);
 assert.match(sql,/revoke all on function public\.claim_paid_booking_refund\(uuid,uuid\) from public,anon,authenticated/);
 assert.match(sql,/grant execute on function public\.claim_paid_booking_refund\(uuid,uuid\) to service_role/);
 assert.match(fn,/await admin\.rpc\('claim_paid_booking_refund'/);
 assert.doesNotMatch(fn,/await userDb\.rpc\('claim_paid_booking_refund'/);
 assert.match(sql,/revoke all on function public\.complete_paid_booking_refund\(uuid,text,integer,text\) from public,anon,authenticated/);
 assert.match(sql,/grant execute on function public\.complete_paid_booking_refund\(uuid,text,integer,text\) to service_role/);
 assert.match(fn,/claim_paid_booking_refund/);
 assert.match(fn,/complete_paid_booking_refund/);
});
test('Stripe refund has stable key, checks prior refund and stores exact result',()=>{
 assert.match(fn,/stripe\.refunds\.list\(\{payment_intent:b\.stripe_payment_intent_id,limit:100\}\)/);
 assert.match(fn,/idempotencyKey:`ale-cancel-v2-\$\{b\.id\}`/);
 assert.match(fn,/policy:'cancel-v2'/);
 assert.match(fn,/refund\.status!=='succeeded'&&refund\.status!=='pending'/);
 assert.match(fn,/p_refund_status:refund\.status/);
});
test('Signed webhook events reconcile refund outcomes without double updates',()=>{
 assert.match(webhook,/constructEventAsync/);
 assert.match(webhook,/refund\.created','refund\.updated','refund\.failed'/);
 assert.match(webhook,/reconcile_paid_booking_refund/);
 assert.match(sql,/if b\.stripe_refund_status=p_refund_status then return false/);
 assert.match(sql,/if b\.stripe_refund_status='succeeded' then return false/);
 assert.match(sql,/payment_status=case when p_refund_status='succeeded'/);
});
