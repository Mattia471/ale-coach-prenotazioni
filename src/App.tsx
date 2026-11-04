import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { ArrowLeft, ArrowRight, Bell, CalendarCheck, CalendarDays, Check, CheckCircle2, ChevronRight, CircleHelp, CreditCard, Dumbbell, ExternalLink, Gift, Instagram, LockKeyhole, LogOut, MapPin, Menu, MessageCircle, QrCode, Settings2, ShieldCheck, Sparkles, Tag, TicketPercent, UserRound, Users, Wallet, X, Zap } from 'lucide-react';
import type { Booking, ClientTab, CoachTab, Discount, Notice, Pack, PaymentMode, Profile, Service, Venue, Wallet as CreditWallet } from './types';
import { currency, dateLabel, nextDates, ready, sources, stateLabels, supabase, timeLabel, whatsappLink, formatStartMinute } from './lib';
import { blockUnreviewedLegal, internalQa, legal, legalPaths } from './legal';
import { serviceRules, packageRules } from './v2Catalog';

type Screen='landing'|'auth'|'client'|'coach';
type Step='details'|'when'|'review';
type WindowRow={id:number;weekday:number;venue_id:string;start_minute:number;end_minute:number;is_flexible:boolean;is_active:boolean};
type ClosureRow={id:number;start_date:string;end_date:string;reason:string;is_active:boolean;review_status:'proposed'|'confirmed'};
type CourseRow={id:number;title:string;venue_id:string|null;weekday:number|null;on_date:string|null;start_minute:number;end_minute:number;is_active:boolean;needs_review:boolean};
type ExternalRow={id:number;calendar_id:string;original_event_id:string;venue_id:string|null;starts_at:string;ends_at:string;is_course:boolean;blocks_booking:boolean;needs_review:boolean};
const asMinute=(value:string)=>{const [h,m]=value.split(':').map(Number);return h*60+m};

