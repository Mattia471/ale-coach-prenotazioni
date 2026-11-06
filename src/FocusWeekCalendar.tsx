import type { Booking } from './types';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export const romeDateKey = (value: Date | string): string => {
 const date = value instanceof Date ? value : new Date(value);
 const parts = new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Rome',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);
 const get = (key: string) => parts.find(p=>p.type===key)?.value ?? '00';
 return get('year')+'-'+get('month')+'-'+get('day');
};
function weekMonday(date: Date) {
 const start = new Date(date.getFullYear(),date.getMonth(),date.getDate(),12);
 start.setDate(start.getDate()-((start.getDay()+6)%7));
 return start;
}
function nextDay(date:Date, count:number) {
 const d=new Date(date);
 d.setDate(date.getDate()+count);
 return d;
}
export function FocusWeekCalendar({bookings,selectedDate,onSelectDate,weekOffset,onWeekChange}:{
 bookings:Booking[];
 selectedDate:string;
 onSelectDate:(date:string)=>void;
 weekOffset:number;
 onWeekChange:(offset:number)=>void;
}) {
 const today=new Date();
 const monday=weekMonday(today);
 monday.setDate(monday.getDate()+weekOffset*7);
 const days=Array.from({length:7},(_,index)=>nextDay(monday,index));
 const chooseWeek=(offset:number)=>{
   onWeekChange(offset);
   const newMonday=weekMonday(today);
   newMonday.setDate(newMonday.getDate()+offset*7);
   onSelectDate(romeDateKey(newMonday));
 };
 const active=bookings.filter(b=>b.starts_at&&!['cancelled','rejected','expired'].includes(b.status));
 return <div className="mf-calendar mf-live-calendar">
   <div className="mf-calendar-heading">
    <div><span className="mf-overline">CALENDARIO</span><h3>{new Intl.DateTimeFormat('it-IT',{month:'long',year:'numeric'}).format(monday)}</h3></div>
    <div className="mf-calendar-controls">
     <button type="button" className="mf-today-button" onClick={()=>{onWeekChange(0);onSelectDate(romeDateKey(new Date()))}}>Oggi</button>
     <button type="button" aria-label="Settimana precedente" onClick={()=>chooseWeek(weekOffset-1)}><ChevronLeft size={18}/></button>
     <button type="button" aria-label="Settimana successiva" onClick={()=>chooseWeek(weekOffset+1)}><ChevronRight size={18}/></button>
    </div>
   </div>
   <div className="mf-week-grid">
    {days.map(day=>{
     const key=romeDateKey(day);
     const count=active.filter(b=>b.starts_at&&romeDateKey(b.starts_at)===key).length;
     return <button type="button" key={key} className={['mf-day',selectedDate===key?'is-selected':'',romeDateKey(today)===key?'is-today':''].join(' ')} aria-pressed={selectedDate===key} onClick={()=>onSelectDate(key)}>
      <span>{new Intl.DateTimeFormat('it-IT',{weekday:'short'}).format(day).replace('.','')}</span>
      <strong>{day.getDate()}</strong><i className={count>0?'has-events':''} aria-label={count>0?count+' appuntamenti':'Nessun appuntamento'}/>
     </button>;
    })}
   </div>
   <div className="mf-calendar-foot"><span><i/> Giorni con appuntamenti</span><span>Seleziona un giorno per i dettagli</span></div>
  </div>;
}
