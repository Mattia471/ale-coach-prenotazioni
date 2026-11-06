import { useMemo, useState } from 'react';
import {
  ArrowLeft, ArrowRight, ArrowUpRight, Bell, CalendarCheck2, CalendarDays,
  Check, CheckCircle2, ChevronLeft, ChevronRight, Clock3, CreditCard,
  Dumbbell, House, LayoutGrid, MapPin, Plus, Settings2, ShieldCheck,
  SlidersHorizontal, Sparkles, UserRound, Users, X
} from 'lucide-react';
import './minimal-focus.css';

type Role = 'client' | 'coach';
type ClientSection = 'today' | 'book' | 'lessons' | 'profile';
type CoachSection = 'overview' | 'agenda' | 'clients' | 'manage';
type Status = 'confirmed' | 'pending' | 'cancelled';
type Session = { id: number; date: string; time: string; title: string; client: string; venue: string; status: Status; block?: boolean };
type Service = { name: string; description: string; duration: string; price: string; icon: 'dumbbell' | 'sparkle' | 'users' };

const services: Service[] = [
  { name: 'Personal Training', description: 'Un allenamento individuale costruito sui tuoi obiettivi.', duration: '60 minuti', price: '55 €', icon: 'dumbbell' },
  { name: 'Check & Assessment', description: 'Un punto di partenza per capire dove vuoi arrivare.', duration: '45 minuti', price: 'Gratuito', icon: 'sparkle' },
  { name: 'Allenamento di coppia', description: 'Condividi il percorso senza rinunciare alla personalizzazione.', duration: '60 minuti', price: 'Su richiesta', icon: 'users' }
];
const clients = [
  { id: 'luca', name: 'Luca Bianchi', initials: 'LB', note: 'Percorso forza', credits: 4 },
  { id: 'giulia', name: 'Giulia Rossi', initials: 'GR', note: 'Preparazione atletica', credits: 2 },
  { id: 'marco', name: 'Marco Verdi', initials: 'MV', note: 'Mobilità e postura', credits: 1 }
];
const pad = (n: number) => String(n).padStart(2, '0');
const addDays = (date: Date, amount: number) => { const d = new Date(date); d.setDate(d.getDate() + amount); return d; };
const dateKey = (d: Date) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const mondayOf = (d: Date) => addDays(d, -((d.getDay() + 6) % 7));
const dayLabel = (d: Date) => new Intl.DateTimeFormat('it-IT', { weekday: 'long', day: 'numeric', month: 'long' }).format(d);
const shortWeekday = (d: Date) => new Intl.DateTimeFormat('it-IT', { weekday: 'short' }).format(d).replace('.', '');
const dayEquals = (a: Date, b: Date) => dateKey(a) === dateKey(b);
const prettyDate = (date: string) => new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long' }).format(new Date(date + 'T12:00:00'));
const navClient = [
  { id: 'today', label: 'Oggi', icon: House },
  { id: 'book', label: 'Prenota', icon: Plus },
  { id: 'lessons', label: 'Lezioni', icon: CalendarDays },
  { id: 'profile', label: 'Profilo', icon: UserRound }
] as const;
const navCoach = [
  { id: 'overview', label: 'Riepilogo', icon: LayoutGrid },
  { id: 'agenda', label: 'Agenda', icon: CalendarDays },
  { id: 'clients', label: 'Clienti', icon: Users },
  { id: 'manage', label: 'Gestione', icon: SlidersHorizontal }
] as const;

