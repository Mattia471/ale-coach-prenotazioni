import Stripe from 'npm:stripe@22.0.0';
import { createClient } from 'npm:@supabase/supabase-js@2.76.0';

const appUrl=Deno.env.get('PUBLIC_APP_URL')||'';
const cors={ 'Access-Control-Allow-Origin': appUrl||'null', 'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods':'POST, OPTIONS' };
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,'Content-Type':'application/json'}});
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 if(req.method!=='POST')return json({error:'Metodo non consentito'},405);
 try{
  const secret=Deno.env.get('STRIPE_SECRET_KEY');
  if(!secret)return json({error:'Pagamenti non ancora attivi. Il coach deve collegare Stripe.'},503);
  const url=Deno.env.get('SUPABASE_URL')!;
  const anon=Deno.env.get('SUPABASE_ANON_KEY')!;
  const service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const token=req.headers.get('Authorization')?.replace(/^Bearer\s+/i,'');
  if(!token)return json({error:'Effettua lâ€™accesso'},401);
  const auth=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user},error:authError}=await auth.auth.getUser(token);
  if(authError||!user)return json({error:'Sessione non valida'},401);
  const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
  const body=await req.json();
  const stripe=new Stripe(secret);
  if(body.pa¶»§q«^