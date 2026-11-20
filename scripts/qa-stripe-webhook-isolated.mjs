// Executes the actual stripe-webhook Edge handler in a separate Deno process.
// ALL credentials and SQL endpoints below are synthetic and restricted to localhost.
// No customer database, Stripe account, or real payment is contacted.
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';

const host='127.0.0.1';
const edgePort=8000;
const signingSecret='whsec_alecoach_local_only_synthetic';
const key='sk_test_alecoach_local_only_not_a_real_stripe_key';
const pendingId='11111111-1111-4111-8111-111111111111';
const paidId='22222222-2222-4222-8222-222222222222';
const completedId='33333333-3333-4333-8333-333333333333';
const completedClient='44444444-4444-4444-8444-444444444444';
const completedSession='cs_test_fake_completed';
const db=new Map([
 [pendingId,{status:'pending',stripe_session_id:'cs_test_fake_pending'}],
 [paidId,{status:'paid',stripe_session_id:'cs_test_fake_paid'}],
 [completedId,{status:'pending',stripe_session_id:completedSession,client_id:completedClient,package_id:'five',amount_cents:25000}]
]);
const calls=[];
const wallets=new Map();
let settlements=0;
const mock=createServer(async(req,res)=>{
 try{
  const url=new URL(req.url||'/', 'http://'+host);
  if(req.method==='GET'&&url.pathname==='/rest/v1/package_checkout_orders'){
   const id=url.searchParams.get('id')?.replace(/^eq\./,'');
   calls.push({method:req.method,path:url.pathname});
   const item=db.get(id);
   res.writeHead(200,{'Content-Type':'application/json'});
   res.end(JSON.stringify(item?[{id,...item}]:[]));return;
  }
  if(req.method==='POST'&&url.pathname==='/rest/v1/rpc/settle_package_checkout_order'){
   let body='';for await(const chunk of req)body+=chunk.toString();
   const data=JSON.parse(body);
   calls.push({method:req.method,path:url.pathname});
   const item=db.get(data.p_order_id);
   assert.equal(data.p_order_id,completedId);
   assert.equal(data.p_session_id,completedSession);
   assert.ok(item,'Unknown synthetic order');
   settlements++;
   if(item.status==='pending'&&item.stripe_session_id===data.p_session_id){
    item.status='paid';wallets.set(item.stripe_session_id,(wallets.get(item.stripe_session_id)||0)+1);
   }
   res.writeHead(204);res.end();return;
  }
  if(req.method!=='PATCH'||url.pathname!=='/rest/v1/package_checkout_orders'){
   res.writeHead(500,{'Content-Type':'application/json'});
   res.end(JSON.stringify({message:'Unexpected mock request'})); return;
  }
  const q=Object.fromEntries(url.searchParams);
  calls.push({method:req.method,path:url.pathname,query:q});
  const id=q.id?.replace(/^eq\./,'');
  const sid=q.stripe_session_id?.replace(/^eq\./,'');
  const expectedStatus=q.status?.replace(/^eq\./,'');
  assert.equal(expectedStatus,'pending','Every update must be constrained to pending orders');
  const row=db.get(id);
  if(row?.status==='pending'&&row.stripe_session_id===sid)row.status='expired';
  res.writeHead(204);
  res.end();
 }catch(error){
  res.writeHead(500,{'Content-Type':'application/json'});
  res.end(JSON.stringify({message:'Mock assertion failed: '+error.message}));
 }
});
async function listen(server){
 await new Promise((resolve,reject)=>{
  server.once('error',reject);
  server.listen(0,host,resolve);
 });
 return server.address().port;
}
async function delay(ms){return new Promise(resolve=>setTimeout(resolve,ms))}
function signedHeader(payload,secret=signingSecret){
 const t=Math.floor(Date.now()/1000);
 return 't='+t+',v1='+createHmac('sha256',secret).update(t+'.'+payload).digest('hex');
}
function makeEvent({id,sessionId,orderId,livemode=false}){
 return JSON.stringify({
  id,object:'event',api_version:'2026-09-30.preview',created:Math.floor(Date.now()/1000),
  livemode,pending_webhooks:1,type:'checkout.session.expired',
  data:{object:{
   id:sessionId,object:'checkout.session',livemode,metadata:{
    kind:'package',order_id:orderId
   }
  }}
 });
}
function makeCompletedEvent(){
 return JSON.stringify({
  id:'evt_fake_completed',object:'event',api_version:'2026-09-30.preview',
  created:Math.floor(Date.now()/1000),livemode:false,pending_webhooks:1,
  type:'checkout.session.completed',
  data:{object:{
   id:completedSession,object:'checkout.session',livemode:false,
   payment_status:'paid',amount_total:25000,currency:'eur',
   payment_intent:'pi_test_fake_completed',
   metadata:{kind:'package',order_id:completedId,client_id:completedClient,package_id:'five'}
  }}
 });
}
async function post(payload,signature=signedHeader(payload)){
 const response=await fetch('http://'+host+':'+edgePort+'/',{
  method:'POST',redirect:'error',signal:AbortSignal.timeout(12000),
  headers:{'Content-Type':'application/json','stripe-signature':signature},
  body:payload
 });
 return {status:response.status,body:await response.text()};
}
function pass(label){console.log('PASS: '+label)}
let child,childOutput='';
try{
 const mockPort=await listen(mock);
 // A completely synthetic environment, even when the parent CI runner contains secrets.
 const env={
  PATH:process.env.PATH||'',HOME:process.env.HOME||'',DENO_DIR:process.env.DENO_DIR||'',
  STRIPE_SECRET_KEY:key,STRIPE_WEBHOOK_SECRET:signingSecret,
  STRIPE_ENVIRONMENT:'test',STRIPE_PAYMENTS_ENABLED:'true',
  STRIPE_LIVE_APPROVED:'false',
  SUPABASE_URL:'http://'+host+':'+mockPort,
  SUPABASE_SERVICE_ROLE_KEY:'local_mock_service_role_not_a_secret'
 };
 child=spawn('deno',['run','--quiet','--allow-env','--allow-net',
  'supabase/functions/stripe-webhook/index.ts'],{
  cwd:process.cwd(),env,stdio:['ignore','pipe','pipe']
 });
 child.on('error',e=>{childOutput+='spawn error '+e.message});
 child.stdout.on('data',chunk=>{childOutput+=chunk.toString()});
 child.stderr.on('data',chunk=>{childOutput+=chunk.toString()});
 let ready=false;
 for(let tries=0;tries<80;tries++){
  if(child.exitCode!==null||child.signalCode)break;
  try{
   const probe=await fetch('http://'+host+':'+edgePort+'/',{signal:AbortSignal.timeout(900)});
   if(probe.status===405){ready=true;break}
  }catch{}
  await delay(250);
 }
 assert.ok(ready,'Local Edge handler did not start: '+childOutput.slice(-1200));
 pass('actual Deno stripe-webhook Edge handler started with fake environment');

 const pendingPayload=makeEvent({id:'evt_fake_one',sessionId:'cs_test_fake_pending',orderId:pendingId});
 const first=await post(pendingPayload);
 assert.equal(first.status,200,first.body);
 assert.equal(db.get(pendingId).status,'expired');
 pass('signed checkout.session.expired changes a matching pending package to expired');

 const beforeRepeat=calls.length;
 const repeated=await post(pendingPayload);
 assert.equal(repeated.status,200,repeated.body);
 assert.equal(db.get(pendingId).status,'expired');
 assert.equal(calls.length,beforeRepeat+1);
 pass('replay of the same signed Stripe event is idempotent');

 const paidPayload=makeEvent({id:'evt_fake_paid',sessionId:'cs_test_fake_paid',orderId:paidId});
 assert.equal((await post(paidPayload)).status,200);
 assert.equal(db.get(paidId).status,'paid');
 pass('an already-paid package remains paid after an expiry webhook');

 const mismatched=makeEvent({id:'evt_fake_mismatch',sessionId:'cs_test_wrong_session',orderId:paidId});
 assert.equal((await post(mismatched)).status,200);
 assert.equal(db.get(paidId).status,'paid');
 pass('session mismatch cannot modify the order');

 const completedPayload=makeCompletedEvent();
 const settled=await post(completedPayload);
 assert.equal(settled.status,200,settled.body);
 assert.equal(db.get(completedId).status,'paid');
 assert.equal(wallets.get(completedSession),1);
 assert.equal(settlements,1);
 pass('signed checkout.session.completed grants exactly one synthetic paid package wallet');

 const beforeCompletedRetry=calls.length;
 const duplicateCompleted=await post(completedPayload);
 assert.equal(duplicateCompleted.status,200,duplicateCompleted.body);
 assert.equal(wallets.get(completedSession),1);
 assert.equal(settlements,1);
 assert.equal(calls.length,beforeCompletedRetry+1,
  'replay may re-read paid order, never settle it twice');
 pass('identical signed checkout.session.completed replay grants no extra wallet');

 const prior=calls.length;
 const invalidSig=await post(pendingPayload,signedHeader(pendingPayload,'whsec_wrong_synthetic'));
 assert.equal(invalidSig.status,400,invalidSig.body);
 assert.equal(calls.length,prior);
 pass('invalid signature is rejected before any database operation');

 const tampered=makeEvent({id:'evt_fake_tampered',sessionId:'cs_test_fake_paid',orderId:paidId});
 const tamperedSig=signedHeader(tampered);
 const changed=tampered.replace('evt_fake_tampered','evt_fake_modified');
 assert.equal((await post(changed,tamperedSig)).status,400);
 assert.equal(calls.length,prior);
 pass('signed payload tampering is rejected before any database operation');

 const crossEnv=makeEvent({id:'evt_fake_live',sessionId:'cs_test_fake_paid',orderId:paidId,livemode:true});
 assert.equal((await post(crossEnv)).status,400);
 assert.equal(calls.length,prior);
 pass('a signed live-mode event is rejected in the test environment');

 const noSig=await post(pendingPayload,'');
 assert.equal(noSig.status,503);
 assert.equal(calls.length,prior);
 pass('missing Stripe signature cannot reach the database');

 assert.equal(db.get(paidId).status,'paid');
 assert.equal(db.get(pendingId).status,'expired');
 assert.equal(db.get(completedId).status,'paid');
 assert.equal(wallets.get(completedSession),1);
 console.log('All signed-webhook integration checks PASSED using fake orders and local HTTP only.');
}catch(error){
 console.error('FAILED:',error.stack||String(error));
 if(childOutput)console.error('Deno output:',childOutput.slice(-1500));
 process.exitCode=1;
}finally{
 if(child && child.exitCode===null)child.kill('SIGTERM');
 await new Promise(resolve=>mock.close(resolve));
}