function WeeklyCalendar({ today, selected, changeDay, sessions, weekOffset, changeWeek }: {
  today: Date; selected: Date; changeDay: (date: Date) => void; sessions: Session[];
  weekOffset: number; changeWeek: (offset: number) => void
}) {
  const first = addDays(mondayOf(today), weekOffset * 7);
  const days = Array.from({ length: 7 }, (_, i) => addDays(first, i));
  return <div className="mf-calendar">
    <div className="mf-calendar-heading">
      <div><span className="mf-overline">CALENDARIO</span><h3>{new Intl.DateTimeFormat('it-IT', { month: 'long', year: 'numeric' }).format(first)}</h3></div>
      <div className="mf-calendar-controls">
        <button type="button" onClick={() => { changeWeek(0); changeDay(today); }} className="mf-today-button">Oggi</button>
        <button type="button" aria-label="Settimana precedente" onClick={() => { changeWeek(weekOffset - 1); changeDay(addDays(first, -7)); }}><ChevronLeft size={18}/></button>
        <button type="button" aria-label="Settimana successiva" onClick={() => { changeWeek(weekOffset + 1); changeDay(addDays(first, 7)); }}><ChevronRight size={18}/></button>
      </div>
    </div>
    <div className="mf-week-grid">
      {days.map(d => {
        const selectedDay = dayEquals(d, selected);
        const count = sessions.filter(s => s.date === dateKey(d) && s.status !== 'cancelled').length;
        return <button type="button" key={dateKey(d)} aria-pressed={selectedDay} className={['mf-day', selectedDay ? 'is-selected' : '', dayEquals(d,today) ? 'is-today' : ''].join(' ')} onClick={() => changeDay(d)}>
          <span>{shortWeekday(d)}</span><strong>{d.getDate()}</strong><i className={count ? 'has-events' : ''} aria-label={count ? count + ' appuntamenti' : 'Nessun appuntamento'}/>
        </button>;
      })}
    </div>
    <div className="mf-calendar-foot"><span><i/> Giorno con appuntamenti</span><span>Seleziona un giorno per vedere i dettagli</span></div>
  </div>;
}
function SessionList({ items, role, onChange }: { items: Session[]; role: Role; onChange?: (id: number, status: Status) => void }) {
  if (!items.length) return <div className="mf-empty"><CalendarCheck2 size={25}/><strong>Nessun appuntamento</strong><span>Qui appariranno le lezioni previste per il giorno selezionato.</span></div>;
  return <div className="mf-session-list">{items.slice().sort((a,b) => a.time.localeCompare(b.time)).map(item =>
    <div className="mf-session" key={item.id}>
      <div className="mf-session-time">{item.time}<span>{item.block ? 'Impegno' : '60 min'}</span></div>
      <div className="mf-session-content"><strong>{item.block ? item.title : role === 'coach' ? item.client : item.title}</strong><span>{item.block ? 'Non disponibile' : (role === 'coach' ? item.title + ' · ' : '') + item.venue}</span></div>
      <span className={item.status === 'confirmed' ? 'mf-status confirmed' : item.status === 'cancelled' ? 'mf-status cancelled' : 'mf-status pending'}>{item.block ? 'Bloccato' : item.status === 'confirmed' ? 'Confermata' : item.status === 'cancelled' ? 'Annullata' : 'In attesa'}</span>
      {role === 'coach' && item.status === 'pending' && onChange && <div className="mf-row-actions"><button type="button" title="Approva" aria-label="Approva richiesta" onClick={() => onChange(item.id, 'confirmed')}><Check size={17}/></button><button type="button" title="Rifiuta" aria-label="Rifiuta richiesta" onClick={() => onChange(item.id,'cancelled')}><X size={16}/></button></div>}
    </div>
  )}</div>;
}
function InitialAvatar({ initials }: { initials: string }) { return <div className="mf-avatar">{initials}</div>; }

