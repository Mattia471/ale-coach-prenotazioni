import type { Booking } from './types';

export function isArchivedBooking(b:Booking,now=Date.now()){return ['cancelled','rejected','expired'].includes(b.status)||(b.status==='confirmed'&&Boolean(b.starts_at)&&new Date(b.starts_at!).getTime()+b.duration_minutes*60000<=now)}
export function refundSummary(b:Booking){
 const amount=b.refunded_amount_cents||0;
 if(b.payment_mode==='credit'&&b.payment_status==='refunded')return 'Il credito Flex è stato restituito con la scadenza originaria.';
 if(b.payment_mode==='online'&&amount>0){const share=amount===b.amount_cents?'integrale':amount===Math.round(b.amount_cents/2)?'del 50%':'parziale';return `Rimborso ${share} di ${new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR'}).format(amount/100)} ${b.refunded_at?'avviato sul metodo originale. L’accredito dipende dai tempi della tua banca.':'richiesto, in attesa di conferma.'}`;}
 if(b.payment_mode==='online'&&b.payment_status==='refunded'&&amount<=0)return 'Rimborso registrato. Contatta Ale per verificare l’importo.';
 if(['cancelled','rejected','expired'].includes(b.status)&&b.payment_mode==='online'&&b.payment_status==='unpaid'&&!b.paid_at)return 'Nessun importo incassato: non è necessario un rimborso.';
 if(b.status==='cancelled'&&b.payment_mode==='in_person'&&b.payment_status==='refunded')return 'Rimborso in presenza registrato dal coach.';
 if(b.status==='cancelled'&&b.payment_mode==='in_person'&&b.payment_status==='unpaid')return 'Nessun pagamento da effettuare.';
 return null;
}
