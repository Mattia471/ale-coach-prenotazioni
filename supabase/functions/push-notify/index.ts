import webpush from 'npm:web-push@3.6.7';
import { createClient } from 'npm:@supabase/supabase-js@2';

// Invocazione solo da trigger pg_net autenticato con un token in Supabase Vault.
// Le tre chiavi non vengono mai esposte al browser o incluse nel repository.
Deno.serve(async req=>{
 if(req.method!=='POST')return new Response('Method not allowed',{status:405});
 try{
  const admin=createClient(Deno.env.get('SUPABASE_URL')!,
   Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
   {auth:{persistSession:false,autoRefreshToken:false}});
  const {data:config,error:configError}=await admin.rpc('get_push_vapid_config');
  if(configError||!config?.privateKey||!config?.publicKey||!config?.webhookSecret){
   console.error('Push config unavailable');
   return new Response('Push not configured',{status:503});
  }
  if(req.headers.get('x-ale-push-secret')!==config.webhookSecret)
   return new Response('Unauthorized',{status:401});
  const payload=await req.json().catch(()=>null);
  const record=payload?.record;
  if(payload?.type!=='INSERT'||payload?.table!=='notifications'||
     !/^[a-f0-9-]{36}$/i.test(String(record?.recipient_id||'')))
   return new Response('Ignored',{status:200});

  webpush.setVapidDetails('mailto:info@alecoach.online',
   config.publicKey,config.privateKey);
  const {data:devices,error}=await admin.from('push_subscriptions')
   .select('id,endpoint,p256dh,auth_key').eq('user_id',record.recipient_id);
  if(error)throw error;
  let sent=0,failed=0;
  for(const d of devices||[]){
   try{
    await webpush.sendNotification({endpoint:d.endpoint,
      keys:{p256dh:d.p256dh,auth:d.auth_key}},
      JSON.stringify({
       title:String(record.title||'Ale Coach').slice(0,90),
       body:String(record.body||'Hai una notifica').slice(0,220),
       url:'/'
      }));
    sent++;
   }catch(e){
    const status=(e as {statusCode?:number}).statusCode;
    if(status===404||status===410)
     await admin.from('push_subscriptions').delete().eq('id',d.id);
    else{failed++;console.error('Push delivery failed',status||'network');}
   }
  }
  return Response.json({sent,failed});
 }catch(e){
  console.error('Push delivery error',e instanceof Error?e.message:'unknown');
  return new Response('Push delivery failed',{status:500});
 }
});
