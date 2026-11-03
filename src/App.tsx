import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { ArrowLeft, ArrowRight, Bell, CalendarCheck, CalendarDays, Check, CheckCircle2, ChevronRight, CircleHelp, CreditCard, Dumbbell, ExternalLink, Gift, Instagram, LockKeyhole, LogOut, MapPin, Menu, MessageCircle, QrCode, Settings2, ShieldCheck, Sparkles, Tag, TicketPercent, UserRound, Users, Wallet, X, Zap } from 'lucide-react';
import type { Booking, ClientTab, CoachTab, Discount, Notice, Pack, PaymentMode, Profile, Service, Venue, Wallet as CreditWallet, WorkingHours } from './types';
import { currency, dateLabel, demoBooking, demoHours, demoPacks, demoServices, demoVenues, nextDates, previewProfile, ready, sources, stateLabels, supabase, timeLabel, whatsappLink } from './lib';

type Screen='landing'|'auth'|'client'|'coach';
type Step='details'|'when'|'review';
const disciplines=['Forza / Sala pesi','TRX','GRID','Calisthenics','Hyrox','Flexability','Cross Active'];
const dayNames=['Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato','Domenica'];
const iconByService:Record<string,typeof Zap>={single:Zap,couple:Users,check:CalendarCheck,start:Dumbbell,intro:MessageCircle,other:Sparkles};
const promo='ALECOACH10';
const fromUrl=()=>{const q=new URLSearchParams(location.search);return {source:q.get('source')||'direct',code:(q.get('code')||'').toUpperCase(),referral:q.get('ref')||''};};
const storageBookings='ale-coach-preview-bookings-v1';
const storageAllow='ale-coach-preview-allow';
const storageNotices='ale-coach-preview-notices';
function demoRead<T>(key:string,fallback:T):T{try{const s=localStorage.getItem(key);return s?JSON.parse(s) as T:fallback}catch{return fallback}}
function demoWrite<T>(key:string,value:T){try{localStorage.setItem(key,JSON.stringify(value))}catch{/* private mode */}}
const errorText=(e:unknown)=>e instanceof Error?e.message:typeof e==='object'&&e&&'message' in e?String(e.message):'Operazione non riuscita';
function Logo({small=false}:{small?:boolean}){return <div className={`brand ${small?'brand-small':''}`}><span>///</span> ALE <b>COACH</b></div>}
function Button({children,variant='primary',disabled=false,onClick,type='button',className=''}:{children:ReactNode;variant?:'primary'|'outline'|'quiet'|'dark';disabled?:boolean;onClick?:()=>void;type?:'button'|'submit';className?:string}){return <button type={type} onClick={onClick} disabled={disabled} className={`button button-${variant} ${className}`}>{children}</button>}
function Title({eyebrow,children,sub}:{eyebrow?:string;children:ReactNode;sub?:string}){return <div className="title-block">{eyebrow&&<div className="eyebrow"><span>///</span> {eyebrow}</div>}<h2>{children}</h2>{sub&&<p>{sub}</p>}</div>}
function Status({status}:{status:Booking['status']}){return <span className={`state state-${status}`}><i/>{stateLabels[status]}</span>}
function Labeled({label,children,required=false}:{label:string;children:ReactNode;required?:boolean}){return <label className="field"><span>{label}{required?' *':''}</span>{children}</label>}
function Empty({title,desc}:{title:string;desc:string}){return <div className="empty-state"><CalendarDays size={31}/><h3>{title}</h3><p>{desc}</p></div>}
function alertTitle(mode:'ok'|'error'|'info'){return mode==='error'?<CircleHelp size={18}/>:mode==='ok'?<CheckCircle2 size={18}/>:<Sparkles size={18}/>}
function App(){
 const [screen,setScreen]=useState<Screen>('landing');
 const [clientTab,setClientTab]=useState<ClientTab>('home');
 const [coachTab,setCoachTab]=useState<CoachTab>('overview');
 const [user,setUser]=useState<User|null>(null);
 const [profile,setProfile]=useState<Profile|null>(null);
 const [busy,setBusy]=useState(false);
 const [booting,setBooting]=useState(ready);
 const [message,setMessage]=useState<{mode:'ok'|'error'|'info';text:string}|null>(null);
 const [authMode,setAuthMode]=useState<'signin'|'signup'|'reset'>('signin');
 const [authForm,setAuthForm]=useState({name:'',phone:'',email:'',password:''});
 const [services,setServices]=useState<Service[]>(demoServices);
 const [venues,setVenues]=useState<Venue[]>(demoVenues);
 const [hours,setHours]=useState<WorkingHours[]>(demoHours);
 const [packs,setPacks]=useState<Pack[]>(demoPacks);
 const [codes,setCodes]=useState<Discount[]>([{code:promo,percent_off:10,active:true,uses:0,first_purchase_only:true,valid_days_from_contact:7}]);
 const [bookings,setBookings]=useState<Booking[]>(()=>ready?[]:demoRead(storageBookings,[demoBooking()]));
 const [clients,setClients]=useState<Profile[]>(()=>ready?[]:[{...previewProfile('client'),allow_in_person:demoRead(storageAllow,false)}]);
 const [notices,setNotices]=useState<Notice[]>(()=>ready?[]:demoRead(storageNotices,[]));
 const [wallets,setWallets]=useState<CreditWallet[]>([]);
 const [selectedService,setSelectedService]=useState<Service|null>(null);
 const [step,setStep]=useState<Step>('details');
 const [selectedDay,setSelectedDay]=useState('');
 const [selectedHour,setSelectedHour]=useState<number|null>(null);
 const [selectedVenue,setSelectedVenue]=useState('talenti');
 const [selectedMode,setSelectedMode]=useState<PaymentMode>('online');
 const [bookingDetails,setBookingDetails]=useState<Record<string,string>>({});
 const [documentFile,setDocumentFile]=useState<File|null>(null);
 const [promoInput,setPromoInput]=useState('');
 const [availableHours,setAvailableHours]=useState<number[]>([]);
 const [quoteValues,setQuoteValues]=useState<Record<string,string>>({});
 const [qr,setQr]=useState('');
 const [allowMenu,setAllowMenu]=useState(false);
 const [pushEnabled,setPushEnabled]=useState(false);
 const [termsOk,setTermsOk]=useState(false);
 const [previewNote,setPreviewNote]=useState(false);
 const attrib=useRef(fromUrl());
 const pendingAction=useRef<string|null>(null);
 const isPreview=!ready;
 const isCoach=profile?.role==='coach';
 const myBookings=useMemo(()=>bookings.filter(b=>isCoach||b.client_id===profile?.id).sort((a,b)=>new Date(b.created_at).getTime()-new Date(a.created_at).getTime()),[bookings,isCoach,profile?.id]);
 const myNotices=useMemo(()=>notices.filter(n=>n.recipient_id===profile?.id),[notices,profile?.id]);
 const unread=myNotices.filter(n=>!n.read_at).length;
 const creditCount=wallets.filter(w=>w.client_id===profile?.id&&new Date(w.expires_at)>new Date()).reduce((v,w)=>v+w.remaining,0);
 const selected=selectedService;
 const trialDays=nextDates();
 const submitMsg=(text:string,mode:'ok'|'error'|'info'='ok')=>setMessage({text,mode});
 const onlineReady=Boolean(supabase);
 const sourceLabel=sources[attrib.current.source]||'Accesso diretto';
 const refresh=useCallback(async()=>{
  if(!supabase||!user)return;
  const [b,n,w]=await Promise.all([
    supabase.from('bookings').select('*').order('created_at',{ascending:false}).limit(300),
    supabase.from('notifications').select('*').order('created_at',{ascending:false}).limit(100),
    supabase.from('wallet_credits').select('*').limit(100),
  ]);
  if(b.error)submitMsg(b.error.message,'error');else setBookings((b.data||[]) as Booking[]);
  if(!n.error)setNotices((n.data||[]) as Notice[]);
  if(!w.error)setWallets((w.data||[]) as CreditWallet[]);
  if(profile?.role==='coach'){
    const [p,c]=await Promise.all([supabase.from('profiles').select('*').order('created_at',{ascending:false}).limit(200),supabase.from('discount_codes').select('*')]);
    if(!p.error)setClients((p.data||[]).filter(x=>x.role==='client') as Profile[]);
    if(!c.error)setCodes(c.data as Discount[]);
  }
 },[user,profile?.role]);
 useEffect(()=>{
  if(!supabase){setBooting(false);return;}
  const api=supabase;
  let active=true;
  const sync=async(authUser:User|null)=>{
   if(!active)return;
   setUser(authUser);
   if(!authUser){setProfile(null);setScreen('landing');setBooting(false);return;}
   const {data,error}=await api.from('profiles').select('*').eq('id',authUser.id).single();
   if(!active)return;
   if(error){submitMsg('Profilo non disponibile: '+error.message,'error');setBooting(false);return;}
   const p=data as Profile;
   setProfile(p);setScreen(p.role==='coach'?'coach':'client');setBooting(false);
  };
  api.auth.getUser().then(({data})=>sync(data.user)).catch(()=>setBooting(false));
  const {data:{subscription}}=api.auth.onAuthStateChange((_event,session)=>{void sync(session?.user??null)});
  return()=>{active=false;subscription.unsubscribe()};
 },[]);
 useEffect(()=>{
  if(!supabase)return;
  const api=supabase;
  void Promise.all([
   api.from('services').select('*').order('sort_order'),
   api.from('venues').select('*'),
   api.from('working_hours').select('*').order('weekday'),
   api.from('packages').select('*').order('sort_order')
  ]).then(([s,v,h,p])=>{if(!s.error)setServices(s.data as Service[]);if(!v.error)setVenues(v.data as Venue[]);if(!h.error)setHours(h.data as WorkingHours[]);if(!p.error)setPacks(p.data as Pack[])});
 },[]);
 useEffect(()=>{void refresh()},[refresh]);
 useEffect(()=>{
  if(!supabase||!user)return;
  const c=supabase.channel('ale-realtime-'+user.id).on('postgres_changes',{event:'*',schema:'public',table:'bookings'},()=>{void refresh()}).on('postgres_changes',{event:'INSERT',schema:'public',table:'notifications',filter:`recipient_id=eq.${user.id}`},()=>{void refresh()}).subscribe();
  return()=>{void supabase!.removeChannel(c)};
 },[user,refresh]);
 useEffect(()=>{if(!ready){demoWrite(storageBookings,bookings);demoWrite(storageNotices,notices)}},[bookings,notices]);
 useEffect(()=>{window.scrollTo({top:0,behavior:'smooth'})},[screen,clientTab,coachTab,step,selectedService]);
 useEffect(()=>{if(!selectedService||selectedService.kind==='quote'||!selectedDay)return;
   if(!supabase){const h=hours.find(x=>x.weekday===trialDays.find(d=>d.date===selectedDay)?.weekday);setAvailableHours(h?.is_open?Array.from({length:h.end_hour-h.start_hour},(_,i)=>i+h.start_hour).filter(hour=>!bookings.some(b=>b.status!=='rejected'&&b.status!=='cancelled'&&b.status!=='expired'&&b.starts_at&&new Date(b.starts_at).toLocaleDateString('sv-SE',{timeZone:'Europe/Rome'})===selectedDay&&Number(timeLabel(b.starts_at).slice(0,2))===hour)):[]);return}
   let active=true;
   void supabase.rpc('available_slots',{p_service_id:selectedService.id,p_day:selectedDay}).then(({data,error})=>{if(active){setAvailableHours(error?[]:(data||[]).map((x:{hour:number})=>x.hour));if(error)submitMsg(error.message,'error')}});
   return()=>{active=false};
 },[selectedService,selectedDay,bookings,hours]);
 useEffect(()=>{if(coachTab!=='marketing')return;void import('qrcode').then(({default:QRCode})=>QRCode.toDataURL(`${location.origin}/?source=club&code=${promo}`,{width:320,margin:2,color:{dark:'#1b1515',light:'#ffffff'}})).then(setQr).catch(()=>setQr(''))},[coachTab]);
 const googleLogin=async()=>{
  if(!supabase){submitMsg('Google OAuth disponibile dopo la configurazione Supabase.','info');return}
  const {error}=await supabase.auth.signInWithOAuth({provider:'google',options:{redirectTo:location.origin}});
  if(error)submitMsg(error.message,'error');
 };
 const previewLogin=(role:'client'|'coach')=>{const p=previewProfile(role);if(role==='client')p.allow_in_person=demoRead(storageAllow,false);setProfile(p);setScreen(role==='coach'?'coach':'client');submitMsg('Modalità anteprima: dati salvati solo in questo browser.','info')};
 const logout=async()=>{if(supabase)await supabase.auth.signOut();setUser(null);setProfile(null);setSelectedService(null);setScreen('landing');setClientTab('home');setCoachTab('overview')};
 const authenticate=async(e:React.FormEvent)=>{
  e.preventDefault();if(!supabase){submitMsg('Configura Supabase per attivare la registrazione.','error');return}
  if(authMode==='signup'&&!authForm.name.trim()){submitMsg('Inserisci nome e cognome.','error');return}
  setBusy(true);
  try{
   if(authMode==='reset'){
    const {error}=await supabase.auth.resetPasswordForEmail(authForm.email,{redirectTo:`${location.origin}/`});if(error)throw error;submitMsg('Se l’indirizzo è registrato, riceverai un link per recuperare la password.','info');return;
   }
   if(authMode==='signup'){
    const {data,error}=await supabase.auth.signUp({email:authForm.email,password:authForm.password,options:{data:{full_name:authForm.name,phone:authForm.phone},emailRedirectTo:`${location.origin}/`}});if(error)throw error;
    submitMsg(data.session?'Registrazione completata!':'Controlla la tua email per confermare l’account.','info');return;
   }
   const {error}=await supabase.auth.signInWithPassword({email:authForm.email,password:authForm.password});if(error)throw error;
  }catch(e){submitMsg(errorText(e),'error')}finally{setBusy(false)}
 };
 const beginBooking=(s:Service)=>{pendingAction.current=s.id;setSelectedService(s);setStep(s.kind==='free'?'when':'details');setSelectedDay('');setSelectedHour(null);setSelectedMode('online');setSelectedVenue('talenti');setBookingDetails({});setDocumentFile(null);setTermsOk(false);setPromoInput(attrib.current.code===promo?promo:'');if(!profile){setScreen('auth');setAuthMode('signin')}};
 const finishWizard=()=>{setSelectedService(null);setStep('details');setClientTab('bookings');void refresh()};
 const changeProfile=async(patch:Partial<Pick<Profile,'full_name'|'phone'|'virgin_member'>>)=>{
  if(!profile)return;
  if(!supabase){setProfile({...profile,...patch});submitMsg('Profilo aggiornato in anteprima');return}
  setBusy(true);const {error}=await supabase.from('profiles').update(patch).eq('id',profile.id);setBusy(false);
  if(error){submitMsg(error.message,'error');return}setProfile({...profile,...patch});submitMsg('Profilo aggiornato');
 };
 const saveBooking=async()=>{
  if(!profile||!selected)return;
  if(!profile.virgin_member){submitMsg('Serve l’iscrizione a Virgin Active.','error');return}
  if(selected.kind!=='quote'&&(!selectedDay||selectedHour===null)){submitMsg('Seleziona giorno e orario.','error');return}
  if(selected.id==='couple'&&!bookingDetails.partner?.trim()){submitMsg('Inserisci il nome del partner.','error');return}
  if(['single','couple'].includes(selected.id)&&!bookingDetails.discipline){submitMsg('Scegli una disciplina.','error');return}
  if(selected.id==='other'&&!bookingDetails.description?.trim()){submitMsg('Descrivi la richiesta.','error');return}
  if(!termsOk){submitMsg('Accetta le condizioni di prenotazione.','error');return}
  setBusy(true);
  try{
   if(!supabase){
    const discount=promoInput.trim().toUpperCase()===promo&&selected.kind==='paid'?10:0;
    const b:Booking={...demoBooking(),id:crypto.randomUUID(),client_id:'client-preview',service_id:selected.id,venue_id:selected.kind==='quote'?null:selectedVenue,
      starts_at:selected.kind==='quote'?null:new Date(`${selectedDay}T${String(selectedHour).padStart(2,'0')}:00:00`).toISOString(),duration_minutes:selected.duration_minutes,
      payment_mode:selected.kind==='free'||selected.kind==='quote'?'none':selectedMode,status:'pending',payment_status:'unpaid',base_amount_cents:selected.price_cents,
      amount_cents:Math.round(selected.price_cents*(100-discount)/100),discount_percent:discount,promo_code:discount?promo:null,details:bookingDetails,
      source:attrib.current.source,referral:attrib.current.referral,created_at:new Date().toISOString(),expires_at:new Date(Date.now()+86400000).toISOString()};
    setBookings(v=>[b,...v]);submitMsg('Richiesta inviata! Ale dovrà confermarla.');finishWizard();return;
   }
   const details={...bookingDetails};
   if(documentFile){
    if(!['application/pdf','image/jpeg','image/png'].includes(documentFile.type)||documentFile.size>5*1024*1024)throw Error('Carica un PDF, JPG o PNG fino a 5 MB.');
    const path=`${profile.id}/${crypto.randomUUID()}-${documentFile.name.replace(/[^a-z0-9._-]/gi,'_')}`;
    const {error:uploadError}=await supabase.storage.from('client-documents').upload(path,documentFile,{contentType:documentFile.type,upsert:false});
    if(uploadError)throw uploadError;details.document_path=path;
   }
   const {error}=await supabase.rpc('create_booking',{p_service_id:selected.id,p_venue_id:selectedVenue,p_day:selected.kind==='quote'?null:selectedDay,p_hour:selected.kind==='quote'?null:selectedHour,p_details:details,p_payment_mode:selected.kind==='free'||selected.kind==='quote'?'none':selectedMode,p_code:promoInput.toUpperCase().trim()||null,p_source:attrib.current.source,p_referral:attrib.current.referral||null});
   if(error)throw error;
   submitMsg('Richiesta inviata. Ale riceverà una notifica e potrà approvarla.');finishWizard();
  }catch(e){submitMsg(errorText(e),'error')}finally{setBusy(false)}
 };
 const coachAction=async(b:Booking,action:'approve'|'reject'|'quote')=>{
  setBusy(true);
  try{
   if(!supabase){
    const status=action==='reject'?'rejected':action==='quote'?'quoted':b.payment_mode==='online'?'awaiting_payment':'confirmed';
    setBookings(rows=>rows.map(x=>x.id===b.id?{...x,status,approved_at:new Date().toISOString(),amount_cents:action==='quote'?Number(quoteValues[b.id])*100:x.amount_cents,payment_status:status==='confirmed'?'due_in_person':status==='awaiting_payment'?'awaiting':x.payment_status}:x));
   }else{
    const cents=action==='quote'?Math.round(Number(quoteValues[b.id])*100):null;
    if(action==='quote'&&(!cents||cents<=0)){submitMsg('Inserisci un prezzo valido.','error');setBusy(false);return}
    const {error}=await supabase.rpc('coach_decide_booking',{p_booking_id:b.id,p_action:action,p_quote_cents:cents});if(error)throw error;
   }
   submitMsg(action==='reject'?'Richiesta rifiutata':action==='quote'?'Preventivo inviato':'Richiesta approvata');void refresh();
  }catch(e){submitMsg(errorText(e),'error')}finally{setBusy(false)}
 };
 const setPaymentMode=async(b:Booking,mode:'online'|'in_person')=>{
  if(!supabase){setBookings(rows=>rows.map(x=>x.id===b.id?{...x,payment_mode:mode}:x));return}
  const {error}=await supabase.rpc('coach_set_booking_method',{p_booking_id:b.id,p_mode:mode});if(error)submitMsg(error.message,'error');else void refresh();
 };
 const setInPerson=async(c:Profile,allow:boolean)=>{
  setBusy(true);
  try{if(supabase){const {error}=await supabase.rpc('coach_set_in_person',{p_client_id:c.id,p_allowed:allow});if(error)throw error}
   else{demoWrite(storageAllow,allow);if(profile?.role==='client')setProfile({...profile,allow_in_person:allow})}
   setClients(v=>v.map(x=>x.id===c.id?{...x,allow_in_person:allow}:x));submitMsg(allow?'Pagamento in palestra abilitato':'Pagamento in palestra disabilitato');void refresh();
  }catch(e){submitMsg(errorText(e),'error')}finally{setBusy(false)}
 };
 const buyPackage=async(p:Pack)=>{
  if(!profile){setScreen('auth');setAuthMode('signup');return}
  if(p.type==='subscription'){submitMsg('Gli abbonamenti mensili saranno attivati dopo la configurazione Stripe.','info');return}
  if(!profile.virgin_member){submitMsg('Conferma prima l’iscrizione Virgin Active nel tuo profilo.','error');return}
  if(!supabase){submitMsg('Anteprima: l’acquisto sarà attivo dopo il collegamento Stripe.','info');return}
  setBusy(true);
  try{const {data,error}=await supabase.functions.invoke('create-checkout',{body:{packageId:p.id}});if(error||!data?.url)throw Error(data?.error||error?.message||'Checkout non disponibile');location.assign(data.url)}catch(e){submitMsg(errorText(e),'error')}finally{setBusy(false)}
 };
 const payBooking=async(b:Booking)=>{
  if(!supabase){submitMsg('Demo: il checkout Stripe sarà disponibile dopo la configurazione delle credenziali.','info');return}
  setBusy(true);
  try{const {data,error}=await supabase.functions.invoke('create-checkout',{body:{bookingId:b.id}});if(error)throw error;if(!data?.url||!String(data.url).startsWith('https://checkout.stripe.com/'))throw Error(data?.error||'Checkout non configurato');location.assign(data.url)}catch(e){submitMsg(errorText(e),'error')}finally{setBusy(false)}
 };
 const cancelBooking=async(b:Booking)=>{
  if(!confirm('Vuoi disdire questa prenotazione?'))return;
  setBusy(true);
  try{
   if(!supabase){setBookings(rows=>rows.map(x=>x.id===b.id?{...x,status:'cancelled',cancelled_at:new Date().toISOString()}:x))}
   else if(b.payment_mode==='online'&&b.payment_status==='paid'){
    const {data,error}=await supabase.functions.invoke('cancel-booking',{body:{bookingId:b.id}});if(error||data?.error)throw Error(data?.error||error?.message||'Rimborso non riuscito');
   }else{const {error}=await supabase.rpc('cancel_unpaid_booking',{p_booking_id:b.id});if(error)throw error}
   submitMsg('Prenotazione disdetta');void refresh();
  }catch(e){submitMsg(errorText(e),'error')}finally{setBusy(false)}
 };
 const inPersonPaid=async(b:Booking)=>{
  setBusy(true);try{
   if(!supabase)setBookings(rows=>rows.map(x=>x.id===b.id?{...x,payment_status:'paid',paid_at:new Date().toISOString()}:x));
   else{const {error}=await supabase.rpc('coach_mark_in_person_paid',{p_booking_id:b.id});if(error)throw error}
   submitMsg('Pagamento in presenza registrato');void refresh();
  }catch(e){submitMsg(errorText(e),'error')}finally{setBusy(false)}
 };
 const markNotices=async()=>{
  const unreadList=myNotices.filter(n=>!n.read_at);setNotices(v=>v.map(n=>n.recipient_id===profile?.id?{...n,read_at:n.read_at||new Date().toISOString()}:n));
  if(supabase)for(const n of unreadList)await supabase.from('notifications').update({read_at:new Date().toISOString()}).eq('id',n.id);
 };
 const subscribePush=async()=>{
  if(!supabase||!profile){submitMsg('Le push reali richiedono Supabase configurato.','info');return}
  const key=String(import.meta.env.VITE_VAPID_PUBLIC_KEY||'');if(!key){submitMsg('La chiave pubblica Web Push non è stata ancora configurata.','info');return}
  try{
   if(!('serviceWorker' in navigator)||!('PushManager' in window))throw Error('Il dispositivo non supporta Web Push.');
   const permission=await Notification.requestPermission();if(permission!=='granted')throw Error('Devi autorizzare le notifiche dalle impostazioni del telefono.');
   const registration=await navigator.serviceWorker.ready;
   const bytes=Uint8Array.from(atob(key.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
   const subscription=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:bytes});
   const data=subscription.toJSON();if(!data.keys)throw Error('Chiavi push non disponibili');
   const {error}=await supabase.from('push_subscriptions').upsert({user_id:profile.id,endpoint:subscription.endpoint,p256dh:data.keys.p256dh,auth_key:data.keys.auth},{onConflict:'endpoint'});if(error)throw error;
   setPushEnabled(true);submitMsg('Notifiche push abilitate su questo dispositivo.');
  }catch(e){submitMsg(errorText(e),'error')}
 };
 const updateService=async(s:Service,patch:Partial<Service>)=>{if(!supabase){setServices(rows=>rows.map(x=>x.id===s.id?{...x,...patch}:x));return}const {error}=await supabase.from('services').update(patch).eq('id',s.id);if(error)submitMsg(error.message,'error');else setServices(rows=>rows.map(x=>x.id===s.id?{...x,...patch}:x))};
 const updateHours=async(h:WorkingHours,patch:Partial<WorkingHours>)=>{if(!supabase){setHours(rows=>rows.map(x=>x.weekday===h.weekday?{...x,...patch}:x));return}const {error}=await supabase.from('working_hours').update(patch).eq('weekday',h.weekday);if(error)submitMsg(error.message,'error');else setHours(rows=>rows.map(x=>x.weekday===h.weekday?{...x,...patch}:x))};
 const saveCode=async(value:Discount)=>{if(!supabase){setCodes(rows=>rows.map(c=>c.code===value.code?value:c));return}const {error}=await supabase.from('discount_codes').update({active:value.active,percent_off:value.percent_off}).eq('code',value.code);if(error)submitMsg(error.message,'error');else setCodes(rows=>rows.map(c=>c.code===value.code?value:c))};
 const activeServices=services.filter(s=>s.active).sort((a,b)=>a.sort_order-b.sort_order);
 const activePacks=packs.filter(p=>p.active).sort((a,b)=>a.sort_order-b.sort_order);
 const bookingForm=selected&&screen==='client'&&!isCoach;
 const cancelAllowed=(b:Booking)=>b.starts_at&&new Date(b.starts_at).getTime()-Date.now()>=24*3600000&&['pending','confirmed','awaiting_payment'].includes(b.status);
 const selectedPreviewAmount=selected?.price_cents||0;
 const discountPreview=selected?.kind==='paid'&&promoInput.trim().toUpperCase()===promo?10:0;
 const pendingBookings=bookings.filter(b=>b.status==='pending');
 const futureBookings=bookings.filter(b=>b.status==='confirmed'&&b.starts_at&&new Date(b.starts_at)>new Date()).sort((a,b)=>new Date(a.starts_at!).getTime()-new Date(b.starts_at!).getTime());
 const totalPaid=bookings.filter(b=>b.payment_status==='paid'&&b.payment_mode==='online').reduce((n,b)=>n+b.amount_cents,0);
 const inPersonTotal=bookings.filter(b=>b.payment_status==='due_in_person').reduce((n,b)=>n+b.amount_cents,0);
 const coachNav:{id:CoachTab;label:string}[]=[{id:'overview',label:'Dashboard'},{id:'requests',label:'Richieste'},{id:'agenda',label:'Agenda'},{id:'clients',label:'Clienti'},{id:'hours',label:'Orari'},{id:'services',label:'Listino'},{id:'marketing',label:'Marketing'}];
 const shareUrl=typeof window==='undefined'?'':`${window.location.origin}/?source=club&code=${promo}`;
 return <div className={`app-shell ${screen==='coach'?'coach-shell':''}`}>
  <header className="site-header"><div className="header-inner"><button aria-label="Vai alla home" className="logo-button" onClick={()=>{setSelectedService(null);setScreen(profile?(isCoach?'coach':'client'):'landing')}}><Logo small/></button>
   <div className="header-actions">{profile?<><span className="greeting">{isCoach?'Ciao Ale':`Ciao, ${profile.full_name.split(' ')[0]||'atleta'}`}</span><button className="icon-button" aria-label="Esci dall'account" onClick={()=>void logout()}><LogOut size={18}/></button></>:<Button variant="outline" onClick={()=>{setScreen('auth');setAuthMode('signin')}}>Accedi <ArrowRight size={15}/></Button>}</div></div></header>
  {isPreview&&<div className="preview-banner"><div><strong>ANTEPRIMA INTERATTIVA</strong> · Dati locali, senza database o incassi reali.</div><button onClick={()=>setPreviewNote(v=>!v)}>{previewNote?'Chiudi':'Dettagli'}</button>{previewNote&&<p>Questa pubblicazione serve per testare il percorso. Login Supabase, Stripe e push server saranno effettivi solo dopo configurazione del progetto e delle chiavi.</p>}</div>}
  {message&&<div className={`flash flash-${message.mode}`} role="status">{alertTitle(message.mode)}<span>{message.text}</span><button aria-label="Chiudi avviso" onClick={()=>setMessage(null)}><X size={16}/></button></div>}
  {booting?<div className="loading"><div className="spinner"/>Caricamento in corso...</div>:<>
  {screen==='landing'&&<main className="client-layout landing-page">
   <section className="hero"><div className="hero-lines" aria-hidden="true">///</div><div className="eyebrow">PERSONAL TRAINING · ROMA</div><h1>NON BASTA<br/>ALLENARSI.<br/><em>CONTA COME<br/>LO FAI.</em></h1><p>Un percorso su misura, un appuntamento alla volta. Prenota i tuoi allenamenti con Alessandro Cola.</p><div className="hero-identity"><div className="avatar-mark">AC</div><div><div className="signature">by Ale Coach</div><span>Personal Trainer · Hyrox Academy Level One</span></div></div><Button onClick={()=>{setScreen('auth');setAuthMode('signup')}}>INIZIA IL TUO PERCORSO <ArrowRight size={18}/></Button></section>
   <div className="mini-locations"><MapPin size={17}/><span>Virgin Active Roma Talenti</span><b>·</b><span>Nuovo Salario</span></div>
   <section className="promo-panel"><div><Tag size={20}/><b>PRIMA LEZIONE, -10%</b></div><p>Usa il codice <strong>{promo}</strong> sulla prima lezione pagata, entro 7 giorni dal primo contatto.</p><button onClick={()=>{void navigator.clipboard?.writeText(promo);submitMsg('Codice copiato')}}>Copia codice <ChevronRight size={16}/></button></section>
   <section><Title eyebrow="SCEGLI IL TUO ALLENAMENTO" sub="Allenarsi bene parte dal servizio giusto.">COSTRUIAMO IL TUO PERCORSO</Title><div className="service-list">{activeServices.map(s=>{const Icon=iconByService[s.id]||Zap;return <button key={s.id} className="service-card" onClick={()=>beginBooking(s)}><div className="service-icon"><Icon size={24}/></div><div className="service-copy"><h3>{s.name}</h3><p>{s.description}</p><small>{s.kind==='quote'?'Da concordare':`${s.duration_minutes} minuti`}</small></div><div className="service-price">{s.kind==='free'?'GRATIS':s.kind==='quote'?'SU PREVENTIVO':currency(s.price_cents)}<ChevronRight size={18}/></div></button>})}</div></section>
   <section className="packages-area"><Title eyebrow="PIÙ RISULTATI, PIÙ CONTINUITÀ">PACCHETTI E ABBONAMENTI</Title><div className="packages-list">{activePacks.map(p=><div key={p.id} className="package-card"><div><h3>{p.name}</h3><p>{p.description}</p><small>{p.credits} lezioni · {p.type==='subscription'?'Rinnovo mensile':'Pagamento unico'}</small></div><b>{currency(p.price_cents)}</b></div>)}</div><p className="footnote">Gli acquisti dei pacchetti saranno attivati con Stripe. Per la demo non vengono addebitati importi.</p></section>
   <section className="legal-strip"><ShieldCheck size={20}/><p>Lezioni riservate agli iscritti Virgin Active. La conferma dell'orario arriva da Ale. Disdetta gratuita fino a 24 ore prima.</p></section>
   {whatsappLink('Ciao Ale, vorrei informazioni sulle lezioni!')&&<a className="whatsapp-cta" href={whatsappLink('Ciao Ale, vorrei informazioni sulle lezioni!')!} target="_blank" rel="noreferrer"><MessageCircle size={17}/> Scrivi ad Ale su WhatsApp</a>}
  </main>}
  {screen==='auth'&&<main className="client-layout auth-page"><button className="back-link" onClick={()=>setScreen('landing')}><ArrowLeft size={17}/> Torna alla presentazione</button><div className="auth-card"><div className="auth-icon"><LockKeyhole size={26}/></div><div className="signature">il tuo spazio con Ale</div><Title eyebrow="AREA RISERVATA">{authMode==='signup'?'CREA IL TUO ACCOUNT':authMode==='reset'?'RECUPERA LA PASSWORD':'BENTORNATO!'}</Title><p className="auth-lead">{authMode==='signup'?'Prenota, segui le tue lezioni e ricevi conferme in un unico posto.':authMode==='reset'?'Inserisci la tua email per recuperare l’accesso.':'Accedi con la tua email e la tua password.'}</p>
    <form onSubmit={e=>void authenticate(e)} className="form-stack">{authMode==='signup'&&<><Labeled label="Nome e cognome" required><input required autoComplete="name" value={authForm.name} onChange={e=>setAuthForm(f=>({...f,name:e.target.value}))} placeholder="Mario Rossi"/></Labeled><Labeled label="Telefono"><input type="tel" autoComplete="tel" value={authForm.phone} onChange={e=>setAuthForm(f=>({...f,phone:e.target.value}))} placeholder="+39..."/></Labeled></>}
    <Labeled label="Email" required><input type="email" required autoComplete="email" value={authForm.email} onChange={e=>setAuthForm(f=>({...f,email:e.target.value}))} placeholder="nome@email.it"/></Labeled>{authMode!=='reset'&&<Labeled label="Password" required><input type="password" required minLength={8} autoComplete={authMode==='signup'?'new-password':'current-password'} value={authForm.password} onChange={e=>setAuthForm(f=>({...f,password:e.target.value}))} placeholder="Almeno 8 caratteri"/></Labeled>}
    <Button type="submit" disabled={busy||!onlineReady}>{busy?'Caricamento...':authMode==='signup'?'REGISTRATI':authMode==='reset'?'INVIA LINK':'ACCEDI'} <ArrowRight size={17}/></Button></form>
    <div className="oauth-separator">oppure</div><Button variant="outline" className="google-login" onClick={()=>void googleLogin()}>CONTINUA CON GOOGLE</Button>
    <div className="auth-switch">{authMode==='signin'?<><button onClick={()=>setAuthMode('signup')}>Non hai un account? Registrati</button><button onClick={()=>setAuthMode('reset')}>Password dimenticata?</button></>:<button onClick={()=>setAuthMode('signin')}>Hai già un account? Accedi</button>}</div>
    {isPreview&&<div className="preview-logins"><span>ANTEPRIMA DEL FLUSSO, SENZA ACCOUNT REALI</span><Button variant="dark" onClick={()=>previewLogin('client')}><UserRound size={17}/> Entra come cliente demo</Button><Button variant="outline" onClick={()=>previewLogin('coach')}><Dumbbell size={17}/> Entra come coach demo</Button></div>}
   </div><p className="security-note"><ShieldCheck size={15}/> Login protetto da Supabase Auth quando configurato</p></main>}
  {screen==='client'&&profile&&<main className="client-layout client-page">
   <div className="app-welcome"><div><div className="signature">il tuo percorso, {profile.full_name.split(' ')[0]}</div><h1>ALLENATI CON <em>ALE.</em></h1></div><div className="profile-bubble">{profile.full_name.charAt(0)||'A'}</div></div>
   {bookingForm?<section className="wizard"><button className="back-link" onClick={()=>{if(step==='review')setStep(selected.kind==='quote'?'details':'when');else if(step==='when'&&selected.kind!=='free')setStep('details');else setSelectedService(null)}}><ArrowLeft size={17}/> Indietro</button>
    <div className="wizard-top"><div className="eyebrow"><span>///</span> NUOVA PRENOTAZIONE</div><h2>{selected.name}</h2><p>{selected.description}</p></div><div className="progress"><span className="filled"/><span className={step!=='details'?'filled':''}/><span className={step==='review'?'filled':''}/></div>
    {step==='details'&&<div className="wizard-panel"><Title eyebrow="01 · DETTAGLI">DIMMI DI PIÙ</Title>
     {['single','couple'].includes(selected.id)&&<><Labeled label="Disciplina" required><select value={bookingDetails.discipline||''} onChange={e=>setBookingDetails(d=>({...d,discipline:e.target.value}))}><option value="">Scegli una disciplina</option>{disciplines.map(x=><option key={x}>{x}</option>)}</select></Labeled><Labeled label="Il tuo livello"><select value={bookingDetails.level||'Principiante'} onChange={e=>setBookingDetails(d=>({...d,level:e.target.value}))}>{['Principiante','Intermedio','Avanzato'].map(x=><option key={x}>{x}</option>)}</select></Labeled></>}
     {selected.id==='couple'&&<><Labeled label="Nome del partner" required><input value={bookingDetails.partner||''} onChange={e=>setBookingDetails(d=>({...d,partner:e.target.value}))} placeholder="Nome e cognome"/></Labeled><Labeled label="Email del partner"><input type="email" value={bookingDetails.partner_email||''} onChange={e=>setBookingDetails(d=>({...d,partner_email:e.target.value}))}/></Labeled></>}
     {selected.id==='check'&&<><Labeled label="Cosa vuoi migliorare?"><textarea rows={3} value={bookingDetails.goal||''} onChange={e=>setBookingDetails(d=>({...d,goal:e.target.value}))} placeholder="Raccontami il tuo obiettivo"/></Labeled><Labeled label="Carica la scheda (PDF, JPG, PNG · max 5 MB)"><input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={e=>setDocumentFile(e.target.files?.[0]||null)}/></Labeled></>}
     {selected.id==='start'&&<><Labeled label="Obiettivo"><textarea rows={2} value={bookingDetails.goal||''} onChange={e=>setBookingDetails(d=>({...d,goal:e.target.value}))} placeholder="Aumentare forza, preparare Hyrox..."/></Labeled><Labeled label="Esperienza di allenamento"><select value={bookingDetails.experience||'Principiante'} onChange={e=>setBookingDetails(d=>({...d,experience:e.target.value}))}>{['Principiante','1–2 anni','Oltre 2 anni'].map(x=><option key={x}>{x}</option>)}</select></Labeled><p className="footnote">Eventuali infortuni o informazioni sanitarie saranno discussi direttamente con il coach finché non sarà disponibile un’informativa privacy specifica.</p></>}
     {selected.kind==='quote'&&<><Labeled label="Raccontami cosa ti serve" required><textarea rows={5} value={bookingDetails.description||''} onChange={e=>setBookingDetails(d=>({...d,description:e.target.value}))} placeholder="Piccoli gruppi, Hyrox, eventi..."/></Labeled><Labeled label="Giorni e orari preferiti"><input value={bookingDetails.preference||''} onChange={e=>setBookingDetails(d=>({...d,preference:e.target.value}))} placeholder="Es. lunedì mattina"/></Labeled></>}
     <Button onClick={()=>{if(['single','couple'].includes(selected.id)&&!bookingDetails.discipline){submitMsg('Scegli una disciplina.','error');return}if(selected.id==='couple'&&!bookingDetails.partner?.trim()){submitMsg('Inserisci il nome del partner.','error');return}if(selected.kind==='quote'&&!bookingDetails.description?.trim()){submitMsg('Descrivi la tua richiesta.','error');return}setStep(selected.kind==='quote'?'review':'when')}}>CONTINUA <ArrowRight size={18}/></Button>
    </div>}
    {step==='when'&&<div className="wizard-panel"><Title eyebrow="02 · DISPONIBILITÀ">QUANDO CI VEDIAMO?</Title><div className="field"><span>La palestra</span><div className="venue-choice">{venues.map(v=><button key={v.id} className={selectedVenue===v.id?'chosen':''} onClick={()=>setSelectedVenue(v.id)}><MapPin size={16}/>{v.name}</button>)}</div></div><div className="field"><span>Scegli il giorno</span><div className="day-strip">{trialDays.map(d=>{const open=hours.find(x=>x.weekday===d.weekday)?.is_open;return <button key={d.date} disabled={!open} className={selectedDay===d.date?'chosen':''} aria-pressed={selectedDay===d.date} onClick={()=>{setSelectedDay(d.date);setSelectedHour(null)}}><small>{d.label.split(' ')[0]}</small><strong>{d.label.split(' ')[1]}</strong><small>{d.label.split(' ')[2]}</small></button>})}</div></div><div className="field"><span>Orari disponibili</span>{selectedDay?<div className="slot-grid">{availableHours.length?availableHours.map(hour=><button key={hour} className={selectedHour===hour?'chosen':''} aria-pressed={selectedHour===hour} onClick={()=>setSelectedHour(hour)}>{String(hour).padStart(2,'0')}:00</button>):<p className="small-muted">Nessuno slot libero per questo giorno. Prova un'altra data.</p>}</div>:<p className="small-muted">Seleziona un giorno per vedere gli orari.</p>}</div><Button disabled={!selectedDay||selectedHour===null} onClick={()=>setStep('review')}>CONTINUA <ArrowRight size={18}/></Button></div>}
    {step==='review'&&<div className="wizard-panel"><Title eyebrow="03 · CONFERMA">CI SIAMO QUASI</Title><div className="summary-card"><div className="summary-row"><span>Servizio</span><b>{selected.name}</b></div>{selected.kind!=='quote'&&<><div className="summary-row"><span>Quando</span><b>{trialDays.find(x=>x.date===selectedDay)?.label} · {String(selectedHour).padStart(2,'0')}:00</b></div><div className="summary-row"><span>Sede</span><b>{venues.find(v=>v.id===selectedVenue)?.name}</b></div></>}<div className="summary-row"><span>Prezzo</span><b>{selected.kind==='quote'?'Su preventivo':currency(selectedPreviewAmount)}</b></div></div>
     <div className="virgin-box"><div><ShieldCheck size={21}/><b>Iscrizione Virgin Active</b></div><p>Le lezioni si svolgono all'interno della palestra e sono riservate agli iscritti. Non è disponibile un ingresso giornaliero.</p><label className="check-row"><input type="checkbox" checked={profile.virgin_member} onChange={e=>void changeProfile({virgin_member:e.target.checked})}/><span>Confermo di essere iscritto a Virgin Active.</span></label>{!profile.virgin_member&&whatsappLink('Ciao Ale, non sono ancora iscritto a Virgin Active. Posso avere informazioni?')&&<a href={whatsappLink('Ciao Ale, non sono ancora iscritto a Virgin Active. Posso avere informazioni?')!} target="_blank" rel="noreferrer" className="text-link">Chiedi informazioni ad Ale <ExternalLink size={14}/></a>}</div>
     {selected.kind==='paid'&&<><Labeled label="Hai un codice sconto?"><div className="promo-input"><input placeholder="Es. ALECOACH10" value={promoInput} onChange={e=>setPromoInput(e.target.value.toUpperCase())}/><Tag size={18}/></div></Labeled>{promoInput.trim().toUpperCase()===promo&&<p className="good-note"><Check size={15}/> Sconto 10% se idoneo: prima lezione pagata entro 7 giorni dal primo contatto. Conferma lato server.</p>}
      <div className="field"><span>Metodo di pagamento</span><button className={`pay-choice ${selectedMode==='online'?'chosen':''}`} onClick={()=>setSelectedMode('online')}><CreditCard size={19}/><div><b>Pagamento online con Stripe</b><small>Solo dopo l'approvazione di Ale</small></div><Check size={17}/></button>{profile.allow_in_person&&<button className={`pay-choice ${selectedMode==='in_person'?'chosen':''}`} onClick={()=>setSelectedMode('in_person')}><Wallet size={19}/><div><b>Pagamento in palestra</b><small>Autorizzato dal coach per il tuo account</small></div><Check size={17}/></button>}{creditCount>0&&selected.id==='single'&&<button className={`pay-choice ${selectedMode==='credit'?'chosen':''}`} onClick={()=>setSelectedMode('credit')}><TicketPercent size={19}/><div><b>Usa un credito</b><small>{creditCount} lezioni disponibili</small></div><Check size={17}/></button>}</div></>}
     <div className="total"><span>Totale indicativo</span><strong>{selected.kind==='free'?'GRATIS':selected.kind==='quote'?'DA DEFINIRE':selectedMode==='credit'?'1 CREDITO':currency(selectedPreviewAmount*(100-discountPreview)/100)}</strong></div><div className="disclaimer">La richiesta scade dopo 24 ore senza conferma. Per gli importi online, pagherai solo dopo l'approvazione del coach. Disdetta gratuita entro 24 ore dalla lezione.</div><label className="check-row terms"><input type="checkbox" checked={termsOk} onChange={e=>setTermsOk(e.target.checked)}/><span>Ho letto e accetto le condizioni di prenotazione e di disdetta.</span></label><Button disabled={busy||!profile.virgin_member||!termsOk} onClick={()=>void saveBooking()}>{busy?'INVIO...':selected.kind==='quote'?'CHIEDI IL PREVENTIVO':selected.kind==='free'?'PRENOTA IL COLLOQUIO':'INVIA LA RICHIESTA'} <ArrowRight size={17}/></Button>
    </div>}
   </section>:<>
   {clientTab==='home'&&<><section className="client-hero"><div className="eyebrow">/// IL TUO PROSSIMO OBIETTIVO</div><h2>UNA LEZIONE<br/><em>ALLA VOLTA.</em></h2><p>Il momento giusto per migliorare è adesso.</p><div className="client-hero-lines">///</div></section>
    <div className="source-chip"><Sparkles size={15}/>{sourceLabel}</div>
    <div className="metric-row"><div className="metric"><span>Prossime lezioni</span><strong>{myBookings.filter(b=>b.status==='confirmed'&&b.starts_at&&new Date(b.starts_at)>new Date()).length}</strong></div><div className="metric"><span>Da confermare</span><strong>{myBookings.filter(b=>b.status==='pending').length}</strong></div><div className="metric"><span>Crediti residui</span><strong>{creditCount}</strong></div></div>
    <section className="promo-panel"><div><Gift size={19}/><b>LA PRIMA LEZIONE È SPECIALE</b></div><p>-10% con il codice <strong>{promo}</strong> entro 7 giorni dal primo contatto.</p><button onClick={()=>{void navigator.clipboard?.writeText(promo);submitMsg('Codice copiato')}}>Copia codice <ChevronRight size={16}/></button></section>
    <section><Title eyebrow="SCEGLI IL TUO ALLENAMENTO">PRENOTA CON ALE</Title><div className="service-list">{activeServices.map(s=>{const Icon=iconByService[s.id]||Zap;return <button key={s.id} className="service-card" onClick={()=>beginBooking(s)}><div className="service-icon"><Icon size={23}/></div><div className="service-copy"><h3>{s.name}</h3><p>{s.description}</p><small>{s.duration_minutes} min</small></div><div className="service-price">{s.kind==='free'?'GRATIS':s.kind==='quote'?'PREVENTIVO':currency(s.price_cents)}<ChevronRight size={16}/></div></button>})}</div></section>
    <section className="packages-area"><Title eyebrow="CONTINUITÀ">PACCHETTI & ABBONAMENTI</Title>{activePacks.map(p=><div key={p.id} className="package-card"><div><h3>{p.name}</h3><small>{p.description}</small></div><div className="package-buy"><b>{currency(p.price_cents)}</b><button onClick={()=>void buyPackage(p)} disabled={busy}>Acquista</button></div></div>)}<p className="footnote">I pacchetti si pagano subito; gli abbonamenti mensili richiedono Stripe ricorrente.</p></section>
   </>}
   {clientTab==='bookings'&&<section><Title eyebrow="LA TUA AGENDA" sub="Richieste, conferme e pagamenti in un posto solo.">LE MIE LEZIONI</Title>{myBookings.length===0?<Empty title="Ancora nessuna lezione" desc="Prenota il primo appuntamento e inizia il tuo percorso."/>:<div className="booking-list">{myBookings.map(b=>{const s=services.find(x=>x.id===b.service_id);return <article key={b.id} className="booking-card"><div className="booking-head"><h3>{s?.name||b.service_id}</h3><Status status={b.status}/></div>{b.starts_at?<div className="booking-meta"><CalendarDays size={16}/>{dateLabel(b.starts_at)} · {timeLabel(b.starts_at)} <span>·</span>{venues.find(v=>v.id===b.venue_id)?.name}</div>:<p className="small-muted">Da concordare con il coach</p>}<div className="booking-total"><span>{b.payment_mode==='in_person'?'Pagamento in palestra':b.payment_mode==='credit'?'Credito pacchetto':b.payment_mode==='none'?'Senza pagamento':'Pagamento online'}</span><b>{b.amount_cents?currency(b.amount_cents):b.status==='quoted'?'Da definire':'Gratis'}</b></div>{b.status==='pending'&&<p className="small-muted">Ale deve ancora approvare questa richiesta. Scadenza: {new Date(b.expires_at).toLocaleString('it-IT')}.</p>}{b.status==='awaiting_payment'&&<p className="small-muted">Termine per completare il pagamento: {new Date(b.expires_at).toLocaleString('it-IT')}</p>}{b.status==='awaiting_payment'&&<Button onClick={()=>void payBooking(b)} disabled={busy}><CreditCard size={16}/> COMPLETA IL PAGAMENTO</Button>}{b.status==='quoted'&&<Button onClick={()=>void payBooking(b)} disabled={busy}>ACCETTA E PAGA IL PREVENTIVO <ArrowRight size={16}/></Button>}{cancelAllowed(b)&&<button className="link-danger" onClick={()=>void cancelBooking(b)}>Disdici prenotazione</button>}{b.status==='confirmed'&&b.starts_at&&!cancelAllowed(b)&&<p className="footnote">A meno di 24 ore dalla lezione la disdetta online non è disponibile.</p>}</article>})}</div>}</section>}
   {clientTab==='messages'&&<section><Title eyebrow="TUTTI GLI AGGIORNAMENTI">NOTIFICHE</Title><div className="row-end"><Button variant="outline" onClick={()=>void subscribePush()}><Bell size={15}/>{pushEnabled?'Push abilitate':'Attiva notifiche push'}</Button></div>{myNotices.length===0?<Empty title="Tutto tranquillo" desc="Qui riceverai notizie su conferme, disdette e pagamenti."/>:myNotices.map(n=><div key={n.id} className={`notice-card ${n.read_at?'':'unread'}`}><div><b>{n.title}</b><small>{new Date(n.created_at).toLocaleString('it-IT')}</small></div><p>{n.body}</p></div>)}</section>}
   {clientTab==='profile'&&<section><Title eyebrow="IL TUO ACCOUNT">PROFILO</Title><div className="profile-card"><div className="large-avatar">{profile.full_name.charAt(0)}</div><h3>{profile.full_name}</h3><p>{profile.email}</p><div className="field"><span>Nome completo</span><input defaultValue={profile.full_name} onBlur={e=>{if(e.target.value!==profile.full_name)void changeProfile({full_name:e.target.value})}}/></div><div className="field"><span>Telefono</span><input type="tel" defaultValue={profile.phone} onBlur={e=>{if(e.target.value!==profile.phone)void changeProfile({phone:e.target.value})}}/></div><label className="check-row virgin-profile"><input type="checkbox" checked={profile.virgin_member} onChange={e=>void changeProfile({virgin_member:e.target.checked})}/><span>Iscritto a Virgin Active</span></label><div className="permission-line"><div><b>Pagamento in presenza</b><span>{profile.allow_in_person?'Abilitato dal coach':'Non abilitato: anticipo online obbligatorio'}</span></div><span className={`permission-dot ${profile.allow_in_person?'on':''}`}/></div><Button variant="outline" onClick={()=>void subscribePush()}><Bell size={17}/> {pushEnabled?'Notifiche push abilitate':'Abilita notifiche push'}</Button><Button variant="quiet" onClick={()=>void logout()}><LogOut size={17}/> Esci</Button></div></section>}
   </>}
   {!selectedService&&<nav className="bottom-nav" aria-label="Navigazione cliente"><button className={clientTab==='home'?'active':''} onClick={()=>setClientTab('home')}><Dumbbell size={21}/>Prenota</button><button className={clientTab==='bookings'?'active':''} onClick={()=>setClientTab('bookings')}><CalendarDays size={21}/>Le mie lezioni</button><button className={clientTab==='messages'?'active':''} onClick={()=>{setClientTab('messages');void markNotices()}}><span className="badge-icon"><Bell size={21}/>{unread>0&&<i>{unread}</i>}</span>Notifiche</button><button className={clientTab==='profile'?'active':''} onClick={()=>setClientTab('profile')}><UserRound size={21}/>Profilo</button></nav>}
  </main>}
  {screen==='coach'&&profile&&<main className="coach-layout">
   <div className="coach-hero"><div><div className="signature">Ciao Ale!</div><h1>IL TUO <em>CONTROLLO.</em></h1><p>Gestisci richieste, agenda e clienti. Tutto in un posto.</p></div><div className="coach-mark"><Dumbbell size={31}/></div></div>
   <div className="coach-stats"><div className="stat-card"><small>DA CONFERMARE</small><strong>{pendingBookings.length}</strong><span>Richieste ricevute</span></div><div className="stat-card"><small>PROSSIME LEZIONI</small><strong>{futureBookings.length}</strong><span>Confermate</span></div><div className="stat-card"><small>INCASSATI ONLINE*</small><strong>{currency(totalPaid)}</strong><span>In presenza: {currency(inPersonTotal)}</span></div></div>
   <div className="coach-nav-wrap"><button className="menu-toggle" onClick={()=>setAllowMenu(x=>!x)}><Menu size={17}/> Sezioni <ChevronRight size={16}/></button><nav className={`coach-nav ${allowMenu?'expanded':''}`}>{coachNav.map(x=><button key={x.id} className={coachTab===x.id?'active':''} onClick={()=>{setCoachTab(x.id);setAllowMenu(false)}}>{x.label}{x.id==='requests'&&pendingBookings.length>0&&<b>{pendingBookings.length}</b>}</button>)}</nav></div>
   {coachTab==='overview'&&<div className="coach-content"><Title eyebrow="PANORAMICA" sub="Le cose più importanti, subito.">OGGI IN AGENDA</Title>{futureBookings.slice(0,4).length===0?<Empty title="Nessuna lezione in programma" desc="Le lezioni approvate compariranno qui."/>:futureBookings.slice(0,4).map(b=><div className="compact-booking" key={b.id}><span className="time-pill">{b.starts_at?timeLabel(b.starts_at):'--:--'}</span><div><b>{services.find(x=>x.id===b.service_id)?.name}</b><small>{clients.find(c=>c.id===b.client_id)?.full_name||'Cliente'} · {venues.find(v=>v.id===b.venue_id)?.name}</small></div><Status status={b.status}/></div>)}<div className="coach-quick"><Button onClick={()=>setCoachTab('requests')}>GESTISCI RICHIESTE <ArrowRight size={17}/></Button><Button variant="outline" onClick={()=>setCoachTab('marketing')}>LINK & QR <QrCode size={17}/></Button></div><p className="footnote">*Importi registrati nelle prenotazioni. Non sostituiscono la contabilità o la rendicontazione Stripe.</p></div>}
   {coachTab==='requests'&&<section className="coach-content"><Title eyebrow="APPROVAZIONI" sub="Ogni richiesta resta in attesa per 24 ore.">RICHIESTE DA CONFERMARE</Title>{pendingBookings.length===0?<Empty title="Tutto in ordine" desc="Non ci sono richieste da gestire."/>:pendingBookings.map(b=>{const c=clients.find(x=>x.id===b.client_id);const s=services.find(x=>x.id===b.service_id);return <article key={b.id} className="request-card"><div className="booking-head"><div><div className="eyebrow">/// NUOVA RICHIESTA</div><h3>{s?.name||b.service_id}</h3></div><Status status={b.status}/></div><div className="request-client"><div className="mini-avatar">{c?.full_name.charAt(0)||'C'}</div><div><b>{c?.full_name||'Cliente'}</b><small>{c?.email||'Cliente autenticato'}</small></div></div><div className="request-facts"><div><span>DATA</span><b>{b.starts_at?dateLabel(b.starts_at):'Da concordare'}</b></div><div><span>ORA</span><b>{b.starts_at?timeLabel(b.starts_at):'--'}</b></div><div><span>SEDE</span><b>{venues.find(v=>v.id===b.venue_id)?.name||'Da concordare'}</b></div><div><span>PREZZO</span><b>{currency(b.amount_cents)}</b></div></div>{Object.keys(b.details||{}).filter(k=>k!=='document_path').length>0&&<div className="details-preview">{Object.entries(b.details).filter(([k])=>k!=='document_path').map(([k,v])=><div key={k}><small>{k.replaceAll('_',' ')}</small><span>{v}</span></div>)}</div>}{b.details?.document_path&&<button className="text-link" onClick={async()=>{if(!supabase)return;const {data,error}=await supabase.storage.from('client-documents').createSignedUrl(b.details.document_path,120);if(error)submitMsg(error.message,'error');else if(data?.signedUrl)window.open(data.signedUrl,'_blank','noopener,noreferrer')}}>Apri scheda allegata <ExternalLink size={14}/></button>}
     <div className="request-footer"><div className="request-source"><Tag size={14}/>{sources[b.source]||b.source}{b.promo_code&&` · ${b.promo_code}`}</div>{s?.kind==='quote'?<><div className="field"><span>Il tuo preventivo (€)</span><input type="number" min="1" step="0.01" value={quoteValues[b.id]||''} onChange={e=>setQuoteValues(v=>({...v,[b.id]:e.target.value}))} placeholder="Es. 65.00"/></div><Button disabled={busy} onClick={()=>void coachAction(b,'quote')}>INVIA PREVENTIVO <ArrowRight size={15}/></Button></>:<><div className="payment-setting"><span>Pagamento:</span><select value={b.payment_mode} disabled={busy||!['online','in_person'].includes(b.payment_mode)} onChange={e=>void setPaymentMode(b,e.target.value as 'online'|'in_person')}><option value="online">Anticipato online</option>{c?.allow_in_person&&<option value="in_person">Di persona</option>}{b.payment_mode==='none'&&<option value="none">Gratuito</option>}{b.payment_mode==='credit'&&<option value="credit">Credito</option>}</select></div><div className="actions"><Button variant="outline" disabled={busy} onClick={()=>void coachAction(b,'reject')}>RIFIUTA <X size={15}/></Button><Button disabled={busy} onClick={()=>void coachAction(b,'approve')}>APPROVA <Check size={16}/></Button></div></>}</div></article>})}</section>}
   {coachTab==='agenda'&&<section className="coach-content"><Title eyebrow="CALENDARIO" sub="Le lezioni confermate e i pagamenti in sede.">LA TUA AGENDA</Title>{futureBookings.length===0?<Empty title="Agenda libera" desc="Qui compariranno le lezioni confermate."/>:futureBookings.map(b=><article key={b.id} className="agenda-card"><div className="agenda-day"><strong>{b.starts_at?dateLabel(b.starts_at):'Da definire'}</strong><span>{b.starts_at?timeLabel(b.starts_at):'--:--'}</span></div><div className="agenda-detail"><b>{services.find(s=>s.id===b.service_id)?.name}</b><span>{clients.find(c=>c.id===b.client_id)?.full_name||'Cliente'} · {venues.find(v=>v.id===b.venue_id)?.name}</span><span>{b.payment_mode==='in_person'&&b.payment_status==='due_in_person'?'Da incassare in palestra':b.payment_status==='paid'?'Pagata':b.payment_mode==='credit'?'Credito usato':'Gratuita'}</span></div>{b.payment_mode==='in_person'&&b.payment_status==='due_in_person'&&<Button variant="outline" disabled={busy} onClick={()=>void inPersonPaid(b)}>SEGNA PAGATA</Button>}</article>)}</section>}
   {coachTab==='clients'&&<section className="coach-content"><Title eyebrow="RELAZIONI" sub="Puoi autorizzare ogni cliente al pagamento in presenza.">I TUOI CLIENTI</Title><div className="info-panel"><LockKeyhole size={18}/><p>Per impostazione predefinita ogni nuovo cliente deve pagare online. L'interruttore cambia solo il permesso del cliente selezionato.</p></div>{clients.length===0?<Empty title="Nessun cliente registrato" desc="I nuovi iscritti compariranno qui."/>:clients.map(c=><div className="client-row" key={c.id}><div className="mini-avatar">{c.full_name.charAt(0)||'C'}</div><div className="client-row-info"><b>{c.full_name||'Cliente'}</b><small>{c.email}</small><span>{c.allow_in_person?'Fidelizzato · può pagare in palestra':'Pagamento anticipato obbligatorio'}</span></div><button type="button" className={`switch ${c.allow_in_person?'on':''}`} aria-label={`Pagamento in presenza per ${c.full_name}`} role="switch" aria-checked={c.allow_in_person} disabled={busy} onClick={()=>void setInPerson(c,!c.allow_in_person)}><i/></button></div>)}</section>}
   {coachTab==='hours'&&<section className="coach-content"><Title eyebrow="DISPONIBILITÀ">ORARI SETTIMANALI</Title><p className="section-intro">Gli slot mostrati ai clienti dipendono da queste fasce orarie e dalle lezioni già prenotate. Una lezione occupa tempo in entrambe le sedi.</p>{hours.map(h=><div className="hour-card" key={h.weekday}><div><b>{dayNames[h.weekday-1]}</b><label className="check-row tiny"><input type="checkbox" checked={h.is_open} onChange={e=>void updateHours(h,{is_open:e.target.checked})}/> Aperto</label></div><div className="hour-times"><label>Da <select disabled={!h.is_open} value={h.start_hour} onChange={e=>void updateHours(h,{start_hour:Math.min(Number(e.target.value),h.end_hour-1)})}>{Array.from({length:17},(_,i)=>i+6).map(x=><option key={x} value={x}>{String(x).padStart(2,'0')}:00</option>)}</select></label><label>A <select disabled={!h.is_open} value={h.end_hour} onChange={e=>void updateHours(h,{end_hour:Math.max(Number(e.target.value),h.start_hour+1)})}>{Array.from({length:17},(_,i)=>i+7).map(x=><option key={x} value={x}>{String(x).padStart(2,'0')}:00</option>)}</select></label></div></div>)}</section>}
   {coachTab==='services'&&<section className="coach-content"><Title eyebrow="LISTINO" sub="Prezzi e disponibilità dei servizi.">SERVIZI</Title>{services.map(s=><div key={s.id} className="admin-product"><div><b>{s.name}</b><small>{s.kind==='quote'?'Su preventivo':`${s.duration_minutes} min`}</small></div><div className="product-actions">{s.kind==='paid'&&<label>€ <input type="number" min="0" step="0.5" defaultValue={s.price_cents/100} onBlur={e=>{const price=Math.round(Number(e.target.value)*100);if(price>=0&&price!==s.price_cents)void updateService(s,{price_cents:price})}}/></label>}<button type="button" role="switch" aria-label={`Servizio ${s.name} attivo`} aria-checked={s.active} className={`switch ${s.active?'on':''}`} onClick={()=>void updateService(s,{active:!s.active})}><i/></button></div></div>)}<Title eyebrow="OFFERTE">PACCHETTI</Title>{packs.map(p=><div className="admin-product" key={p.id}><div><b>{p.name}</b><small>{p.credits} lezioni · {p.description}</small></div><div className="product-actions"><strong>{currency(p.price_cents)}</strong><span className="soft-tag">Stripe da collegare</span></div></div>)}<Title eyebrow="PROMOZIONI">CODICI SCONTO</Title>{codes.map(c=><div key={c.code} className="admin-product"><div><b>{c.code}</b><small>{c.percent_off}% · Validità {c.valid_days_from_contact||'nessun limite'} giorni</small></div><button role="switch" aria-checked={c.active} aria-label={`${c.code} attivo`} className={`switch ${c.active?'on':''}`} onClick={()=>void saveCode({...c,active:!c.active})}><i/></button></div>)}</section>}
   {coachTab==='marketing'&&<section className="coach-content"><Title eyebrow="CONDIVISIONE" sub="QR code, link e codice promozionale pronti da condividere.">QR CODE E LINK</Title><div className="qr-card"><div className="qr-image">{qr?<img src={qr} alt={`QR per accedere all'app con codice ${promo}`}/>:<QrCode size={75}/>}</div><div><h3>QR CODE PRENOTAZIONI</h3><p>Mostra o condividi il QR per aprire l'app con il codice promozionale già inserito.</p>{qr&&<a className="button button-outline" href={qr} download="ale-coach-qr.png">SCARICA QR <ArrowRight size={15}/></a>}</div></div><div className="marketing-link"><div><b>LINK DA CONDIVIDERE</b><small>{shareUrl}</small></div><button aria-label="Copia link" title="Copia link" onClick={()=>{void navigator.clipboard?.writeText(shareUrl);submitMsg('Link copiato')}}><ExternalLink size={18}/></button></div><div className="marketing-link"><div><b>CODICE PROMOZIONALE</b><small>{promo} · 10% sulla prima lezione pagata, entro 7 giorni dal primo contatto.</small></div><button aria-label="Copia codice promozionale" title="Copia codice promozionale" onClick={()=>{void navigator.clipboard?.writeText(promo);submitMsg('Codice copiato')}}><Tag size={18}/></button></div></section>}
   <div className="coach-footer-note"><Settings2 size={15}/> Pannello riservato al coach. Autorizzazioni verificate dal database in modalità reale.</div>
  </main>}
  </>}
  <footer className="site-footer"><div><Logo small/><span>NON BASTA ALLENARSI. CONTA COME LO FAI.</span></div><p>© 2026 Ale Coach · Roma Talenti e Nuovo Salario</p><p className="developer">Sviluppato da <a href="https://www.instagram.com/mattiacucuzza_/" target="_blank" rel="noreferrer">Mattia Cucuzza <Instagram size={13}/></a></p></footer>
  {ready&&<div className="readiness-note">{onlineReady?<><CheckCircle2 size={14}/> Servizio dati collegato</>:null}</div>}
 </div>
}
export default App;