const disciplines=['Forza / Sala pesi','TRX','GRID','Calisthenics','HYROX','Flessibilità','Cross Active'];
const dayNames=['Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato','Domenica'];
const iconByService:Record<string,typeof Zap>={single:Zap,couple:Users,check:CalendarCheck,start:Dumbbell,intro:MessageCircle,other:Sparkles};
const promo='ALECOACH15';
const fromUrl=()=>{const q=new URLSearchParams(location.search);return {source:q.get('source')||'direct',code:(q.get('code')||'').toUpperCase(),referral:q.get('ref')||''};};
const errorText=(e:unknown)=>e instanceof Error?e.message:typeof e==='object'&&e&&'message' in e?String(e.message):'Operazione non riuscita';
function Logo({small=false}:{small?:boolean}){return <div className={`brand ${small?'brand-small':''}`}><span>///</span> ALE <b>COACH</b></div>}
function Button({children,variant='primary',disabled=false,onClick,type='button',className=''}:{children:ReactNode;variant?:'primary'|'outline'|'quiet'|'dark';disabled?:boolean;onClick?:()=>void;type?:'button'|'submit';className?:string}){return <button type={type} onClick={onClick} disabled={disabled} className={`button button-${variant} ${className}`}>{children}</button>}
function Title({eyebrow,children,sub}:{eyebrow?:string;children:ReactNode;sub?:string}){return <div className="title-block">{eyebrow&&<div className="eyebrow"><span>///</span> {eyebrow}</div>}<h2>{children}</h2>{sub&&<p>{sub}</p>}</div>}
function Status({status}:{status:Booking['status']}){return <span className={`state state-${status}`}><i/>{stateLabels[status]}</span>}
function Labeled({label,children,required=false}:{label:string;children:ReactNode;required?:boolean}){return <label className="field"><span>{label}{required?' *':''}</span>{children}</label>}
function Empty({title,desc}:{title:string;desc:string}){return <div className="empty-state"><CalendarDays size={31}/><h3>{title}</h3><p>{desc}</p></div>}
function alertTitle(mode:'ok'|'error'|'info'){return mode==='error'?<CircleHelp size={18}/>:mode==='ok'?<CheckCircle2 size={18}/>:<Sparkles size={18}/>}
// Foto tratta dalla scheda professionale pubblica Virgin Active.
// Prima del lancio commerciale, il titolare deve confermare il diritto d'uso
// oppure sostituirla con uno scatto autorizzato di Alessandro.
const coachPortraitUrl='https://www.virginactive.it/images/default-source/trainers/3efbdbad-e9b7-4fc7-987b-c243786b410d_web-jpg.jpg?sfvrsn=8e7cbf83_2';
const coachProfessionalProfile='https://www.virginactive.it/people/alessandro--cola-a-cola';

function CoachPhoto({avatar=false}:{avatar?:boolean}){
 const [unavailable,setUnavailable]=useState(false);
 return unavailable
  ? <span className={avatar?'coach-photo-fallback coach-photo-fallback-avatar':'coach-photo-fallback'} aria-label="Alessandro Cola">AC</span>
  : <img className={avatar?'coach-photo-avatar':'coach-photo-image'}
    src={coachPortraitUrl}
    alt="Alessandro Cola, personal trainer"
    loading={avatar?'eager':'lazy'}
    decoding="async"
    onError={()=>setUnavailable(true)}/>;
}

function CoachIntroduction({compact=false}:{compact?:boolean}){
 return <section className={`coach-introduction ${compact?'coach-introduction-compact':''}`}
    aria-label="Conosci il personal trainer Alessandro Cola">
  <div className="coach-introduction-portrait">
   <CoachPhoto/>
   <span className="coach-introduction-portrait-badge">IL TUO COACH</span>
  </div>
  <div className="coach-introduction-content">
   <div className="eyebrow">/// PRIMA DI TUTTO, LA PERSONA</div>
   <h2>CONOSCI <em>ALE.</em></h2>
   <p>Alessandro Cola ti segue di persona, con un allenamento costruito sui tuoi obiettivi. Specializzato in forza, allenamento funzionale e preparazione atletica.</p>
   <div className="coach-introduction-tags"><span>Scienze Motorie</span><span>Forza &amp; TRX</span><span>Preparazione atletica</span></div>
   <a className="coach-introduction-link" href={coachProfessionalProfile}
      target="_blank" rel="noopener noreferrer">Scopri il profilo professionale <ExternalLink size={14}/></a>
  </div>
 </section>;
}

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
 const [services,setServices]=useState<Service[]>([]);
 const [venues,setVenues]=useState<Venue[]>([]);
 const [availabilityWindows,setAvailabilityWindows]=useState<WindowRow[]>([]);
 const [closures,setClosures]=useState<ClosureRow[]>([]);
 const [courseBlocks,setCourseBlocks]=useState<CourseRow[]>([]);
 const [externalEvents,setExternalEvents]=useState<ExternalRow[]>([]);
 const [calendarSync,setCalendarSync]=useState<{status:string;last_success_at:string|null;last_error:string|null}|null>(null);
 const [newWindow,setNewWindow]=useState({weekday:1,venue_id:'talenti',start_minute:540,end_minute:600,is_flexible:false});

 const [packs,setPacks]=useState<Pack[]>([]);
 const [codes,setCodes]=useState<Discount[]>([{code:promo,percent_off:15,active:true,uses:0,first_purchase_only:true,valid_days_from_contact:null}]);
 const [bookings,setBookings]=useState<Booking[]>([]);
 const [clients,setClients]=useState<Profile[]>([]);
 const [notices,setNotices]=useState<Notice[]>([]);
 const [wallets,setWallets]=useState<CreditWallet[]>([]);
 const [selectedService,setSelectedService]=useState<Service|null>(null);
 const [step,setStep]=useState<Step>('details');
 const [selectedDay,setSelectedDay]=useState('');
 const [selectedHour,setSelectedHour]=useState<number|null>(null);
 const [selectedVenue,setSelectedVenue]=useState('talenti');
 const [venuePreference,setVenuePreference]=useState('indifferente');
 const [selectedMode,setSelectedMode]=useState<PaymentMode>('online');
 const [bookingDetails,setBookingDetails]=useState<Record<string,string>>({});
 const [privacyNoticeSeen,setPrivacyNoticeSeen]=useState(false);
 const [promoInput,setPromoInput]=useState('');
 const [availableHours,setAvailableHours]=useState<{start_minute:number;venue_id:string}[]>([]);
 const [holdUntil,setHoldUntil]=useState<string|null>(null);
 const [quoteValues,setQuoteValues]=useState<Record<string,string>>({});
 const [qr,setQr]=useState('');
 const [allowMenu,setAllowMenu]=useState(false);
 const [pushEnabled,setPushEnabled]=useState(false);
 const [pushBannerDismissed,setPushBannerDismissed]=useState(false);
 const [pushPromptState,setPushPromptState]=useState<'checking'|'available'|'needs-install'|'blocked'|'unsupported'>('checking');
 const [pushBusy,setPushBusy]=useState(false);
 const [passwordRecovery,setPasswordRecovery]=useState(false);
 const [newPassword,setNewPassword]=useState('');
 const [confirmPassword,setConfirmPassword]=useState('');
 const [termsOk,setTermsOk]=useState(false);
 const attrib=useRef(fromUrl());
 const pendingAction=useRef<string|null>(null);
 const passwordRecoveryPending=useRef(false);
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
   if(!authUser){passwordRecoveryPending.current=false;setPasswordRecovery(false);setProfile(null);setScreen('landing');setBooting(false);return;}
   const {data,error}=await api.from('profiles').select('*').eq('id',authUser.id).single();
   if(!active)return;
   if(error){submitMsg('Profilo non disponibile: '+error.message,'error');setBooting(false);return;}
   const p=data as Profile;
   setProfile(p);setScreen(passwordRecoveryPending.current?'auth':p.role==='coach'?'coach':'client');setBooting(false);
  };
  api.auth.getUser().then(({data})=>sync(data.user)).catch(()=>setBooting(false));
  const {data:{subscription}}=api.auth.onAuthStateChange((event,session)=>{
   if(event==='PASSWORD_RECOVERY'){
    passwordRecoveryPending.current=true;
    setPasswordRecovery(true);
    setAuthMode('reset');
    setScreen('auth');
   }
   void sync(session?.user??null);
  });
  return()=>{active=false;subscription.unsubscribe()};
 },[]);
 useEffect(()=>{
  if(!supabase)return;
  const api=supabase;
  void Promise.all([
   api.from('services').select('*').order('sort_order'),
   api.from('venues').select('*'),
   api.from('packages').select('*').order('sort_order')
  ]).then(([s,v,p])=>{if(!s.error)setServices(s.data as Service[]);if(!v.error)setVenues(v.data as Venue[]);if(!p.error)setPacks(p.data as Pack[])});
 },[]);
 useEffect(()=>{void refresh()},[refresh]);
 useEffect(()=>{
  if(!profile||!supabase)return;
  const params=new URLSearchParams(window.location.search);
  const payment=params.get('payment');
  if(!payment)return;
  if(payment==='authorized'){
   setScreen(profile.role==='coach'?'coach':'client');
   setClientTab('bookings');
   submitMsg('Stripe ha ricevuto la tua autorizzazione di prova. La richiesta arriverà ad Ale dopo la verifica del webhook; nessun importo è stato incassato.','info');
   void refresh();
   const timer=window.setInterval(()=>void refresh(),3000);
   const stop=window.setTimeout(()=>window.clearInterval(timer),30000);
   window.history.replaceState({},'',window.location.pathname);
   return()=>{window.clearInterval(timer);window.clearTimeout(stop)};
  }
  if(payment==='cancelled'){
   setScreen(profile.role==='coach'?'coach':'client');
   setClientTab('bookings');
   submitMsg('Checkout interrotto. La richiesta non è stata inviata ad Ale: puoi riprendere o annullare l’autorizzazione.','info');
   window.history.replaceState({},'',window.location.pathname);
  }
  if(payment==='success'){
   setScreen(profile.role==='coach'?'coach':'client');
   setClientTab('bookings');
   submitMsg('Pagamento Stripe ricevuto. Attendi la conferma del server nella sezione Prenotazioni.','info');
   void refresh();
   window.history.replaceState({},'',window.location.pathname);
  }
 },[profile?.id,refresh]);

 useEffect(()=>{
  if(!supabase||!user)return;
  const c=supabase.channel('ale-realtime-'+user.id).on('postgres_changes',{event:'*',schema:'public',table:'bookings'},()=>{void refresh()}).on('postgres_changes',{event:'INSERT',schema:'public',table:'notifications',filter:`recipient_id=eq.${user.id}`},()=>{void refresh()}).subscribe();
  return()=>{void supabase!.removeChannel(c)};
 },[user,refresh]);
 useEffect(()=>{
  // Non spostare la viewport durante l'editing: su iPhone la tastiera
  // virtuale puo' perdere il campo attivo quando si ricalcola la pagina.
  const focused=document.activeElement;
  if(focused instanceof HTMLElement&&focused.isConnected&&focused.matches('input,textarea,select'))return;
  window.scrollTo({top:0,behavior:'auto'});
 },[screen,clientTab,coachTab,step,selectedService]);
 useEffect(()=>{
  if(!supabase||!selectedService||selectedService.kind==='quote'||!selectedDay)return;
  let active=true;
  void supabase.rpc('available_slots_v2',{
   p_service_id:selectedService.id,p_day:selectedDay,p_venue_preference:venuePreference
  }).then(({data,error})=>{
   if(active){
    setAvailableHours(error?[]:(data||[]).map((x:{start_minute:number;venue_id:string})=>x).filter((x:{start_minute:number;venue_id:string},i:number,arr:{start_minute:number;venue_id:string}[])=>arr.findIndex(y=>y.start_minute===x.start_minute&&y.venue_id===x.venue_id)===i));
    if(error)submitMsg(error.message,'error');
   }
  });
  return()=>{active=false};
 },[selectedService,selectedDay,venuePreference,bookings]);
 useEffect(()=>{
  if(!supabase||profile?.role!=='coach'||coachTab!=='hours')return;
  let live=true;
  void Promise.all([
   supabase.from('availability_windows').select('*').order('weekday').order('start_minute'),
   supabase.from('calendar_closures').select('*').order('start_date'),
   supabase.from('google_calendar_sync').select('status,last_success_at,last_error').eq('id',1).maybeSingle(),
   supabase.from('calendar_course_blocks').select('*').order('weekday').order('on_date'),
   supabase.from('external_calendar_events').select('id,calendar_id,original_event_id,venue_id,starts_at,ends_at,is_course,blocks_booking,needs_review')
    .gte('ends_at',new Date().toISOString()).order('starts_at').limit(100)
  ]).then(([w,cl,sync,course,events])=>{
    if(!live)return;
    if(!w.error)setAvailabilityWindows((w.data||[]) as WindowRow[]);
    if(!cl.error)setClosures((cl.data||[]) as ClosureRow[]);
    if(!sync.error)setCalendarSync(sync.data);
    if(!course.error)setCourseBlocks((course.data||[]) as CourseRow[]);
    if(!events.error)setExternalEvents((events.data||[]) as ExternalRow[]);
  });
  return()=>{live=false};
 },[profile?.id,profile?.role,coachTab]);
 useEffect(()=>{if(coachTab!=='marketing')return;void import('qrcode').then(({default:QRCode})=>QRCode.toDataURL(`${location.origin}/?source=club&code=${promo}`,{width:320,margin:2,color:{dark:'#1b1515',light:'#ffffff'}})).then(setQr).catch(()=>setQr(''))},[coachTab]);
 const googleLogin=async()=>{
  if(!privacyNoticeSeen){submitMsg('Prima di usare Google, prendi visione dell’informativa privacy.','info');return}
  if(blockUnreviewedLegal){submitMsg('Registrazioni non ancora attive: informativa privacy in revisione.','error');return}
  if(!supabase){submitMsg('Google OAuth disponibile dopo la configurazione Supabase.','info');return}
  const {error}=await supabase.auth.signInWithOAuth({provider:'google',options:{redirectTo:location.origin}});
  if(error)submitMsg(error.message,'error');
 };
 const logout=async()=>{if(supabase)await supabase.auth.signOut();passwordRecoveryPending.current=false;setPasswordRecovery(false);setUser(null);setProfile(null);setSelectedService(null);setScreen('landing');setClientTab('home');setCoachTab('overview')};
 const completePasswordRecovery=async(e:React.FormEvent)=>{
  e.preventDefault();
  if(!supabase||!user){submitMsg('Link di recupero non valido o scaduto. Richiedine uno nuovo.','error');return}
  if(newPassword.length<8){submitMsg('La nuova password deve contenere almeno 8 caratteri.','error');return}
  if(newPassword!==confirmPassword){submitMsg('Le due password non coincidono.','error');return}
  setBusy(true);
  try{
   const {error}=await supabase.auth.updateUser({password:newPassword});
   if(error)throw error;
   passwordRecoveryPending.current=false;
   setPasswordRecovery(false);
   setNewPassword('');setConfirmPassword('');
   setScreen(profile?.role==='coach'?'coach':'client');
   submitMsg('Password aggiornata. Ora puoi utilizzare il tuo account.');
  }catch(e){submitMsg(errorText(e),'error')}finally{setBusy(false)}
 };
 const authenticate=async(e:React.FormEvent)=>{
  e.preventDefault();if(!supabase){submitMsg('Configura Supabase per attivare la registrazione.','error');return}
  if(authMode==='signup'&&!authForm.name.trim()){submitMsg('Inserisci nome e cognome.','error');return}
  if(authMode==='signup'&&!privacyNoticeSeen){submitMsg('Leggi l’informativa privacy prima di creare il profilo.','error');return}
  if(authMode==='signup'&&blockUnreviewedLegal){submitMsg('Registrazioni non attive: informative e dati legali del titolare non ancora approvati.','error');return}
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
 const beginBooking=(s:Service)=>{pendingAction.current=s.id;setSelectedService(s);setStep(s.kind==='free'?'when':'details');setSelectedDay('');setSelectedHour(null);setHoldUntil(null);setSelectedMode('online');setSelectedVenue('talenti');setVenuePreference('indifferente');setBookingDetails({});setTermsOk(false);setPromoInput(attrib.current.code===promo?promo:'');if(!profile){setScreen('auth');setAuthMode('signin')}};
 const finishWizard=()=>{setSelectedService(null);setHoldUntil(null);setStep('details');setClientTab('bookings');void refresh()};
 const releaseHold=()=>{setHoldUntil(null);if(supabase&&profile)void supabase.rpc('release_slot_hold_v2')};
 const chooseSlot=async(slot:{start_minute:number;venue_id:string})=>{
  if(!selectedService)return;
  if(!supabase)return;
  setBusy(true);
  try{
   const {data,error}=await supabase.rpc('reserve_slot_v2',{
    p_service_id:selectedService.id,p_day:selectedDay,p_start_minute:slot.start_minute,p_venue_id:slot.venue_id
   });
   if(error)throw error;
   setHoldUntil(String(data));setSelectedHour(slot.start_minute);setSelectedVenue(slot.venue_id);
   submitMsg('Orario riservato per 10 minuti. Completa la richiesta.');
  }catch(error){submitMsg(errorText(error),'error');setSelectedHour(null);setHoldUntil(null)}
  finally{setBusy(false)}
 };

 const changeProfile=async(patch:Partial<Pick<Profile,'full_name'|'phone'|'virgin_member'>>)=>{
  if(!profile)return;
  if(!supabase)return;
  setBusy(true);const {error}=await supabase.from('profiles').update(patch).eq('id',profile.id);setBusy(false);
  if(error){submitMsg(error.message,'error');return}setProfile({...profile,...patch});submitMsg('Profilo aggiornato');
 };
 const exportMyData=async()=>{
  if(!profile||!supabase){submitMsg('L’esportazione dati è disponibile solo con un account reale.','info');return}
  setBusy(true);
  try{
   const [p,b,w,n,devices]=await Promise.all([
    supabase.from('profiles').select('*').eq('id',profile.id),
    supabase.from('bookings').select('*').eq('client_id',profile.id),
    supabase.from('wallet_credits').select('*').eq('client_id',profile.id),
    supabase.from('notifications').select('*').eq('recipient_id',profile.id),
    supabase.from('push_subscriptions').select('id,endpoint,created_at').eq('user_id',profile.id),
   ]);
   for(const result of [p,b,w,n,devices])if(result.error)throw result.error;
   const json=JSON.stringify({
    esportato_il:new Date().toISOString(),
    titolare:legal.controllerName||'Ale Coach',
    nota:'Copia dei principali dati presenti in app. Per una richiesta completa ex art. 15 GDPR contatta il titolare.',
    profilo:p.data,prenotazioni:b.data,pacchetti_e_crediti:w.data,
    notifiche:n.data,dispositivi_push:devices.data,
   },null,2);
   const url=URL.createObjectURL(new Blob([json],{type:'application/json;charset=utf-8'}));
   const link=document.createElement('a');
   link.href=url;link.download=`ale-coach-dati-${new Date().toISOString().slice(0,10)}.json`;
   document.body.append(link);link.click();link.remove();
   window.setTimeout(()=>URL.revokeObjectURL(url),5000);
   submitMsg('Esportazione completata: conserva il file in un luogo sicuro.');
  }catch(e){submitMsg(errorText(e),'error')}finally{setBusy(false)}
 };
 const saveBooking=async()=>{
  if(!profile||!selected)return;
  if(!profile.virgin_member){submitMsg('Serve l’iscrizione a Virgin Active.','error');return}
  if(selected.kind!=='quote'&&(!selectedDay||selectedHour===null)){submitMsg('Seleziona giorno e orario.','error');return}
  if(selected.id==='couple'&&!bookingDetails.partner?.trim()){submitMsg('Inserisci il nome del partner.','error');return}
  
  if(selected.id==='other'&&!bookingDetails.description?.trim()){submitMsg('Descrivi la richiesta.','error');return}
  if(!termsOk){submitMsg('Accetta le condizioni di prenotazione.','error');return}
  if(blockUnreviewedLegal){submitMsg('Prenotazioni non attive: informative legali non ancora approvate.','error');return}
  if(!supabase)return;
  setBusy(true);
  try{
   const details={...bookingDetails};
   const {data:bookingId,error}=await supabase.rpc('create_booking_v2',{p_service_id:selected.id,p_venue_id:selectedVenue,p_day:selected.kind==='quote'?null:selectedDay,p_start_minute:selected.kind==='quote'?null:selectedHour,p_details:details,p_payment_mode:selected.kind==='free'||selected.kind==='quote'?'none':selectedMode,p_code:promoInput.toUpperCase().trim()||null,p_source:attrib.current.source,p_referral:attrib.current.referral||null});
   if(error)throw error;
   if(selected.kind==='paid'&&selectedMode==='online'){
    if(!bookingId)throw new Error('Prenotazione non registrata');
    finishWizard();
    // Il coach NON vede la richiesta finche' Stripe non conferma la carta.
    const {data:checkout,error:checkoutError}=await supabase.functions.invoke('create-checkout',{
     body:{bookingId}
    });
    if(checkoutError||!checkout?.url)
     throw new Error(checkout?.error||checkoutError?.message||'Autorizzazione non disponibile: apri Prenotazioni per riprovare.');
    if(!String(checkout.url).startsWith('https://checkout.stripe.com/'))
     throw new Error('URL checkout non attendibile');
    location.assign(checkout.url);
    return;
   }
   submitMsg('Richiesta inviata. Ale riceverà una notifica e potrà approvarla.');finishWizard();
  }catch(e){submitMsg(errorText(e),'error')}finally{setBusy(false)}
 };
 const coachAction=async(b:Booking,action:'approve'|'reject'|'quote')=>{
  setBusy(true);
  try{
   if(!supabase)throw new Error('Supabase non configurato');
   const cents=action==='quote'?Math.round(Number(quoteValues[b.id])*100):null;
   if(action==='quote'&&(!cents||cents<=0)){submitMsg('Inserisci un prezzo valido.','error');setBusy(false);return}
   if(b.payment_mode==='online'&&action!=='quote'){
    const {data,error}=await supabase.functions.invoke('decide-booking',{
     body:{bookingId:b.id,action}
    });
    if(error||data?.error)throw new Error(data?.error||error?.message||'Errore nella riconciliazione Stripe');
   }else{
    const {error}=await supabase.rpc('coach_decide_booking',{p_booking_id:b.id,p_action:action,p_quote_cents:cents});
    if(error)throw error;
   }
   submitMsg(action==='reject'?'Richiesta rifiutata':action==='quote'?'Preventivo inviato':'Richiesta approvata');void refresh();
  }catch(e){submitMsg(errorText(e),'error')}finally{setBusy(false)}
 };
 const setPaymentMode=async(b:Booking,mode:'online'|'in_person')=>{
  if(!supabase)return;
  const {error}=await supabase.rpc('coach_set_booking_method',{p_booking_id:b.id,p_mode:mode});if(error)submitMsg(error.message,'error');else void refresh();
 };
 const setInPerson=async(c:Profile,allow:boolean)=>{
  setBusy(true);
  try{
   if(!supabase)throw new Error('Supabase non configurato');
   const {error}=await supabase.rpc('coach_set_in_person',{p_client_id:c.id,p_allowed:allow});
   if(error)throw error;
   setClients(v=>v.map(x=>x.id===c.id?{...x,allow_in_person:allow}:x));submitMsg(allow?'Pagamento in palestra abilitato':'Pagamento in palestra disabilitato');void refresh();
  }catch(e){submitMsg(errorText(e),'error')}finally{setBusy(false)}
 };
 const buyPackage=async(p:Pack)=>{
  if(!profile){setScreen('auth');setAuthMode('signup');return}
  if(p.type==='subscription'){submitMsg('Gli abbonamenti mensili saranno attivati dopo la configurazione Stripe.','info');return}
  if(!profile.virgin_member){submitMsg('Conferma prima l’iscrizione Virgin Active nel tuo profilo.','error');return}
  if(!supabase){submitMsg('Checkout non disponibile: Stripe non è ancora configurato.','info');return}
  setBusy(true);
  try{const {data,error}=await supabase.functions.invoke('create-checkout',{body:{packageId:p.id}});if(error||!data?.url)throw Error(data?.error||error?.message||'Checkout non disponibile');location.assign(data.url)}catch(e){submitMsg(errorText(e),'error')}finally{setBusy(false)}
 };
 const payBooking=async(b:Booking)=>{
  if(!supabase){submitMsg('Checkout non disponibile: Stripe non è ancora configurato.','info');return}
  setBusy(true);
  try{const {data,error}=await supabase.functions.invoke('create-checkout',{body:{bookingId:b.id}});if(error)throw error;if(!data?.url||!String(data.url).startsWith('https://checkout.stripe.com/'))throw Error(data?.error||'Checkout non configurato');location.assign(data.url)}catch(e){submitMsg(errorText(e),'error')}finally{setBusy(false)}
 };
 const cancelBooking=async(b:Booking)=>{
  if(!confirm('Vuoi disdire questa prenotazione?'))return;
  setBusy(true);
  try{
   if(!supabase)throw new Error('Supabase non configurato');
   if(b.payment_mode==='online'){
    const {data,error}=await supabase.functions.invoke('cancel-booking',{body:{bookingId:b.id}});if(error||data?.error)throw Error(data?.error||error?.message||'Rimborso non riuscito');
   }else{const {error}=await supabase.rpc('cancel_unpaid_booking',{p_booking_id:b.id});if(error)throw error}
   submitMsg('Prenotazione disdetta');void refresh();
  }catch(e){submitMsg(errorText(e),'error')}finally{setBusy(false)}
 };
 const inPersonPaid=async(b:Booking)=>{
  setBusy(true);try{
   if(!supabase)throw new Error('Supabase non configurato');
   const {error}=await supabase.rpc('coach_mark_in_person_paid',{p_booking_id:b.id});if(error)throw error;
   submitMsg('Pagamento in presenza registrato');void refresh();
  }catch(e){submitMsg(errorText(e),'error')}finally{setBusy(false)}
 };
 const markNotices=async()=>{
  const unreadList=myNotices.filter(n=>!n.read_at);setNotices(v=>v.map(n=>n.recipient_id===profile?.id?{...n,read_at:n.read_at||new Date().toISOString()}:n));
  if(supabase)for(const n of unreadList)await supabase.from('notifications').update({read_at:new Date().toISOString()}).eq('id',n.id);
 };
 useEffect(()=>{
  // Mostra il banner gia' al primo avvio dopo login, ma non richiedere
  // automaticamente permessi: iOS/Chrome lo consentono solo dopo un tap.
  let active=true;
  setPushBannerDismissed(false);
  setPushEnabled(false);
  if(!profile?.id)return;
  const isIos=/iPad|iPhone|iPod/.test(navigator.userAgent)
   ||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  const standalone=window.matchMedia('(display-mode: standalone)').matches
   ||Boolean((navigator as Navigator & {standalone?:boolean}).standalone);
  if(isIos&&!standalone){
   setPushPromptState('needs-install');return;
  }
  if(!('Notification' in window)||!('serviceWorker' in navigator)||!('PushManager' in window)){
   setPushPromptState('unsupported');return;
  }
  if(Notification.permission==='denied'){
   setPushPromptState('blocked');return;
  }
  setPushPromptState('available');
  void (async()=>{
   try{
    const reg=await navigator.serviceWorker.getRegistration();
    const subscription=reg?await reg.pushManager.getSubscription():null;
    if(!active||!subscription||Notification.permission!=='granted'||!supabase)return;
    const {data}=await supabase.from('push_subscriptions').select('id')
     .eq('user_id',profile.id).eq('endpoint',subscription.endpoint).maybeSingle();
    if(active&&data)setPushEnabled(true);
   }catch{
    // In mancanza di subscription resta visibile l'invito.
   }
  })();
  return()=>{active=false};
 },[profile?.id]);
 const subscribePush=async()=>{
  if(!supabase||!profile){submitMsg('Accedi al tuo account per attivare le notifiche.','info');return}
  const isIos=/iPad|iPhone|iPod/.test(navigator.userAgent)
   ||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  const standalone=window.matchMedia('(display-mode: standalone)').matches
   ||Boolean((navigator as Navigator & {standalone?:boolean}).standalone);
  if(isIos&&!standalone){
   setPushPromptState('needs-install');
   submitMsg('Su iPhone: apri il sito in Safari, premi Condividi → Aggiungi alla schermata Home; apri l’icona Ale Coach e attiva le notifiche.','info');
   return;
  }
  if(!('Notification' in window)||!('serviceWorker' in navigator)||!('PushManager' in window)){
   setPushPromptState('unsupported');
   submitMsg('Questo browser non supporta le notifiche push. Apri la PWA con Safari su iPhone o Chrome su Android.','info');
   return;
  }
  if(Notification.permission==='denied'){
   setPushPromptState('blocked');
   submitMsg('Notifiche bloccate: abilita Ale Coach dalle impostazioni del browser o del dispositivo.','info');
   return;
  }
  const key=String(import.meta.env.VITE_VAPID_PUBLIC_KEY||'').trim();
  if(!key){
   submitMsg('Servizio notifiche in configurazione: riprova dopo il prossimo aggiornamento dell’app.','info');
   return;
  }
  setPushBusy(true);
  try{
   // La richiesta di permesso e' immediata nel gesto dell'utente,
   // per compatibilita' con Safari iOS PWA e Chrome Android.
   const permission=Notification.permission==='granted'?'granted':await Notification.requestPermission();
   if(permission!=='granted'){
    if(permission==='denied')setPushPromptState('blocked');
    throw Error('Permesso non concesso: potrai abilitarlo in seguito dalle impostazioni.');
   }
   const registration=await navigator.serviceWorker.register('/sw.js');
   let subscription=await registration.pushManager.getSubscription();
   if(!subscription){
    const b64=key.replace(/-/g,'+').replace(/_/g,'/');
    const padded=b64.padEnd(Math.ceil(b64.length/4)*4,'=');
    const bytes=Uint8Array.from(atob(padded),ch=>ch.charCodeAt(0));
    subscription=await registration.pushManager.subscribe({
     userVisibleOnly:true,applicationServerKey:bytes
    });
   }
   const data=subscription.toJSON();
   if(!data.keys?.p256dh||!data.keys.auth)throw Error('Chiavi della sottoscrizione push non disponibili');
   const {error}=await supabase.from('push_subscriptions').upsert({
    user_id:profile.id,endpoint:subscription.endpoint,
    p256dh:data.keys.p256dh,auth_key:data.keys.auth
   },{onConflict:'endpoint'});
   if(error)throw error;
   setPushEnabled(true);
   setPushBannerDismissed(true);
   submitMsg('Notifiche push abilitate su questo dispositivo.');
  }catch(e){
   submitMsg(errorText(e),'error');
  }finally{setPushBusy(false)}
 };
 const updateService=async(s:Service,patch:Partial<Service>)=>{if(!supabase)return;const {error}=await supabase.from('services').update(patch).eq('id',s.id);if(error)submitMsg(error.message,'error');else setServices(rows=>rows.map(x=>x.id===s.id?{...x,...patch}:x))};
 const saveWindow=async(w:WindowRow,patch:Partial<WindowRow>)=>{
  if(!supabase)return;
  if((patch.start_minute!==undefined&&patch.start_minute%15!==0)||
     (patch.end_minute!==undefined&&patch.end_minute%15!==0)){
    submitMsg('Gli orari devono essere multipli di 15 minuti.','error');return;
  }
  const start=patch.start_minute??w.start_minute,end=patch.end_minute??w.end_minute;
  if(end<=start){submitMsg('La fine deve essere successiva all’inizio.','error');return}
  const {error}=await supabase.from('availability_windows').update(patch).eq('id',w.id);
  if(error){submitMsg(error.message,'error');return}
  setAvailabilityWindows(rows=>rows.map(x=>x.id===w.id?{...x,...patch}:x));
 };
 const createWindow=async()=>{
  if(!supabase)return;
  if(newWindow.start_minute%15||newWindow.end_minute%15||newWindow.end_minute<=newWindow.start_minute){
   submitMsg('Inserisci una finestra valida a intervalli di 15 minuti.','error');return;
  }
  const {data,error}=await supabase.from('availability_windows').insert({...newWindow,is_active:true}).select('*').single();
  if(error){submitMsg(error.message,'error');return}
  setAvailabilityWindows(v=>[...v,data as WindowRow].sort((a,b)=>a.weekday-b.weekday||a.start_minute-b.start_minute));
  submitMsg('Finestra aggiunta. Le disponibilità vengono ricalcolate dal server.');
 };
 const saveCourseBlock=async(row:CourseRow,patch:Partial<CourseRow>)=>{
  if(!supabase)return;
  const {error}=await supabase.from('calendar_course_blocks').update(patch).eq('id',row.id);
  if(error){submitMsg(error.message,'error');return}
  setCourseBlocks(rows=>rows.map(x=>x.id===row.id?{...x,...patch}:x));
 };
 const classifyExternal=async(row:ExternalRow,venue_id:string)=>{
  if(!supabase)return;
  const {error}=await supabase.rpc('coach_classify_external_event',{
   p_id:row.id,p_venue_id:venue_id,p_is_course:row.is_course,p_blocks_booking:row.blocks_booking
  });
  if(error){submitMsg(error.message,'error');return}
  setExternalEvents(rows=>rows.map(x=>x.id===row.id?{...x,venue_id,needs_review:false}:x));
  submitMsg('Sede evento verificata. L’agenda viene aggiornata dal server.');
 };
 const saveClosure=async(cl:ClosureRow,patch:Partial<ClosureRow>)=>{
  if(!supabase)return;
  const {error}=await supabase.from('calendar_closures').update(patch).eq('id',cl.id);
  if(error){submitMsg(error.message,'error');return}
  setClosures(rows=>rows.map(x=>x.id===cl.id?{...x,...patch}:x));
 };
 const saveCode=async(value:Discount)=>{if(!supabase)return;const {error}=await supabase.from('discount_codes').update({active:value.active,percent_off:value.percent_off}).eq('code',value.code);if(error)submitMsg(error.message,'error');else setCodes(rows=>rows.map(c=>c.code===value.code?value:c))};
 const activeServices=services.filter(s=>s.active).sort((a,b)=>a.sort_order-b.sort_order);
 const activePacks=packs.filter(p=>p.active).sort((a,b)=>a.sort_order-b.sort_order);
 const bookingForm=selected&&screen==='client'&&!isCoach;
 const cancelAllowed=(b:Booking)=>b.payment_mode==='online'&&(['authorizing','pending'].includes(b.status))
  ||Boolean(b.starts_at&&new Date(b.starts_at).getTime()-Date.now()>=24*3600000&&['pending','confirmed','awaiting_payment'].includes(b.status));
 const selectedPreviewAmount=selected?.price_cents||0;
 const discountPreview=selected?.id==='single'&&promoInput.trim().toUpperCase()===promo?15:0;
 const pendingBookings=bookings.filter(b=>
  (b.status==='pending'&&(b.payment_mode!=='online'||b.payment_status==='authorized'))
  ||(b.status==='processing'&&['approve','reject'].includes(b.stripe_decision||'')));
 const futureBookings=bookings.filter(b=>b.status==='confirmed'&&b.starts_at&&new Date(b.starts_at)>new Date()).sort((a,b)=>new Date(a.starts_at!).getTime()-new Date(b.starts_at!).getTime());
 const totalPaid=bookings.filter(b=>b.payment_status==='paid'&&b.payment_mode==='online').reduce((n,b)=>n+b.amount_cents,0);
 const inPersonTotal=bookings.filter(b=>b.payment_status==='due_in_person').reduce((n,b)=>n+b.amount_cents,0);
 const coachNav:{id:CoachTab;label:string}[]=[{id:'overview',label:'Dashboard'},{id:'requests',label:'Richieste'},{id:'agenda',label:'Agenda'},{id:'clients',label:'Clienti'},{id:'hours',label:'Orari'},{id:'services',label:'Listino'},{id:'marketing',label:'Marketing'}];
 const shareUrl=typeof window==='undefined'?'':`${window.location.origin}/?source=club&code=${promo}`;
 if(!ready||!supabase)return <main className="cloud-unavailable" role="alert"><Logo/><h1>Configurazione cloud non disponibile</h1><p>L'app richiede Supabase Cloud per accedere, prenotare e gestire le lezioni. Nessun dato simulato viene caricato.</p><a href="mailto:info@alecoach.online">Contatta info@alecoach.online</a></main>;
 return <div className={`app-shell ${screen==='coach'?'coach-shell':''}`}>
  {internalQa&&<div className="demo-environment-banner" role="status"><ShieldCheck size={15}/> COLLAUDO CLOUD RISERVATO · Solo account autorizzati. Pagamenti Stripe esclusivamente sandbox; nessun incasso reale. Non inserire dati sanitari o di terze persone.</div>}
  {profile&&!pushEnabled&&!pushBannerDismissed&&<section className="push-permission-banner" aria-label="Attivazione notifiche">
    <div className="push-permission-banner__body">
     <span className="push-permission-banner__icon"><Bell size={21}/></span>
     <div className="push-permission-banner__copy">
      <h3>{pushPromptState==='blocked'?'Notifiche disattivate':pushPromptState==='needs-install'?'Ricevi le notifiche su iPhone':pushPromptState==='unsupported'?'Notifiche non supportate':'Non perdere aggiornamenti e prenotazioni'}</h3>
      <p>{pushPromptState==='blocked'?'Il permesso è bloccato: puoi riattivarlo dalle impostazioni del dispositivo.':pushPromptState==='needs-install'?'Per attivarle, installa Ale Coach dalla schermata Home e riapri l’app.':pushPromptState==='unsupported'?'Utilizza un browser compatibile con le notifiche push.':'Attiva le notifiche per ricevere conferme, variazioni e aggiornamenti sulle tue lezioni.'}</p>
     </div>
    </div>
    <div className="push-permission-banner__actions">
     <Button variant="primary" disabled={pushBusy||pushPromptState==='checking'} onClick={()=>{
      if(pushPromptState==='needs-install')submitMsg('Su iPhone apri Ale Coach in Safari, tocca Condividi → Aggiungi alla schermata Home e avvia l’app dall’icona.','info');
      else if(pushPromptState==='blocked')submitMsg('Apri le impostazioni del dispositivo e consenti le notifiche per Ale Coach, quindi riavvia l’app.','info');
      else if(pushPromptState==='unsupported')submitMsg('Apri Ale Coach con Safari su iOS dalla schermata Home o Chrome su Android.','info');
      else void subscribePush();
     }}>{pushBusy?'ATTIVAZIONE...':pushPromptState==='needs-install'?'COME INSTALLARE':pushPromptState==='blocked'?'COME RIATTIVARE':pushPromptState==='unsupported'?'INFORMAZIONI':'ATTIVA NOTIFICHE'}</Button>
     <button type="button" className="push-permission-banner__dismiss" aria-label="Chiudi avviso notifiche" onClick={()=>setPushBannerDismissed(true)}><X size={17}/></button>
    </div>
   </section>}
  <header className="site-header"><div className="header-inner"><button aria-label="Vai alla home" className="logo-button" onClick={()=>{setSelectedService(null);setScreen(profile?(isCoach?'coach':'client'):'landing')}}><Logo small/></button>
   <div className="header-actions">{profile?<><span className="greeting">{isCoach?'Ciao Ale':`Ciao, ${profile.full_name.split(' ')[0]||'atleta'}`}</span><button className="icon-button" aria-label="Esci dall'account" onClick={()=>void logout()}><LogOut size={18}/></button></>:<Button variant="outline" onClick={()=>{setScreen('auth');setAuthMode('signin')}}>Accedi <ArrowRight size={15}/></Button>}</div></div></header>
  {message&&<div className={`flash flash-${message.mode}`} role="status">{alertTitle(message.mode)}<span>{message.text}</span><button aria-label="Chiudi avviso" onClick={()=>setMessage(null)}><X size={16}/></button></div>}
  {booting?<div className="loading"><div className="spinner"/>Caricamento in corso...</div>:<>
  {screen==='landing'&&<main className="client-layout landing-page">
   <section className="hero"><div className="hero-lines" aria-hidden="true">///</div><div className="eyebrow">PERSONAL TRAINING · ROMA</div><h1>NON BASTA<br/>ALLENARSI.<br/><em>CONTA COME<br/>LO FAI.</em></h1><p>Un percorso su misura, un appuntamento alla volta. Prenota i tuoi allenamenti con Alessandro Cola.</p><div className="hero-identity"><div className="avatar-mark"><CoachPhoto avatar/></div><div><div className="signature">by Ale Coach</div><span>Personal Trainer · Hyrox Academy Level One</span></div></div><Button onClick={()=>{setScreen('auth');setAuthMode('signup')}}>INIZIA IL TUO PERCORSO <ArrowRight size={18}/></Button></section>
   <div className="mini-locations"><MapPin size={17}/><span>Virgin Active Roma Talenti</span><b>·</b><span>Nuovo Salario</span></div><CoachIntroduction/>
   <section className="promo-panel"><div><Tag size={20}/><b>PRIMA LEZIONE, -15%</b></div><p>Usa il codice <strong>{promo}</strong> sulla prima lezione individuale a pagamento. Lo sconto viene verificato prima dell'autorizzazione.</p><button onClick={()=>{void navigator.clipboard?.writeText(promo);submitMsg('Codice copiato')}}>Copia codice <ChevronRight size={16}/></button></section>
   <section><Title eyebrow="SCEGLI IL TUO ALLENAMENTO" sub="Allenarsi bene parte dal servizio giusto.">COSTRUIAMO IL TUO PERCORSO</Title><div className="service-list">{activeServices.map(s=>{const Icon=iconByService[s.id]||Zap;return <div key={s.id} className="service-entry"><button className="service-card" onClick={()=>beginBooking(s)}><div className="service-icon"><Icon size={24}/></div><div className="service-copy"><h3>{s.name}</h3><p>{s.description}</p><small>{s.kind==='quote'?'Da concordare':`${s.duration_minutes} minuti`}</small></div><div className="service-price">{s.kind==='free'?'GRATIS':s.kind==='quote'?'SU PREVENTIVO':currency(s.price_cents)}<ChevronRight size={18}/></div></button><details className="service-details"><summary>Dettagli e regole</summary><p>{serviceRules[s.id]||s.description}</p></details></div>})}</div></section>
   <section className="packages-area"><Title eyebrow="PIÙ RISULTATI, PIÙ CONTINUITÀ">PACCHETTI E ABBONAMENTI</Title><div className="packages-list">{activePacks.map(p=><div key={p.id} className="package-card"><div><h3>{p.name}</h3><p>{p.description}</p><small>{p.credits} lezioni · {p.type==='subscription'?'Rinnovo mensile, minimo 2 mesi':'Pagamento unico'}</small><details className="service-details"><summary>Dettagli e regole</summary><p>{packageRules[p.id]}</p></details></div><b>{currency(p.price_cents)}{p.type==='subscription'&&<small> / mese</small>}</b></div>)}</div><p className="footnote">I pacchetti Flex si pagano con Stripe solo dopo il collegamento dell’account. I Continuity sono illustrati con le condizioni v2, ma il rinnovo automatico non è ancora attivo.</p></section>
   <section className="legal-strip"><ShieldCheck size={20}/><p>Lezioni riservate agli iscritti Virgin Active. La conferma dell'orario arriva da Ale. Disdetta gratuita fino a 24 ore prima.</p></section>
   {whatsappLink('Ciao Ale, vorrei informazioni sulle lezioni!')&&<a className="whatsapp-cta" href={whatsappLink('Ciao Ale, vorrei informazioni sulle lezioni!')!} target="_blank" rel="noreferrer"><MessageCircle size={17}/> Scrivi ad Ale su WhatsApp</a>}
  </main>}
  {screen==='auth'&&<main className="client-layout auth-page">{passwordRecovery?<div className="auth-card"><div className="auth-icon"><LockKeyhole size={26}/></div><Title eyebrow="SICUREZZA ACCOUNT">IMPOSTA UNA NUOVA PASSWORD</Title><p className="auth-lead">Scegli una password di almeno 8 caratteri e confermala.</p><form className="form-stack" onSubmit={e=>void completePasswordRecovery(e)}><Labeled label="Nuova password" required><input type="password" autoComplete="new-password" required minLength={8} value={newPassword} onChange={e=>setNewPassword(e.target.value)}/></Labeled><Labeled label="Conferma nuova password" required><input type="password" autoComplete="new-password" required minLength={8} value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)}/></Labeled><Button type="submit" disabled={busy||!user||newPassword.length<8||newPassword!==confirmPassword}>{busy?'Salvataggio...':'SALVA NUOVA PASSWORD'} <Check size={17}/></Button></form><Button variant="quiet" onClick={()=>void logout()}>Esci</Button></div>:<><button className="back-link" onClick={()=>setScreen('landing')}><ArrowLeft size={17}/> Torna alla presentazione</button><div className="auth-card"><div className="auth-icon"><LockKeyhole size={26}/></div><div className="signature">il tuo spazio con Ale</div><Title eyebrow="AREA RISERVATA">{authMode==='signup'?'CREA IL TUO ACCOUNT':authMode==='reset'?'RECUPERA LA PASSWORD':'BENTORNATO!'}</Title><p className="auth-lead">{authMode==='signup'?'Prenota, segui le tue lezioni e ricevi conferme in un unico posto.':authMode==='reset'?'Inserisci la tua email per recuperare l’accesso.':'Accedi con la tua email e la tua password.'}</p>
    {internalQa&&authMode==='signup'&&<p className="legal-warning">Accesso riservato agli indirizzi email autorizzati al collaudo. Il sito non è ancora aperto ai clienti finali; le informative sono in revisione. Per richiedere l’abilitazione scrivi a info@alecoach.online.</p>}
    <form onSubmit={e=>void authenticate(e)} className="form-stack">{authMode==='signup'&&<><Labeled label="Nome e cognome" required><input required autoComplete="name" value={authForm.name} onChange={e=>setAuthForm(f=>({...f,name:e.target.value}))} placeholder="Mario Rossi"/></Labeled><Labeled label="Telefono"><input type="tel" autoComplete="tel" value={authForm.phone} onChange={e=>setAuthForm(f=>({...f,phone:e.target.value}))} placeholder="+39..."/></Labeled></>}
    <Labeled label="Email" required><input type="email" required autoComplete="email" value={authForm.email} onChange={e=>setAuthForm(f=>({...f,email:e.target.value}))} placeholder="nome@email.it"/></Labeled>{authMode!=='reset'&&<Labeled label="Password" required><input type="password" required minLength={8} autoComplete={authMode==='signup'?'new-password':'current-password'} value={authForm.password} onChange={e=>setAuthForm(f=>({...f,password:e.target.value}))} placeholder="Almeno 8 caratteri"/></Labeled>}
    {authMode==='signup'&&<label className="check-row terms"><input required type="checkbox" checked={privacyNoticeSeen} onChange={e=>setPrivacyNoticeSeen(e.target.checked)}/><span>Ho preso visione dell'<a href={legalPaths.privacy} target="_blank" rel="noopener noreferrer">informativa privacy</a>. Questa presa visione non costituisce consenso per finalità promozionali.</span></label>}
    {authMode==='signup'&&blockUnreviewedLegal&&<p className="legal-warning">La registrazione sarà abilitata dopo l'approvazione delle informative e dei dati legali del titolare.</p>}
    <Button type="submit" disabled={busy||!onlineReady||(authMode==='signup'&&(!privacyNoticeSeen||blockUnreviewedLegal))}>{busy?'Caricamento...':authMode==='signup'?'REGISTRATI':authMode==='reset'?'INVIA LINK':'ACCEDI'} <ArrowRight size={17}/></Button></form>
    {import.meta.env.VITE_GOOGLE_ENABLED==='true'&&!blockUnreviewedLegal&&<><div className="oauth-separator">oppure</div>{authMode!=='signup'&&<label className="check-row terms"><input type="checkbox" checked={privacyNoticeSeen} onChange={e=>setPrivacyNoticeSeen(e.target.checked)}/><span>Ho preso visione dell'<a href={legalPaths.privacy} target="_blank" rel="noopener noreferrer">informativa privacy</a> prima di continuare con Google.</span></label>}<Button variant="outline" className="google-login" disabled={!privacyNoticeSeen} onClick={()=>void googleLogin()}>CONTINUA CON GOOGLE</Button></>}
    <div className="auth-switch">{authMode==='signin'?<><button onClick={()=>setAuthMode('signup')}>Non hai un account? Registrati</button><button onClick={()=>setAuthMode('reset')}>Password dimenticata?</button></>:<button onClick={()=>setAuthMode('signin')}>Hai già un account? Accedi</button>}</div>
   </div><p className="security-note"><ShieldCheck size={15}/> Login protetto da Supabase Auth quando configurato</p></>}</main>}
  {screen==='client'&&profile&&<main className="client-layout client-page">
   <div className="app-welcome"><div><div className="signature">il tuo percorso, {profile.full_name.split(' ')[0]}</div><h1>ALLENATI CON <em>ALE.</em></h1></div><div className="profile-bubble">{profile.full_name.charAt(0)||'A'}</div></div>
   {bookingForm?<section className="wizard"><button className="back-link" onClick={()=>{if(step==='review')setStep(selected.kind==='quote'?'details':'when');else if(step==='when'&&selected.kind!=='free')setStep('details');else setSelectedService(null)}}><ArrowLeft size={17}/> Indietro</button>
    <div className="wizard-top"><div className="eyebrow"><span>///</span> NUOVA PRENOTAZIONE</div><h2>{selected.name}</h2><p>{selected.description}</p></div><div className="progress"><span className="filled"/><span className={step!=='details'?'filled':''}/><span className={step==='review'?'filled':''}/></div>
    {step==='details'&&<div className="wizard-panel"><Title eyebrow="01 · DETTAGLI">DIMMI DI PIÙ</Title>
     {['single','couple'].includes(selected.id)&&<><Labeled label="Disciplina (facoltativa)"><select value={bookingDetails.discipline||''} onChange={e=>setBookingDetails(d=>({...d,discipline:e.target.value}))}><option value="">Scegli una disciplina</option>{disciplines.map(x=><option key={x}>{x}</option>)}</select></Labeled><Labeled label="Il tuo livello"><select value={bookingDetails.level||'Principiante'} onChange={e=>setBookingDetails(d=>({...d,level:e.target.value}))}>{['Principiante','Intermedio','Avanzato'].map(x=><option key={x}>{x}</option>)}</select></Labeled></>}
     {selected.id==='couple'&&<><Labeled label="Nome del partner" required><input value={bookingDetails.partner||''} onChange={e=>setBookingDetails(d=>({...d,partner:e.target.value}))} placeholder="Nome e cognome"/></Labeled><Labeled label="Email del partner"><input type="email" value={bookingDetails.partner_email||''} onChange={e=>setBookingDetails(d=>({...d,partner_email:e.target.value}))}/></Labeled></>}
     {selected.id==='check'&&<><Labeled label="Cosa vuoi migliorare?"><textarea rows={3} value={bookingDetails.goal||''} onChange={e=>setBookingDetails(d=>({...d,goal:e.target.value}))} placeholder="Raccontami il tuo obiettivo"/></Labeled><p className="footnote">Per tutelare i tuoi dati, l'invio di schede e documenti online è temporaneamente disabilitato. Non inserire dati sanitari nei campi di testo.</p></>}
     {selected.id==='start'&&<><Labeled label="Obiettivo"><textarea rows={2} value={bookingDetails.goal||''} onChange={e=>setBookingDetails(d=>({...d,goal:e.target.value}))} placeholder="Aumentare forza, preparare Hyrox..."/></Labeled><Labeled label="Esperienza di allenamento"><select value={bookingDetails.experience||'Principiante'} onChange={e=>setBookingDetails(d=>({...d,experience:e.target.value}))}>{['Principiante','1–2 anni','Oltre 2 anni'].map(x=><option key={x}>{x}</option>)}</select></Labeled><p className="footnote">Eventuali infortuni o informazioni sanitarie saranno discussi direttamente con il coach finché non sarà disponibile un’informativa privacy specifica.</p></>}
     {selected.kind==='quote'&&<><Labeled label="Raccontami cosa ti serve" required><textarea rows={5} value={bookingDetails.description||''} onChange={e=>setBookingDetails(d=>({...d,description:e.target.value}))} placeholder="Piccoli gruppi, Hyrox, eventi..."/></Labeled><Labeled label="Giorni e orari preferiti"><input value={bookingDetails.preference||''} onChange={e=>setBookingDetails(d=>({...d,preference:e.target.value}))} placeholder="Es. lunedì mattina"/></Labeled></>}
     <Button onClick={()=>{if(selected.id==='couple'&&!bookingDetails.partner?.trim()){submitMsg('Inserisci il nome del partner.','error');return}if(selected.kind==='quote'&&!bookingDetails.description?.trim()){submitMsg('Descrivi la tua richiesta.','error');return}setStep(selected.kind==='quote'?'review':'when')}}>CONTINUA <ArrowRight size={18}/></Button>
    </div>}
    {step==='when'&&<div className="wizard-panel"><Title eyebrow="02 · DISPONIBILITÀ">QUANDO CI VEDIAMO?</Title><div className="field"><span>Preferenza sede</span><div className="venue-choice">{[...venues.map(v=>({id:v.id,name:v.name})),{id:'indifferente',name:'Indifferente'}].map(v=><button key={v.id} className={venuePreference===v.id?'chosen':''} onClick={()=>{releaseHold();setVenuePreference(v.id);setSelectedHour(null)}}><MapPin size={16}/>{v.name}</button>)}</div><p className="small-muted">Indifferente mostra gli orari disponibili in entrambe le sedi. La sede effettiva sarà indicata sulla prenotazione.</p></div><div className="field"><span>Scegli il giorno · fino a 42 giorni</span><div className="day-strip">{trialDays.map(d=>{const open=d.weekday!==7;return <button key={d.date} disabled={!open} className={selectedDay===d.date?'chosen':''} aria-pressed={selectedDay===d.date} onClick={()=>{releaseHold();setSelectedDay(d.date);setSelectedHour(null)}}><small>{d.label.split(' ')[0]}</small><strong>{d.label.split(' ')[1]}</strong><small>{d.label.split(' ')[2]}</small></button>})}</div></div><div className="field"><span>Orari disponibili · ogni 15 minuti</span>{holdUntil&&<p className="good-note"><Check size={14}/> Slot riservato fino alle {new Date(holdUntil).toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'})}. Completa la richiesta.</p>}{selectedDay?<div className="slot-grid">{availableHours.length?availableHours.map(slot=><button key={`${slot.venue_id}-${slot.start_minute}`} className={selectedHour===slot.start_minute&&selectedVenue===slot.venue_id?'chosen':''} aria-pressed={selectedHour===slot.start_minute&&selectedVenue===slot.venue_id} onClick={()=>void chooseSlot(slot)} disabled={busy}>{formatStartMinute(slot.start_minute)}<small>{slot.venue_id==='talenti'?'Talenti':'Nuovo Salario'}</small></button>):<p className="small-muted">Nessuno slot libero per questa sede e data. Seleziona «Indifferente» oppure contatta Ale per un'alternativa.</p>}</div>:<p className="small-muted">Seleziona un giorno per vedere gli orari.</p>}</div><Button disabled={!selectedDay||selectedHour===null} onClick={()=>setStep('review')}>CONTINUA <ArrowRight size={18}/></Button></div>}
    {step==='review'&&<div className="wizard-panel"><Title eyebrow="03 · CONFERMA">CI SIAMO QUASI</Title><div className="summary-card"><div className="summary-row"><span>Servizio</span><b>{selected.name}</b></div>{selected.kind!=='quote'&&<><div className="summary-row"><span>Quando</span><b>{trialDays.find(x=>x.date===selectedDay)?.label} · {selectedHour!==null?formatStartMinute(selectedHour):'--:--'}</b></div><div className="summary-row"><span>Sede</span><b>{venues.find(v=>v.id===selectedVenue)?.name}</b></div></>}<div className="summary-row"><span>Prezzo</span><b>{selected.kind==='quote'?'Su preventivo':currency(selectedPreviewAmount)}</b></div></div>
     <div className="virgin-box"><div><ShieldCheck size={21}/><b>Iscrizione Virgin Active</b></div><p>Le lezioni si svolgono all'interno della palestra e sono riservate agli iscritti. Non è disponibile un ingresso giornaliero.</p><label className="check-row"><input type="checkbox" checked={profile.virgin_member} onChange={e=>void changeProfile({virgin_member:e.target.checked})}/><span>Confermo di essere iscritto a Virgin Active.</span></label>{!profile.virgin_member&&whatsappLink('Ciao Ale, non sono ancora iscritto a Virgin Active. Posso avere informazioni?')&&<a href={whatsappLink('Ciao Ale, non sono ancora iscritto a Virgin Active. Posso avere informazioni?')!} target="_blank" rel="noreferrer" className="text-link">Chiedi informazioni ad Ale <ExternalLink size={14}/></a>}</div>
     {selected.id==='single'&&selected.kind==='paid'&&<><Labeled label="Hai un codice sconto?"><div className="promo-input"><input placeholder="Es. ALECOACH15" value={promoInput} onChange={e=>setPromoInput(e.target.value.toUpperCase())}/><Tag size={18}/></div></Labeled>{promoInput.trim().toUpperCase()===promo&&<p className="good-note"><Check size={15}/> 15% sulla prima individuale: 55 € → 46,75 €. Nessun cumulo; verifica lato server.</p>}
      <div className="field"><span>Metodo di pagamento</span><button className={`pay-choice ${selectedMode==='online'?'chosen':''}`} onClick={()=>setSelectedMode('online')}><CreditCard size={19}/><div><b>Pagamento online con Stripe</b><small>Prima autorizzi la carta, poi Ale riceve la richiesta. Incasso solo se approva.</small></div><Check size={17}/></button>{profile.allow_in_person&&<button className={`pay-choice ${selectedMode==='in_person'?'chosen':''}`} onClick={()=>setSelectedMode('in_person')}><Wallet size={19}/><div><b>Pagamento in palestra</b><small>Autorizzato dal coach per il tuo account</small></div><Check size={17}/></button>}{creditCount>0&&selected.id==='single'&&<button className={`pay-choice ${selectedMode==='credit'?'chosen':''}`} onClick={()=>setSelectedMode('credit')}><TicketPercent size={19}/><div><b>Usa un credito</b><small>{creditCount} lezioni disponibili</small></div><Check size={17}/></button>}</div></>}
     <div className="total"><span>Totale indicativo</span><strong>{selected.kind==='free'?'GRATIS':selected.kind==='quote'?'DA DEFINIRE':selectedMode==='credit'?'1 CREDITO':currency(selectedPreviewAmount*(100-discountPreview)/100)}</strong></div><div className="disclaimer">Per i pagamenti online, autorizzi ora l'importo su Stripe: non viene incassato subito. Solo dopo l'autorizzazione la richiesta arriva al coach, che può approvare e incassare oppure rifiutare e liberare i fondi. La risposta è prevista entro 24 ore. Per le lezioni già confermate vale la regola di disdetta delle 24 ore.</div><label className="check-row terms"><input type="checkbox" checked={termsOk} onChange={e=>setTermsOk(e.target.checked)}/><span>Ho letto e accetto le <a href={legalPaths.terms} target="_blank" rel="noopener noreferrer">condizioni di prenotazione e disdetta</a> e ho preso visione dell'<a href={legalPaths.privacy} target="_blank" rel="noopener noreferrer">informativa privacy</a>.</span></label><Button disabled={busy||!profile.virgin_member||!termsOk||blockUnreviewedLegal} onClick={()=>void saveBooking()}>{busy?'ELABORAZIONE...':selected.kind==='quote'?'CHIEDI IL PREVENTIVO':selected.kind==='free'?'PRENOTA IL COLLOQUIO':selectedMode==='online'?'AUTORIZZA CARTA SU STRIPE':'INVIA LA RICHIESTA'} <ArrowRight size={17}/></Button>
    </div>}
   </section>:<>
   {clientTab==='home'&&<><section className="client-hero"><div className="eyebrow">/// IL TUO PROSSIMO OBIETTIVO</div><h2>UNA LEZIONE<br/><em>ALLA VOLTA.</em></h2><p>Il momento giusto per migliorare è adesso.</p><div className="client-hero-lines">///</div></section>
    <CoachIntroduction compact/><div className="source-chip"><Sparkles size={15}/>{sourceLabel}</div>
    <div className="metric-row"><div className="metric"><span>Prossime lezioni</span><strong>{myBookings.filter(b=>b.status==='confirmed'&&b.starts_at&&new Date(b.starts_at)>new Date()).length}</strong></div><div className="metric"><span>Da confermare</span><strong>{myBookings.filter(b=>b.status==='pending').length}</strong></div><div className="metric"><span>Crediti residui</span><strong>{creditCount}</strong></div></div>
    <section className="promo-panel"><div><Gift size={19}/><b>LA PRIMA LEZIONE È SPECIALE</b></div><p><strong>-15% sulla prima individuale:</strong> 55 € → 46,75 € con il codice <strong>{promo}</strong>. Nessun cumulo.</p><button onClick={()=>{void navigator.clipboard?.writeText(promo);submitMsg('Codice copiato')}}>Copia codice <ChevronRight size={16}/></button></section>
    <section><Title eyebrow="SCEGLI IL TUO ALLENAMENTO">PRENOTA CON ALE</Title><div className="service-list">{activeServices.map(s=>{const Icon=iconByService[s.id]||Zap;return <div key={s.id} className="service-entry"><button className="service-card" onClick={()=>beginBooking(s)}><div className="service-icon"><Icon size={23}/></div><div className="service-copy"><h3>{s.name}</h3><p>{s.description}</p><small>{s.duration_minutes} min</small></div><div className="service-price">{s.kind==='free'?'GRATIS':s.kind==='quote'?'PREVENTIVO':currency(s.price_cents)}<ChevronRight size={16}/></div></button><details className="service-details"><summary>Dettagli e regole</summary><p>{serviceRules[s.id]||s.description}</p></details></div>})}</div></section>
    <section className="packages-area"><Title eyebrow="CONTINUITÀ">PACCHETTI & ABBONAMENTI</Title>{activePacks.map(p=><div key={p.id} className="package-card"><div><h3>{p.name}</h3><small>{p.description}</small><details className="service-details"><summary>Dettagli e regole</summary><p>{packageRules[p.id]}</p></details></div><div className="package-buy"><b>{currency(p.price_cents)}{p.type==='subscription'&&<small> / mese</small>}</b><button onClick={()=>void buyPackage(p)} disabled={busy||p.type==='subscription'}>{p.type==='subscription'?'In preparazione':'Acquista Flex'}</button></div></div>)}<p className="footnote">I Flex si acquistano in un'unica soluzione. I Continuity prevedono due mesi iniziali e rinnovo mensile: attivazione in corso, non ancora acquistabili.</p></section>
   </>}
   {clientTab==='bookings'&&<section><Title eyebrow="LA TUA AGENDA" sub="Richieste, conferme e pagamenti in un posto solo.">LE MIE LEZIONI</Title>{myBookings.length===0?<Empty title="Ancora nessuna lezione" desc="Prenota il primo appuntamento e inizia il tuo percorso."/>:<div className="booking-list">{myBookings.map(b=>{const s=services.find(x=>x.id===b.service_id);return <article key={b.id} className="booking-card"><div className="booking-head"><h3>{s?.name||b.service_id}</h3><Status status={b.status}/></div>{b.starts_at?<div className="booking-meta"><CalendarDays size={16}/>{dateLabel(b.starts_at)} · {timeLabel(b.starts_at)} <span>·</span>{venues.find(v=>v.id===b.venue_id)?.name}</div>:<p className="small-muted">Da concordare con il coach</p>}<div className="booking-total"><span>{b.payment_mode==='in_person'?'Pagamento in palestra':b.payment_mode==='credit'?'Credito pacchetto':b.payment_mode==='none'?'Senza pagamento':'Pagamento online'}</span><b>{b.amount_cents?currency(b.amount_cents):b.status==='quoted'?'Da definire':'Gratis'}</b></div>{b.status==='authorizing'&&<p className="small-muted">La richiesta non è stata ancora inviata ad Ale. Completa l'autorizzazione della carta su Stripe entro {new Date(b.expires_at).toLocaleString('it-IT')}.</p>}{b.status==='authorizing'&&<Button onClick={()=>void payBooking(b)} disabled={busy}><CreditCard size={16}/> AUTORIZZA LA CARTA</Button>}{b.status==='pending'&&b.payment_mode==='online'&&b.payment_status==='unpaid'&&<><p className="small-muted">Per inoltrare questa vecchia richiesta è necessaria la preautorizzazione della carta.</p><Button onClick={()=>void payBooking(b)} disabled={busy}>AUTORIZZA LA CARTA <CreditCard size={16}/></Button></>}{b.status==='pending'&&b.payment_status==='authorized'&&<p className="good-note"><Check size={15}/> Carta autorizzata, nessun importo incassato. La richiesta ora è visibile ad Ale, che deve confermare entro {new Date(b.expires_at).toLocaleString('it-IT')}.</p>}{b.status==='pending'&&b.payment_mode!=='online'&&<p className="small-muted">Ale deve ancora approvare questa richiesta. Scadenza: {new Date(b.expires_at).toLocaleString('it-IT')}.</p>}{b.status==='processing'&&<p className="small-muted">Stripe sta completando l'operazione richiesta. L'importo non va considerato incassato finché lo stato non è confermato.</p>}{b.status==='awaiting_payment'&&<p className="small-muted">Richiesta precedente al nuovo flusso. Contatta Ale per completare la prenotazione.</p>}{b.status==='quoted'&&<p className="small-muted">Preventivo pronto. Contatta Ale per concordare l'autorizzazione dell'importo.</p>}{cancelAllowed(b)&&<button className="link-danger" onClick={()=>void cancelBooking(b)}>Disdici prenotazione</button>}{b.status==='confirmed'&&b.starts_at&&!cancelAllowed(b)&&<p className="footnote">A meno di 24 ore dalla lezione la disdetta online non è disponibile.</p>}</article>})}</div>}</section>}
   {clientTab==='messages'&&<section><Title eyebrow="TUTTI GLI AGGIORNAMENTI">NOTIFICHE</Title><div className="row-end"><Button variant="outline" onClick={()=>void subscribePush()}><Bell size={15}/>{pushEnabled?'Push abilitate':'Attiva notifiche push'}</Button></div>{myNotices.length===0?<Empty title="Tutto tranquillo" desc="Qui riceverai notizie su conferme, disdette e pagamenti."/>:myNotices.map(n=><div key={n.id} className={`notice-card ${n.read_at?'':'unread'}`}><div><b>{n.title}</b><small>{new Date(n.created_at).toLocaleString('it-IT')}</small></div><p>{n.body}</p></div>)}</section>}
   {clientTab==='profile'&&<section><Title eyebrow="IL TUO ACCOUNT">PROFILO</Title><div className="profile-card"><div className="large-avatar">{profile.full_name.charAt(0)}</div><h3>{profile.full_name}</h3><p>{profile.email}</p><div className="field"><span>Nome completo</span><input defaultValue={profile.full_name} onBlur={e=>{if(e.target.value!==profile.full_name)void changeProfile({full_name:e.target.value})}}/></div><div className="field"><span>Telefono</span><input type="tel" defaultValue={profile.phone} onBlur={e=>{if(e.target.value!==profile.phone)void changeProfile({phone:e.target.value})}}/></div><label className="check-row virgin-profile"><input type="checkbox" checked={profile.virgin_member} onChange={e=>void changeProfile({virgin_member:e.target.checked})}/><span>Iscritto a Virgin Active</span></label><div className="permission-line"><div><b>Pagamento in presenza</b><span>{profile.allow_in_person?'Abilitato dal coach':'Non abilitato: anticipo online obbligatorio'}</span></div><span className={`permission-dot ${profile.allow_in_person?'on':''}`}/></div><Button variant="outline" onClick={()=>void subscribePush()}><Bell size={17}/> {pushEnabled?'Notifiche push abilitate':'Abilita notifiche push'}</Button><Button variant="outline" onClick={()=>void exportMyData()} disabled={busy}>Scarica una copia dei miei dati (JSON)</Button>
     {legal.contactEmail&&<a className="privacy-request" href={`mailto:${legal.contactEmail}?subject=Richiesta%20accesso%20o%20cancellazione%20dati%20Ale%20Coach`}>Chiedi accesso, rettifica o cancellazione dei tuoi dati</a>}
     <Button variant="quiet" onClick={()=>void logout()}><LogOut size={17}/> Esci</Button></div></section>}
   </>}
   {!selectedService&&<nav className="bottom-nav" aria-label="Navigazione cliente"><button className={clientTab==='home'?'active':''} onClick={()=>setClientTab('home')}><Dumbbell size={21}/>Prenota</button><button className={clientTab==='bookings'?'active':''} onClick={()=>setClientTab('bookings')}><CalendarDays size={21}/>Le mie lezioni</button><button className={clientTab==='messages'?'active':''} onClick={()=>{setClientTab('messages');void markNotices()}}><span className="badge-icon"><Bell size={21}/>{unread>0&&<i>{unread}</i>}</span>Notifiche</button><button className={clientTab==='profile'?'active':''} onClick={()=>setClientTab('profile')}><UserRound size={21}/>Profilo</button></nav>}
  </main>}
  {screen==='coach'&&profile&&<main className="coach-layout">
   <div className="coach-hero"><div><div className="signature">Ciao Ale!</div><h1>IL TUO <em>CONTROLLO.</em></h1><p>Gestisci richieste, agenda e clienti. Tutto in un posto.</p></div><div className="coach-mark"><Dumbbell size={31}/></div></div>
   <div className="coach-stats"><div className="stat-card"><small>DA CONFERMARE</small><strong>{pendingBookings.length}</strong><span>Richieste ricevute</span></div><div className="stat-card"><small>PROSSIME LEZIONI</small><strong>{futureBookings.length}</strong><span>Confermate</span></div><div className="stat-card"><small>INCASSATI ONLINE*</small><strong>{currency(totalPaid)}</strong><span>In presenza: {currency(inPersonTotal)}</span></div></div>
   <div className="coach-nav-wrap"><button className="menu-toggle" onClick={()=>setAllowMenu(x=>!x)}><Menu size={17}/> Sezioni <ChevronRight size={16}/></button><nav className={`coach-nav ${allowMenu?'expanded':''}`}>{coachNav.map(x=><button key={x.id} className={coachTab===x.id?'active':''} onClick={()=>{setCoachTab(x.id);setAllowMenu(false)}}>{x.label}{x.id==='requests'&&pendingBookings.length>0&&<b>{pendingBookings.length}</b>}</button>)}</nav></div>
   {coachTab==='overview'&&<div className="coach-content"><Title eyebrow="PANORAMICA" sub="Le cose più importanti, subito.">OGGI IN AGENDA</Title>{futureBookings.slice(0,4).length===0?<Empty title="Nessuna lezione in programma" desc="Le lezioni approvate compariranno qui."/>:futureBookings.slice(0,4).map(b=><div className="compact-booking" key={b.id}><span className="time-pill">{b.starts_at?timeLabel(b.starts_at):'--:--'}</span><div><b>{services.find(x=>x.id===b.service_id)?.name}</b><small>{clients.find(c=>c.id===b.client_id)?.full_name||'Cliente'} · {venues.find(v=>v.id===b.venue_id)?.name}</small></div><Status status={b.status}/></div>)}<div className="coach-quick"><Button onClick={()=>setCoachTab('requests')}>GESTISCI RICHIESTE <ArrowRight size={17}/></Button><Button variant="outline" onClick={()=>setCoachTab('marketing')}>LINK & QR <QrCode size={17}/></Button></div><p className="footnote">*Importi registrati nelle prenotazioni. Non sostituiscono la contabilità o la rendicontazione Stripe.</p></div>}
   {coachTab==='requests'&&<section className="coach-content"><Title eyebrow="APPROVAZIONI" sub="Ogni richiesta resta in attesa per 24 ore.">RICHIESTE DA CONFERMARE</Title>{pendingBookings.length===0?<Empty title="Tutto in ordine" desc="Non ci sono richieste da gestire."/>:pendingBookings.map(b=>{const c=clients.find(x=>x.id===b.client_id);const s=services.find(x=>x.id===b.service_id);return <article key={b.id} className="request-card"><div className="booking-head"><div><div className="eyebrow">/// NUOVA RICHIESTA</div><h3>{s?.name||b.service_id}</h3></div><Status status={b.status}/></div><div className="request-client"><div className="mini-avatar">{c?.full_name.charAt(0)||'C'}</div><div><b>{c?.full_name||'Cliente'}</b><small>{c?.email||'Cliente autenticato'}</small></div></div><div className="request-facts"><div><span>DATA</span><b>{b.starts_at?dateLabel(b.starts_at):'Da concordare'}</b></div><div><span>ORA</span><b>{b.starts_at?timeLabel(b.starts_at):'--'}</b></div><div><span>SEDE</span><b>{venues.find(v=>v.id===b.venue_id)?.name||'Da concordare'}</b></div><div><span>PREZZO</span><b>{currency(b.amount_cents)}</b></div></div>{Object.keys(b.details||{}).filter(k=>k!=='document_path').length>0&&<div className="details-preview">{Object.entries(b.details).filter(([k])=>k!=='document_path').map(([k,v])=><div key={k}><small>{k.replaceAll('_',' ')}</small><span>{v}</span></div>)}</div>}{b.details?.document_path&&<button className="text-link" onClick={async()=>{if(!supabase)return;const {data,error}=await supabase.storage.from('client-documents').createSignedUrl(b.details.document_path,120);if(error)submitMsg(error.message,'error');else if(data?.signedUrl)window.open(data.signedUrl,'_blank','noopener,noreferrer')}}>Apri scheda allegata <ExternalLink size={14}/></button>}
     <div className="request-footer"><div className="request-source"><Tag size={14}/>{sources[b.source]||b.source}{b.promo_code&&` · ${b.promo_code}`}</div>{s?.kind==='quote'?<><div className="field"><span>Il tuo preventivo (€)</span><input type="number" min="1" step="0.01" value={quoteValues[b.id]||''} onChange={e=>setQuoteValues(v=>({...v,[b.id]:e.target.value}))} placeholder="Es. 65.00"/></div><Button disabled={busy} onClick={()=>void coachAction(b,'quote')}>INVIA PREVENTIVO <ArrowRight size={15}/></Button></>:<><div className="payment-setting"><span>Pagamento:</span><select value={b.payment_mode} disabled={busy||b.payment_mode==='online'||b.status==='processing'||!['online','in_person'].includes(b.payment_mode)} onChange={e=>void setPaymentMode(b,e.target.value as 'online'|'in_person')}><option value="online">Anticipato online</option>{c?.allow_in_person&&<option value="in_person">Di persona</option>}{b.payment_mode==='none'&&<option value="none">Gratuito</option>}{b.payment_mode==='credit'&&<option value="credit">Credito</option>}</select></div><div className="actions"><Button variant="outline" disabled={busy||(b.status==='processing'&&b.stripe_decision!=='reject')} onClick={()=>void coachAction(b,'reject')}>RIFIUTA <X size={15}/></Button><Button disabled={busy||(b.status==='processing'&&b.stripe_decision!=='approve')} onClick={()=>void coachAction(b,'approve')}>APPROVA E INCASSA <Check size={16}/></Button></div></>}</div></article>})}</section>}
   {coachTab==='agenda'&&<section className="coach-content"><Title eyebrow="CALENDARIO" sub="Le lezioni confermate e i pagamenti in sede.">LA TUA AGENDA</Title>{futureBookings.length===0?<Empty title="Agenda libera" desc="Qui compariranno le lezioni confermate."/>:futureBookings.map(b=><article key={b.id} className="agenda-card"><div className="agenda-day"><strong>{b.starts_at?dateLabel(b.starts_at):'Da definire'}</strong><span>{b.starts_at?timeLabel(b.starts_at):'--:--'}</span></div><div className="agenda-detail"><b>{services.find(s=>s.id===b.service_id)?.name}</b><span>{clients.find(c=>c.id===b.client_id)?.full_name||'Cliente'} · {venues.find(v=>v.id===b.venue_id)?.name}</span><span>{b.payment_mode==='in_person'&&b.payment_status==='due_in_person'?'Da incassare in palestra':b.payment_status==='paid'?'Pagata':b.payment_mode==='credit'?'Credito usato':'Gratuita'}</span></div>{b.payment_mode==='in_person'&&b.payment_status==='due_in_person'&&<Button variant="outline" disabled={busy} onClick={()=>void inPersonPaid(b)}>SEGNA PAGATA</Button>}</article>)}</section>}
   {coachTab==='clients'&&<section className="coach-content"><Title eyebrow="RELAZIONI" sub="Puoi autorizzare ogni cliente al pagamento in presenza.">I TUOI CLIENTI</Title><div className="info-panel"><LockKeyhole size={18}/><p>Per impostazione predefinita ogni nuovo cliente deve pagare online. L'interruttore cambia solo il permesso del cliente selezionato.</p></div>{clients.length===0?<Empty title="Nessun cliente registrato" desc="I nuovi iscritti compariranno qui."/>:clients.map(c=><div className="client-row" key={c.id}><div className="mini-avatar">{c.full_name.charAt(0)||'C'}</div><div className="client-row-info"><b>{c.full_name||'Cliente'}</b><small>{c.email}</small><span>{c.allow_in_person?'Fidelizzato · può pagare in palestra':'Pagamento anticipato obbligatorio'}</span></div><button type="button" className={`switch ${c.allow_in_person?'on':''}`} aria-label={`Pagamento in presenza per ${c.full_name}`} role="switch" aria-checked={c.allow_in_person} disabled={busy} onClick={()=>void setInPerson(c,!c.allow_in_person)}><i/></button></div>)}</section>}
   {coachTab==='hours'&&<section className="coach-content"><Title eyebrow="DISPONIBILITÀ · V2">SEDE, CORSI E FASCE</Title>
    <p className="section-intro">La tua agenda è una sola tra le due palestre. Le finestre proposte non garantiscono slot liberi: corsi, appuntamenti, pause e trasferimenti vengono sottratti automaticamente dal server.</p>
    <div className="calendar-sync-note"><ShieldCheck size={18}/>
     <div><b>Google Calendar: {calendarSync?.status==='connected'?'collegato':'non ancora sincronizzato'}</b>
      <p>{calendarSync?.last_success_at?`Ultimo aggiornamento: ${dateLabel(calendarSync.last_success_at)} alle ${timeLabel(calendarSync.last_success_at)}`:'Le lezioni ricorrenti caricate dal documento coprono solo il periodo 19/10–30/11/2026. Collega il calendario operativo prima del lancio per aggiornare occupazioni e modifiche.'}</p>
     </div></div>
    <h3 className="schedule-subtitle">Finestre settimanali</h3>
    <div className="schedule-window-list">{availabilityWindows.map(w=><div className="schedule-window" key={w.id}>
     <div><b>{dayNames[w.weekday-1]}</b><small>{venues.find(v=>v.id===w.venue_id)?.name||w.venue_id}</small></div>
     <label>Da<input type="time" step={900} defaultValue={formatStartMinute(w.start_minute)} disabled={!w.is_active} onBlur={e=>{const m=asMinute(e.target.value);if(m!==w.start_minute)void saveWindow(w,{start_minute:m})}}/></label>
     <label>A<input type="time" step={900} defaultValue={formatStartMinute(w.end_minute)} disabled={!w.is_active} onBlur={e=>{const m=asMinute(e.target.value);if(m!==w.end_minute)void saveWindow(w,{end_minute:m})}}/></label>
     <label className="check-row tiny"><input type="checkbox" checked={w.is_flexible} onChange={e=>void saveWindow(w,{is_flexible:e.target.checked})}/>Flessibile</label>
     <label className="check-row tiny"><input type="checkbox" checked={w.is_active} onChange={e=>void saveWindow(w,{is_active:e.target.checked})}/>Attiva</label>
    </div>)}</div>
    <h3 className="schedule-subtitle">Aggiungi fascia</h3>
    <div className="schedule-create">
     <label>Giorno<select value={newWindow.weekday} onChange={e=>setNewWindow(v=>({...v,weekday:Number(e.target.value)}))}>{dayNames.map((d,i)=><option key={d} value={i+1}>{d}</option>)}</select></label>
     <label>Sede<select value={newWindow.venue_id} onChange={e=>setNewWindow(v=>({...v,venue_id:e.target.value}))}>{venues.map(v=><option key={v.id} value={v.id}>{v.name}</option>)}</select></label>
     <label>Da<input type="time" step={900} value={formatStartMinute(newWindow.start_minute)} onChange={e=>setNewWindow(v=>({...v,start_minute:asMinute(e.target.value)}))}/></label>
     <label>A<input type="time" step={900} value={formatStartMinute(newWindow.end_minute)} onChange={e=>setNewWindow(v=>({...v,end_minute:asMinute(e.target.value)}))}/></label>
     <label className="check-row tiny"><input type="checkbox" checked={newWindow.is_flexible} onChange={e=>setNewWindow(v=>({...v,is_flexible:e.target.checked}))}/>Flessibile</label>
     <Button variant="outline" onClick={()=>void createWindow()}>AGGIUNGI FASCIA</Button>
    </div>
    <h3 className="schedule-subtitle">Chiusure da verificare</h3>
    {closures.length?closures.map(cl=><div key={cl.id} className="schedule-closure">
      <div><b>{cl.start_date} → {cl.end_date}</b><small>{cl.reason} · {cl.review_status==='proposed'?'Proposta da confermare':'Confermata'}</small></div>
      <label className="check-row tiny"><input type="checkbox" checked={cl.is_active} onChange={e=>void saveClosure(cl,{is_active:e.target.checked})}/>Blocca date</label>
      {cl.review_status==='proposed'&&<Button variant="outline" onClick={()=>void saveClosure(cl,{review_status:'confirmed'})}>CONFERMA CHIUSURA</Button>}
    </div>):<p className="small-muted">Nessuna chiusura proposta.</p>}
    <h3 className="schedule-subtitle">Palinsesto corsi e impegni da verificare</h3>
    <p className="section-intro">Ricorrenze confermate dal documento solo per 19/10–30/11/2026. Gli eventi TRX senza fine o sede verificata restano bloccanti: prima di renderli disponibili occorre classificare gli impegni reali.</p>
    <div className="schedule-window-list">{courseBlocks.map(b=><div key={b.id} className="schedule-window">
     <div><b>{b.title}</b><small>{b.on_date||dayNames[(b.weekday||1)-1]} · {formatStartMinute(b.start_minute)}–{formatStartMinute(b.end_minute)} {b.needs_review?'· Da verificare':''}</small></div>
     <label>Sede<select value={b.venue_id||''} onChange={e=>void saveCourseBlock(b,{venue_id:e.target.value||null,needs_review:!e.target.value})}>
      <option value="">Non classificata</option>{venues.map(v=><option key={v.id} value={v.id}>{v.name}</option>)}
     </select></label>
     <label className="check-row tiny"><input type="checkbox" checked={b.is_active} onChange={e=>void saveCourseBlock(b,{is_active:e.target.checked})}/>Blocca</label>
    </div>)}</div>
    <h3 className="schedule-subtitle">Eventi sincronizzati da Google</h3>
    {externalEvents.length?externalEvents.map(e=><div key={e.id} className="schedule-window">
     <div><b>{new Date(e.starts_at).toLocaleString('it-IT',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit',timeZone:'Europe/Rome'})}</b><small>{e.needs_review?'Sede da classificare':'Sede verificata'} · Evento occupante {e.blocks_booking?'sì':'no'}</small></div>
     <label>Sede<select value={e.venue_id||''} onChange={ev=>{if(ev.target.value)void classifyExternal(e,ev.target.value)}}>
      <option value="">Da classificare</option>{venues.map(v=><option key={v.id} value={v.id}>{v.name}</option>)}
     </select></label>
    </div>):<p className="small-muted">Nessun evento sincronizzato. Configura la funzione di sincronizzazione Google prima di usare l’agenda come calendario reale.</p>}
    <p className="footnote">Una finestra flessibile non autorizza a ignorare corsi o viaggi. Le modifiche agli eventi di Google vengono soltanto lette, mai scritte sui calendari esterni. Le modifiche non spostano automaticamente le prenotazioni già confermate.</p>
    </section>}
   {coachTab==='services'&&<section className="coach-content"><Title eyebrow="LISTINO" sub="Prezzi e disponibilità dei servizi.">SERVIZI</Title>{services.map(s=><div key={s.id} className="admin-product"><div><b>{s.name}</b><small>{s.kind==='quote'?'Su preventivo':`${s.duration_minutes} min`}</small></div><div className="product-actions">{s.kind==='paid'&&<label>€ <input type="number" min="0" step="0.5" defaultValue={s.price_cents/100} onBlur={e=>{const price=Math.round(Number(e.target.value)*100);if(price>=0&&price!==s.price_cents)void updateService(s,{price_cents:price})}}/></label>}<button type="button" role="switch" aria-label={`Servizio ${s.name} attivo`} aria-checked={s.active} className={`switch ${s.active?'on':''}`} onClick={()=>void updateService(s,{active:!s.active})}><i/></button></div></div>)}<Title eyebrow="OFFERTE">PACCHETTI</Title>{packs.map(p=><div className="admin-product" key={p.id}><div><b>{p.name}</b><small>{p.credits} lezioni · {p.description}</small></div><div className="product-actions"><strong>{currency(p.price_cents)}</strong><span className="soft-tag">Stripe da collegare</span></div></div>)}<Title eyebrow="PROMOZIONI">CODICI SCONTO</Title>{codes.map(c=><div key={c.code} className="admin-product"><div><b>{c.code}</b><small>{c.percent_off}% · Validità {c.valid_days_from_contact||'nessun limite'} giorni</small></div><button role="switch" aria-checked={c.active} aria-label={`${c.code} attivo`} className={`switch ${c.active?'on':''}`} onClick={()=>void saveCode({...c,active:!c.active})}><i/></button></div>)}</section>}
   {coachTab==='marketing'&&<section className="coach-content"><Title eyebrow="CONDIVISIONE" sub="QR code, link e codice promozionale pronti da condividere.">QR CODE E LINK</Title><div className="qr-card"><div className="qr-image">{qr?<img src={qr} alt={`QR per accedere all'app con codice ${promo}`}/>:<QrCode size={75}/>}</div><div><h3>QR CODE PRENOTAZIONI</h3><p>Mostra o condividi il QR per aprire l'app con il codice promozionale già inserito.</p>{qr&&<a className="button button-outline" href={qr} download="ale-coach-qr.png">SCARICA QR <ArrowRight size={15}/></a>}</div></div><div className="marketing-link"><div><b>LINK DA CONDIVIDERE</b><small>{shareUrl}</small></div><button aria-label="Copia link" title="Copia link" onClick={()=>{void navigator.clipboard?.writeText(shareUrl);submitMsg('Link copiato')}}><ExternalLink size={18}/></button></div><div className="marketing-link"><div><b>CODICE PROMOZIONALE</b><small>{promo} · 15% sulla prima lezione individuale, senza cumulo con altre offerte.</small></div><button aria-label="Copia codice promozionale" title="Copia codice promozionale" onClick={()=>{void navigator.clipboard?.writeText(promo);submitMsg('Codice copiato')}}><Tag size={18}/></button></div></section>}
   <div className="coach-footer-note"><Settings2 size={15}/> Pannello riservato al coach. Autorizzazioni verificate dal database in modalità reale.</div>
  </main>}
  </>}
  <footer className="site-footer"><div><Logo small/><span>NON BASTA ALLENARSI. CONTA COME LO FAI.</span></div><p>© 2026 Ale Coach · Roma Talenti e Nuovo Salario</p><p className="legal-links"><a href={legalPaths.privacy}>Privacy</a><a href={legalPaths.terms}>Condizioni</a><a href={legalPaths.cookies}>Cookie</a>{legal.contactEmail&&<a href={`mailto:${legal.contactEmail}?subject=Richiesta%20privacy%20Ale%20Coach`}>Diritti sui dati</a>}</p><p className="developer">Sviluppato da <a href="https://www.instagram.com/mattiacucuzza_/" target="_blank" rel="noreferrer">Mattia Cucuzza <Instagram size={13}/></a></p></footer>
  {ready&&<div className="readiness-note">{onlineReady?<><CheckCircle2 size={14}/> Servizio dati collegato</>:null}</div>}
 </div>
}
export default App;
