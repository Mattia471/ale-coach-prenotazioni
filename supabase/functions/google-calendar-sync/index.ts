import { createClient } from 'npm:@supabase/supabase-js@2.76.0';

/**
 * Sincronizzazione Google Calendar, sola lettura, con credenziali del coach.
 * Trigger mediante secret server-side (cron/operatore), MAI dal browser.
 * Usa full refresh delle occorrenze nei 43 giorni successivi: per v2 il watch
 * incrementale resta un'estensione separata. Nessuna scrittura su Google.
 *
 * Secrets necessari: GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET,
 * GOOGLE_OAUTH_REFRESH_TOKEN, GOOGLE_CALENDAR_IDS (CSV), GOOGLE_SYNC_SECRET.
 */
Deno.serve(async (req)=>{
 if(req.method!=='POST')return new Response('Method not allowed',{status:405});
 const header=req.headers.get('x-ale-google-sync-secret');
 const secret=Deno.env.get('GOOGLE_SYNC_SECRET');
 if(!secret||!header||header!==secret)return new Response('Unauthorized',{status:401});
 const clientId=Deno.env.get('GOOGLE_OAUTH_CLIENT_ID');
 const clientSecret=Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET');
 const refreshToken=Deno.env.get('GOOGLE_OAUTH_REFRESH_TOKEN');
 const calendarIds=(Deno.env.get('GOOGLE_CALENDAR_IDS')||'').split(',').map(v=>v.trim()).filter(Boolean);
 if(!clientId||!clientSecret||!refreshToken||!calendarIds.length)
  return new Response('Google Calendar not configured',{status:503});
 const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  {auth:{autoRefreshToken:false,persistSession:false}});
 const failure=async(error:unknown)=>{
  const short=String(error instanceof Error?error.message:error).slice(0,250);
  console.error('Google Calendar sync failure:',short);
  await admin.from('google_calendar_sync').update({
   status:'error',last_error:short,updated_at:new Date().toISOString()
  }).eq('id',1);
  return Response.json({error:'Sincronizzazione Google non riuscita; ultima verifica non aggiornata.'},{status:503});
 };
 try{
  const tokenResponse=await fetch('https://oauth2.googleapis.com/token',{
   method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},
   body:new URLSearchParams({
    client_id:clientId,client_secret:clientSecret,refresh_token:refreshToken,
    grant_type:'refresh_token'
   })
  });
  if(!tokenResponse.ok)throw Error(`Google OAuth HTTP ${tokenResponse.status}`);
  const token=await tokenResponse.json() as {access_token?:string};
  if(!token.access_token)throw Error('Google OAuth access token missing');
  const from=new Date(Date.now()-48*3600000).toISOString();
  const to=new Date(Date.now()+43*86400000).toISOString();
  let processed=0;
  // Se una sola fonte fallisce, lo stato globale non diventa connected.
  for(const calendarId of calendarIds){
   const collected: Array<{
    calendar_id:string;original_event_id:string;original_recurring_id:string|null;
    venue_id:string|null;starts_at:string;ends_at:string;is_course:boolean;
    blocks_booking:boolean;needs_review:boolean;cancelled:boolean;
   }>=[];
   let pageToken:string|undefined;
   do{
    const url=new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`);
    url.searchParams.set('timeMin',from);url.searchParams.set('timeMax',to);
    url.searchParams.set('maxResults','2500');url.searchParams.set('singleEvents','true');
    url.searchParams.set('showDeleted','false');
    if(pageToken)url.searchParams.set('pageToken',pageToken);
    const response=await fetch(url,{headers:{Authorization:`Bearer ${token.access_token}`}});
    if(!response.ok)throw Error(`Google Calendar HTTP ${response.status}`);
    const data=await response.json() as {
      nextPageToken?:string;
      items?:Array<{
       id:string;status?:string;transparency?:string;recurringEventId?:string;
       start?:{dateTime?:string;date?:string};end?:{dateTime?:string;date?:string};
       extendedProperties?:{private?:Record<string,string>}
      }>
    };
    for(const event of data.items||[]){
     if(event.status==='cancelled'||!event.start||!event.end)continue;
     const allDay=!!event.start.date;
     // Intervalli all-day allargati per coprire ogni ora locale durante cambi DST.
     const start=allDay?new Date(Date.parse(event.start.date+'T00:00:00Z')-86400000).toISOString():event.start.dateTime;
     const end=allDay?new Date(Date.parse(event.end.date+'T00:00:00Z')+86400000).toISOString():event.end.dateTime;
     if(!start||!end||Date.parse(start)>=Date.parse(end))continue;
     const props=event.extendedProperties?.private||{};
     const venue=['talenti','nuovo_salario'].includes(props.aleVenue)?props.aleVenue:null;
     collected.push({
      calendar_id:calendarId,original_event_id:event.id,
      original_recurring_id:event.recurringEventId||null,venue_id:venue,
      starts_at:start,ends_at:end,is_course:props.aleKind==='course',
      blocks_booking:event.transparency!=='transparent',
      needs_review:venue===null,cancelled:false
     });
    }
    pageToken=data.nextPageToken;
   }while(pageToken);
   // Applicare tutte le modifiche, poi scartare gli eventi rimossi nel range.
   for(let i=0;i<collected.length;i+=100){
    const {error}=await admin.from('external_calendar_events').upsert(collected.slice(i,i+100),
      {onConflict:'calendar_id,original_event_id'});
    if(error)throw error;
   }
   const {data:existing,error:listError}=await admin.from('external_calendar_events')
     .select('id,original_event_id,starts_at').eq('calendar_id',calendarId).gte('starts_at',from).lte('starts_at',to);
   if(listError)throw listError;
   const ids=new Set(collected.map(x=>x.original_event_id));
   const obsolete=(existing||[]).filter(x=>!ids.has(x.original_event_id)).map(x=>x.id);
   for(let i=0;i<obsolete.length;i+=100){
    const {error}=await admin.from('external_calendar_events').delete().in('id',obsolete.slice(i,i+100));
    if(error)throw error;
   }
   processed+=collected.length;
  }
  const {error:stateError}=await admin.from('google_calendar_sync').update({
   status:'connected',last_success_at:new Date().toISOString(),last_error:null,
   updated_at:new Date().toISOString()
  }).eq('id',1);
  if(stateError)throw stateError;
  return Response.json({ok:true,calendars:calendarIds.length,events:processed,
   last_success_at:new Date().toISOString()});
 }catch(error){return failure(error)}
});
