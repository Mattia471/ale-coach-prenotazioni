import { createClient } from '@supabase/supabase-js';
import type { Booking,Pack,Profile,Service,Venue,WorkingHours } from './types';
export const ready = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);
export const supabase = ready ? createClient(import.meta.env.VITE_SUPABASE_URL,import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}):null;
export const currency=(cents:number)=>new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR'}).format(cents/100);
export const dateLabel=(value:string)=>new Date(value).toLocaleDateString('it-IT',{weekday:'short',day:'numeric',month:'short',timeZone:'Europe/Rome'});
export const timeLabel=(value:string)=>new Date(value).toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Rome'});
export const romanDay=(date:Date)=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Rome',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
export const romeToday=()=>romanDay(new Date());
export const nextDates=()=>Array.from({length:7},(_,i)=>{const today=new Date(`${romeToday()}T12:00:00`);today.setDate(today.getDate()+i+1);const s=romanDay(today);const dow=(today.getDay()+6)%7+1;return {date:s,weekday:dow,label:new Date(`${s}T12:00:00`).toLocaleDateString('it-IT',{weekday:'short',day:'numeric',month:'short'})};});
export const bookingTime=(date:string,hour:number)=>`${date}T${String(hour).padStart(2,'0')}:00:00+01:00`;
export const stateLabels:Record<Booking['status'],string>={pending:'In attesa',awaiting_payment:'Da pagare',confirmed:'Confermata',quoted:'Preventivo',rejected:'Rifiutata',cancelled:'Disdetta',expired:'Scaduta'};
export const sources:Record<string,string>={direct:'Accesso diretto',instagram_bio:'Instagram · link in bio',instagram_dm:'DM Instagram · FORZA',meta_ads:'Pubblicità Meta',club:'QR palestra',friend:'Codice amico'};
const now=new Date().toISOString();
export const demoServices:Service[]=[
{id:'single',name:'Lezione singola',description:'Forza, TRX, GRID, calisthenics e Hyrox: un’ora tutta per te.',kind:'paid',duration_minutes:60,price_cents:5000,active:true,sort_order:1},
{id:'couple',name:'Lezione di coppia',description:'Allenatevi in due, 40 € a testa.',kind:'paid',duration_minutes:60,price_cents:8000,active:true,sort_order:2},
{id:'check',name:'Check scheda',description:'Porta la tua scheda: la sistemiamo insieme.',kind:'paid',duration_minutes:30,price_cents:3000,active:true,sort_order:3},
{id:'start',name:'Avvio programmazione',description:'Obiettivi, valutazione e piano su misura.',kind:'paid',duration_minutes:45,price_cents:4500,active:true,sort_order:4},
{id:'intro',name:'Colloquio conoscitivo',description:'15 minuti gratuiti per capire da dove partire.',kind:'free',duration_minutes:15,price_cents:0,active:true,sort_order:5},
{id:'other',name:'Altro / preventivo',description:'Hyrox, eventi, piccoli gruppi. Raccontami cosa ti serve.',kind:'quote',duration_minutes:60,price_cents:0,active:true,sort_order:6},
];
export const demoVenues:Venue[]=[{id:'talenti',name:'Roma Talenti',subtitle:'Virgin Active'},{id:'nuovo_salario',name:'Nuovo Salario',subtitle:'Virgin Active'}];
export const demoHours:WorkingHours[]=Array.from({length:7},(_,i)=>({weekday:i+1,is_open:i!==6,start_hour:9,end_hour:i===5?13:14}));
export const demoPacks:Pack[]=[
{id:'five',name:'Pacchetto 5 lezioni',type:'pack',credits:5,price_cents:22500,validity_days:90,description:'45 € a lezione · valido 3 mesi',active:true,sort_order:1},
{id:'ten',name:'Pacchetto 10 lezioni',type:'pack',credits:10,price_cents:40000,validity_days:180,description:'40 € a lezione · valido 6 mesi',active:true,sort_order:2},
{id:'monthly4',name:'1 volta a settimana',type:'subscription',credits:4,price_cents:14000,validity_days:31,description:'4 lezioni al mese',active:true,sort_order:3},
{id:'monthly8',name:'2 volte a settimana',type:'subscription',credits:8,price_cents:24000,validity_days:31,description:'8 lezioni al mese',active:true,sort_order:4},
];
export const previewProfile=(role:'client'|'coach'):Profile=>({id:role==='coach'?'coach-preview':'client-preview',role,email:role==='coach'?'ale@example.test':'giulia@example.test',full_name:role==='coach'?'Alessandro Cola':'Giulia Demo',phone:'',virgin_member:true,allow_in_person:false,first_contact_at:now,created_at:now});
export const demoBooking=():Booking=>({id:crypto.randomUUID(),client_id:'client-preview',service_id:'single',venue_id:'talenti',starts_at:new Date(Date.now()+3*86400000).toISOString(),duration_minutes:60,status:'pending',payment_mode:'online',payment_status:'unpaid',base_amount_cents:5000,amount_cents:4500,discount_percent:10,promo_code:'ALECOACH10',details:{discipline:'Hyrox'},source:'instagram_bio',referral:null,created_at:now,expires_at:new Date(Date.now()+24*3600000).toISOString(),approved_at:null,paid_at:null,cancelled_at:null,credit_wallet_id:null,stripe_checkout_session_id:null,stripe_payment_intent_id:null});
export const whatsappLink=(message:string)=>{const phone=String(import.meta.env.VITE_COACH_WHATSAPP||'').replace(/[^0-9]/g,'');return phone?`https://wa.me/${phone}?text=${encodeURIComponent(message)}`:null};
