import Stripe from 'npm:stripe@22.0.0';
import { createClient } from 'npm:@supabase/supabase-js@2.76.0';
const appUrl=Deno.env.get('PUBLIC_APP_URL')||'';
const cors={'Access-Control-Allow-Origin':appUrl||'null','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'};
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,'Content-Type':'application/json'}});
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 if(req.method!=='POST')return json({error:'Metodo non consentito'},405);
 const key=Deno.env.get('STRIPE_SECRET_KEY');if(!key)return json({error:'Stripe non configurato'},503);
 try{
  const auth=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_ANON_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
  const token=req.headers.get('Authorization')?.replace(/^Bearer\s+/i,'')||'';
  const {data:{user},error:authError}=await auth.auth.getUser(token);
  if(authError||!user)return json({error:'Sessione non valida'},401);
  const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
  const {bookingId}=await req.json();
  const {data:b,error}=await admin.from('bookings').select('*').eq('id',bookingId).single();
  if(error||!b||b.client_id!==user.id)return json({error:'Prenotazione non trovata'},404);
  ¶»§q«^