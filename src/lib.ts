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
export const bookingTime=(date:string,hour:number)=>`${date}T${String(hour).padStart(2,'0')}¶»§q«^