import webpush from 'npm:web-push@3.6.7';
import { createClient } from 'npm:@supabase/supabase-js@2.76.0';
// Richiamabile solo da un webhook DB configurato con header x-ale-push-secret.
Deno.serve(async req=>{
 if(req.method!=='POST')return new Response('Method not allowed',{status:405});
 const secret=Deno.env.get('PUSH_WEBHOOK_SECRET');
 if(!secret||req.headers.get('x-ale-push-secret')!==secret)return new Response('Unauthorized',{status:401});
 const publicKey=Deno.env.get('VAPID_PUBLIC_KEY');const privateKey=Deno.env.get('VAPID_PRIVATE_KEY');
 if(!publicKey||!privateKey)return new Response('VAPID not configured',{status:503});
 const payload=await req.json();
 const record=payload.record;
 if(payload.type!=='INSERT'||payload.table!=='notifications'||!record?.recipient_id)return new Response('Ignored',{status:200});
 const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
 webpush.setVapidDetails('mailto:'+String(Deno.env.get('VAPID_CONTACT_EMAIL')||'support@example.com'),publicKey,privateKey);
 const {data:devices,error}=await admin.from('push_subscriptions').select('id,endpoint,p256dh,auth_key').eq('user_id',record.recipient_id);
 if(error)throw error;
 let sent=0;
 for(const d of devices||[]){
  try{await webpush.sendNotification({endpoint:d.endpoint,keys:{p256dh:d.p256dh,auth:d.auth_key}},JSON.stringify({title:String(record.title||'Ale Coach').slice(0,90),body:String(record¶»§q«^