export default function MinimalFocusPrototype() {
  const [today] = useState(() => { const d = new Date(); d.setHours(12,0,0,0); return d; });
  const [role, setRole] = useState<Role>('client');
  const [clientSection, setClientSection] = useState<ClientSection>('today');
  const [coachSection, setCoachSection] = useState<CoachSection>('overview');
  const [selectedDate, setSelectedDate] = useState(today);
  const [weekOffset, setWeekOffset] = useState(0);
  const [chosenService, setChosenService] = useState<Service | null>(null);
  const [chosenTime, setChosenTime] = useState('17:00');
  const [managementTab, setManagementTab] = useState<'requests'|'hours'|'services'|'notices'>('requests');
  const [clientId, setClientId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');
  const [sessions, setSessions] = useState<Session[]>(() => [
    { id: 1, date: dateKey(today), time: '09:30', title: 'Personal Training', client: 'Luca Bianchi', venue: 'Virgin Active Talenti', status: 'confirmed' },
    { id: 2, date: dateKey(today), time: '12:00', title: 'Check & Assessment', client: 'Giulia Rossi', venue: 'Virgin Active Nuovo Salario', status: 'pending' },
    { id: 3, date: dateKey(addDays(today, 2)), time: '18:30', title: 'Personal Training', client: 'Luca Bianchi', venue: 'Virgin Active Talenti', status: 'confirmed' },
    { id: 4, date: dateKey(addDays(today, 3)), time: '10:00', title: 'Allenamento di coppia', client: 'Marco Verdi', venue: 'Virgin Active Talenti', status: 'confirmed' },
    { id: 5, date: dateKey(addDays(today, 5)), time: '17:00', title: 'Personal Training', client: 'Giulia Rossi', venue: 'Virgin Active Nuovo Salario', status: 'pending' },
    { id: 6, date: dateKey(addDays(today, 8)), time: '09:30', title: 'Personal Training', client: 'Luca Bianchi', venue: 'Virgin Active Talenti', status: 'confirmed' }
  ]);
  const isCoach = role === 'coach';
  const nav = isCoach ? navCoach : navClient;
  const active = isCoach ? coachSection : clientSection;
  const heading = isCoach
    ? { overview: ['Il tuo riepilogo', 'Tutto quello che conta, senza rumore.'], agenda: ['La tua agenda', 'Lezioni e impegni in un unico calendario.'], clients: ['I tuoi clienti', 'Persone, non semplici prenotazioni.'], manage: ['Gestione', 'Gli strumenti operativi quando ti servono.'] }[coachSection]
    : { today: ['Il tuo oggi', 'Un passo alla volta, verso il tuo obiettivo.'], book: ['Prenota una lezione', 'Scegli come e quando allenarti.'], lessons: ['Le tue lezioni', 'Tutti i tuoi appuntamenti, a colpo d’occhio.'], profile: ['Il tuo profilo', 'Il tuo percorso, le tue preferenze.'] }[clientSection];
  const changeRole = (next: Role) => { setRole(next); setSelectedDate(today); setWeekOffset(0); setFeedback(''); };
  const changeDay = (date: Date) => setSelectedDate(date);
  const changeStatus = (id: number, status: Status) => { setSessions(rows => rows.map(s => s.id === id ? { ...s, status } : s)); setFeedback(status === 'confirmed' ? 'Richiesta approvata nella demo.' : 'Richiesta rifiutata nella demo.'); };
  const daySessions = sessions.filter(s => s.date === dateKey(selectedDate) && (isCoach || s.client === 'Luca Bianchi'));
  const nextLesson = useMemo(() => sessions.filter(s => s.client === 'Luca Bianchi' && s.status === 'confirmed' && s.date >= dateKey(today)).sort((a,b) => (a.date + a.time).localeCompare(b.date + b.time))[0], [sessions,today]);
  const coachPending = sessions.filter(s => s.status === 'pending' && !s.block);
  const coachToday = sessions.filter(s => s.date === dateKey(today));
  const switchTab = (id: string) => { if (isCoach) setCoachSection(id as CoachSection); else { setClientSection(id as ClientSection); setChosenService(null); } setFeedback(''); };
  const reserve = () => {
    if (!chosenService) return;
    const next: Session = { id: Date.now(), date: dateKey(selectedDate), time: chosenTime, title: chosenService.name, client: 'Luca Bianchi', venue: 'Virgin Active Talenti', status: 'pending' };
    setSessions(rows => [...rows, next]); setChosenService(null); setClientSection('lessons');
    setFeedback('Richiesta dimostrativa creata. Non è stata inviata alcuna prenotazione reale.');
  };
  const blockTime = () => {
    setSessions(rows => [...rows, { id: Date.now(), date: dateKey(selectedDate), time: '13:00', title: 'Impegno personale', client: '', venue: '', status: 'confirmed', block: true }]);
    setFeedback('Impegno aggiunto solo alla demo.');
  };
  return <div className="mf-root">
    <header className="mf-topbar">
      <div className="mf-topbar-inner">
        <div className="mf-brand"><span>///</span> ALE <b>COACH</b><em>MINIMAL FOCUS</em></div>
        <div className="mf-top-right"><span className="mf-demo-label"><i/> PROTOTIPO INTERATTIVO</span><a className="mf-real-link" href="/?original=1">App attuale <ArrowUpRight size={15}/></a></div>
      </div>
    </header>
    <div className="mf-workspace">
      <aside className="mf-sidebar">
        <div className="mf-sidebar-brand"><div className="mf-sidebar-logo">AC</div><div><strong>{isCoach ? 'Ale Coach' : 'Luca Bianchi'}</strong><span>{isCoach ? 'Area coach' : 'Area atleta'}</span></div></div>
        <span className="mf-sidebar-caption">IL TUO SPAZIO</span>
        <nav aria-label="Navigazione principale" className="mf-desktop-nav">{nav.map(item => <button key={item.id} type="button" aria-current={active === item.id ? 'page' : undefined} className={active === item.id ? 'active' : ''} onClick={() => switchTab(item.id)}><item.icon size={20}/><span>{item.label}</span>{item.id === 'overview' && coachPending.length > 0 && <i>{coachPending.length}</i>}</button>)}</nav>
        <div className="mf-sidebar-bottom"><Sparkles size={18}/><p>Il tuo percorso merita uno spazio semplice.</p></div>
      </aside>
      <main className="mf-main">
        <div className="mf-toolbar"><div className="mf-crumb">ALE COACH <span>/</span> {isCoach ? 'COACH' : 'ATLETA'} <span>/</span> {active.toUpperCase()}</div><div className="mf-toolbar-right"><span>{dayLabel(today)}</span><button type="button" aria-label="Notifiche demo" onClick={() => { if(isCoach) { setCoachSection('manage'); setManagementTab('notices'); } else { setClientSection('profile'); } }}><Bell size={18}/></button><InitialAvatar initials={isCoach ? 'AC' : 'LB'}/></div></div>
        <div className="mf-view-key" key={role + active}>
          <div className="mf-heading"><div><div className="mf-overline">{isCoach ? 'AREA COACH' : 'AREA ATLETA'} <span>·</span> {isCoach ? 'ALE' : 'LUCA'}</div><h1>{heading[0]}</h1><p>{heading[1]}</p></div>{!isCoach && clientSection === 'today' && <button className="mf-action mf-heading-cta" type="button" onClick={() => setClientSection('book')}>Prenota una lezione <ArrowRight size={17}/></button>}{isCoach && coachSection === 'overview' && <button type="button" className="mf-action mf-heading-cta" onClick={() => setCoachSection('agenda')}>Apri agenda <ArrowRight size={17}/></button>}</div>
          {feedback && <div className="mf-feedback" role="status"><CheckCircle2 size={18}/>{feedback}<button aria-label="Chiudi messaggio" type="button" onClick={() => setFeedback('')}><X size={16}/></button></div>}

          {!isCoach && clientSection === 'today' && <>
            <section className="mf-next"><div className="mf-next-top"><span><i/> IL PROSSIMO APPUNTAMENTO</span><span>IL TUO PERCORSO</span></div>{nextLesson ? <div className="mf-next-body"><div><div className="mf-next-day">{prettyDate(nextLesson.date)}</div><div className="mf-next-time">{nextLesson.time}</div><strong>{nextLesson.title}</strong><p><MapPin size={15}/>{nextLesson.venue}</p></div><div className="mf-next-side"><div className="mf-next-number">{Math.max(0,Math.round((new Date(nextLesson.date + 'T12:00:00').getTime() - today.getTime())/86400000))}<span> GIORNI</span></div><span>al prossimo allenamento</span><button type="button" onClick={() => {setClientSection('lessons');setSelectedDate(new Date(nextLesson.date + 'T12:00:00'));setWeekOffset(Math.round((mondayOf(new Date(nextLesson.date + 'T12:00:00')).getTime() - mondayOf(today).getTime()) / 604800000));}}>Dettagli <ArrowRight size={15}/></button></div></div> : <div className="mf-next-empty">Il tuo prossimo allenamento ti aspetta. <button type="button" onClick={() => setClientSection('book')}>Prenota ora</button></div>}</section>
            <div className="mf-stat-grid"><button type="button" className="mf-stat" onClick={() => setClientSection('lessons')}><span>Lezioni in programma</span><strong>{sessions.filter(s => s.client === 'Luca Bianchi' && s.status === 'confirmed' && s.date >= dateKey(today)).length}</strong><small>Vedi il calendario <ArrowUpRight size={14}/></small></button><div className="mf-stat"><span>Crediti disponibili</span><strong>04</strong><small>Il tuo pacchetto attivo</small></div><div className="mf-stat"><span>Il tuo coach</span><strong className="mf-stat-name">Ale</strong><small>Alessandro Cola</small></div></div>
            <section className="mf-panel mf-today-panel"><div className="mf-panel-title"><div><span className="mf-overline">PER TE</span><h2>Continua così.</h2></div><Dumbbell size={25}/></div><p>La costanza costruisce risultati. Ritrova tutte le tue lezioni nel calendario e prenota il prossimo passo quando vuoi.</p><button type="button" className="mf-text-link" onClick={() => setClientSection('lessons')}>Le mie lezioni <ArrowRight size={16}/></button></section>
          </>}

          {!isCoach && clientSection === 'book' && <>{!chosenService ? <>
            <div className="mf-section-heading"><span className="mf-overline">01 / SCEGLI IL SERVIZIO</span><h2>Come vuoi allenarti?</h2></div>
            <div className="mf-service-stack">{services.map((s, idx) => {const Icon = s.icon === 'users' ? Users : s.icon === 'sparkle' ? Sparkles : Dumbbell; return <button type="button" className="mf-service" key={s.name} onClick={() => {setChosenService(s);setSelectedDate(today);setWeekOffset(0);}}><span className="mf-service-icon"><Icon size={23}/></span><span className="mf-service-copy"><strong>{s.name}</strong><small>{s.description}</small><em>{s.duration} · {s.price}</em></span><span className="mf-service-index">0{idx + 1}<ArrowUpRight size={19}/></span></button>})}</div>
          </> : <>
            <button type="button" className="mf-back" onClick={() => setChosenService(null)}><ArrowLeft size={16}/> Cambia servizio</button><div className="mf-selected-service"><span className="mf-overline">02 / PRENOTA IL TUO SLOT</span><h2>{chosenService.name}</h2><p>{chosenService.duration} · {chosenService.price} · Virgin Active Talenti</p></div>
            <WeeklyCalendar today={today} selected={selectedDate} changeDay={changeDay} sessions={sessions.filter(s => s.client === 'Luca Bianchi')} weekOffset={weekOffset} changeWeek={setWeekOffset}/>
            <div className="mf-panel mf-time-panel"><div className="mf-panel-title"><div><span className="mf-overline">{dayLabel(selectedDate)}</span><h2>Orario preferito</h2></div><Clock3 size={22}/></div><div className="mf-time-options">{['09:00','12:00','17:00','18:30'].map(t => <button type="button" key={t} className={chosenTime === t ? 'selected' : ''} onClick={() => setChosenTime(t)}>{t}</button>)}</div><button type="button" className="mf-action" onClick={reserve} disabled={dateKey(selectedDate) < dateKey(today)}>Simula richiesta <ArrowRight size={17}/></button><p className="mf-small-note"><ShieldCheck size={14}/> Anteprima: nessuna prenotazione, pagamento o disponibilità viene inviata al server.</p></div>
          </>}</>}

          {!isCoach && clientSection === 'lessons' && <>
            <WeeklyCalendar today={today} selected={selectedDate} changeDay={changeDay} sessions={sessions.filter(s => s.client === 'Luca Bianchi')} weekOffset={weekOffset} changeWeek={setWeekOffset}/>
            <section className="mf-panel mf-agenda-panel"><div className="mf-panel-title"><div><span className="mf-overline">IL TUO PROGRAMMA</span><h2>{dayLabel(selectedDate)}</h2></div><span className="mf-count-tag">{daySessions.length} LEZIONI</span></div><SessionList items={daySessions} role="client"/></section>
            <button type="button" className="mf-subtle-cta" onClick={() => setClientSection('book')}><Plus size={18}/> Prenota un altro allenamento <ArrowRight size={17}/></button>
          </>}

          {!isCoach && clientSection === 'profile' && <>
            <section className="mf-panel mf-profile-panel"><div className="mf-profile-hero"><InitialAvatar initials="LB"/><div><h2>Luca Bianchi</h2><p>Atleta · Account dimostrativo</p></div></div><div className="mf-detail-grid"><div><span>Email</span><strong>luca.demo@example.com</strong></div><div><span>Club di riferimento</span><strong>Virgin Active Talenti</strong></div><div><span>Pacchetto</span><strong>4 lezioni disponibili</strong></div><div><span>Coach</span><strong>Alessandro Cola</strong></div></div></section>
            <section className="mf-panel mf-settings-list"><h2>Il tuo spazio</h2><div><CreditCard size={19}/> Pacchetti e crediti <span>4 disponibili</span></div><div><Bell size={19}/> Notifiche <span>Attive (demo)</span></div><div><ShieldCheck size={19}/> Privacy e sicurezza <span>Anteprima</span></div></section>
          </>}

          {isCoach && coachSection === 'overview' && <>
            <div className="mf-stat-grid coach-stats"><button type="button" className="mf-stat" onClick={() => setCoachSection('agenda')}><span>Lezioni oggi</span><strong>{coachToday.filter(s => s.status === 'confirmed').length}</strong><small>Apri agenda <ArrowUpRight size={14}/></small></button><button type="button" className="mf-stat mf-stat-accent" onClick={() => {setCoachSection('manage');setManagementTab('requests');}}><span>Richieste in attesa</span><strong>{coachPending.length}</strong><small>Da gestire <ArrowUpRight size={14}/></small></button><button type="button" className="mf-stat" onClick={() => setCoachSection('clients')}><span>Clienti attivi</span><strong>03</strong><small>Visualizza clienti <ArrowUpRight size={14}/></small></button></div>
            <section className="mf-panel mf-agenda-panel"><div className="mf-panel-title"><div><span className="mf-overline">AGENDA DI OGGI</span><h2>{dayLabel(today)}</h2></div><button type="button" className="mf-text-link" onClick={() => {setCoachSection('agenda');setSelectedDate(today);setWeekOffset(0);}}>Apri agenda <ArrowRight size={16}/></button></div><SessionList items={coachToday} role="coach" onChange={changeStatus}/></section>
            <section className="mf-panel mf-coach-note"><span className="mf-overline">FOCUS</span><h2>Un'agenda chiara. Più tempo per i tuoi clienti.</h2><p>Le richieste, le lezioni e le impostazioni hanno ciascuna il proprio spazio. Nessun pannello fisso che si ripete a ogni cambio pagina.</p></section>
          </>}

          {isCoach && coachSection === 'agenda' && <>
            <WeeklyCalendar today={today} selected={selectedDate} changeDay={changeDay} sessions={sessions} weekOffset={weekOffset} changeWeek={setWeekOffset}/>
            <section className="mf-panel mf-agenda-panel"><div className="mf-panel-title"><div><span className="mf-overline">APPUNTAMENTI E DISPONIBILITÀ</span><h2>{dayLabel(selectedDate)}</h2></div><button className="mf-outline-button" type="button" onClick={blockTime}><Plus size={15}/> Blocca le 13:00</button></div><SessionList items={daySessions} role="coach" onChange={changeStatus}/></section>
            <p className="mf-small-note"><ShieldCheck size={15}/> Le modifiche in questa anteprima rimangono nel browser. La versione reale mantiene le verifiche Supabase sugli slot.</p>
          </>}

          {isCoach && coachSection === 'clients' && <>
            <div className="mf-section-heading"><span className="mf-overline">I TUOI ATLETI</span><h2>{clientId ? 'Dettaglio cliente' : 'Persone e percorsi'}</h2></div>
            {clientId ? <><button type="button" className="mf-back" onClick={() => setClientId(null)}><ArrowLeft size={16}/> Tutti i clienti</button>{clients.filter(c => c.id === clientId).map(c => <section className="mf-panel mf-client-detail" key={c.id}><div className="mf-profile-hero"><InitialAvatar initials={c.initials}/><div><h2>{c.name}</h2><p>{c.note}</p></div></div><div className="mf-stat-grid mf-client-stats"><div className="mf-stat"><span>Crediti residui</span><strong>{c.credits}</strong></div><div className="mf-stat"><span>Stato</span><strong className="mf-stat-name">Attivo</strong></div></div><h3>Prossimi allenamenti</h3><SessionList role="coach" items={sessions.filter(s => s.client === c.name && s.date >= dateKey(today))}/></section>)}</> : <div className="mf-client-list">{clients.map(c => <button type="button" className="mf-client-row" key={c.id} onClick={() => setClientId(c.id)}><InitialAvatar initials={c.initials}/><span><strong>{c.name}</strong><small>{c.note}</small></span><em>{c.credits} crediti</em><ArrowRight size={18}/></button>)}</div>}
          </>}

          {isCoach && coachSection === 'manage' && <>
            <nav className="mf-pills" aria-label="Sezioni gestione">{([{id:'requests',label:'Richieste'},{id:'hours',label:'Orari'},{id:'services',label:'Servizi'},{id:'notices',label:'Notifiche'}] as const).map(item => <button type="button" key={item.id} className={managementTab === item.id ? 'active' : ''} onClick={() => setManagementTab(item.id)}>{item.label}{item.id === 'requests' && coachPending.length > 0 && <b>{coachPending.length}</b>}</button>)}</nav>
            {managementTab === 'requests' && <section className="mf-panel mf-agenda-panel"><div className="mf-panel-title"><div><span className="mf-overline">PRENOTAZIONI</span><h2>Da confermare</h2></div><span className="mf-count-tag">{coachPending.length} RICHIESTE</span></div><SessionList role="coach" items={coachPending} onChange={changeStatus}/></section>}
            {managementTab === 'hours' && <section className="mf-panel mf-settings-list"><div className="mf-panel-title"><div><span className="mf-overline">DISPONIBILITÀ</span><h2>Orari e sedi</h2></div><Settings2 size={20}/></div><div><Clock3 size={19}/> Fasce orarie <span>Configurazione demo</span></div><div><MapPin size={19}/> Virgin Active Talenti <span>Attiva</span></div><div><MapPin size={19}/> Virgin Active Nuovo Salario <span>Attiva</span></div><p className="mf-small-note">Nella versione reale le disponibilità restano collegate alle regole e alle verifiche del calendario interno.</p></section>}
            {managementTab === 'services' && <section className="mf-panel mf-settings-list"><div className="mf-panel-title"><div><span className="mf-overline">CATALOGO</span><h2>Servizi disponibili</h2></div><Dumbbell size={20}/></div>{services.map(s => <div key={s.name}><CheckCircle2 size={19}/>{s.name}<span>{s.price}</span></div>)}</section>}
            {managementTab === 'notices' && <section className="mf-panel mf-settings-list"><div className="mf-panel-title"><div><span className="mf-overline">COMUNICAZIONI</span><h2>Notifiche</h2></div><Bell size={20}/></div><div><Bell size={19}/> Nuova richiesta da Giulia <span>Da verificare</span></div><p className="mf-small-note">Contenuto dimostrativo. Le notifiche vere restano nella versione operativa.</p></section>}
          </>}
        </div>
      </main>
    </div>
    <nav className="mf-mobile-nav" aria-label="Navigazione mobile">{nav.map(item => <button type="button" key={item.id} className={active === item.id ? 'active' : ''} onClick={() => switchTab(item.id)}><item.icon size={21}/><span>{item.label}</span></button>)}</nav>
    <div className="mf-role-switch" aria-label="Seleziona ruolo da visualizzare"><span>VISTA DEMO</span><button type="button" className={role === 'client' ? 'active' : ''} onClick={() => changeRole('client')}>Atleta</button><button type="button" className={role === 'coach' ? 'active' : ''} onClick={() => changeRole('coach')}>Coach</button></div>
    <footer className="mf-footer">Anteprima Minimal Focus · dati simulati · nessuna operazione sul database <span>Designed for ALE COACH</span></footer>
  </div>;
}
