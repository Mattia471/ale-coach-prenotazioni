# Tracciabilità requisiti

**Specifica prevalente:** `Ale_Coach_Specifica_Calendario_Listino.docx`, versione 2 del 4 novembre 2026. La specifica originaria del 3 novembre resta storica. Confronto dettagliato: [V2-DELTA.md](V2-DELTA.md).

| Specifica | Stato nel codice | Note |
| --- | --- | --- |
| Aree cliente e coach separate | Implementato | Ruolo protetto da RLS; nessun selettore pubblico in produzione |
| Colloquio conoscitivo 15 min gratis | Implementato | Richiede approvazione |
| Individuale 60m 55 €, Duo 60m 80 € | Implementato | Discipline e nome partner |
| Check scheda 30m 35 € | Implementato senza upload | Upload PDF/JPG/PNG disabilitato nella prima release per minimizzazione dati sanitari; RLS Storage nega l'inserimento |
| Valutazione iniziale 45m 50 € | Implementato parzialmente | Informazioni sanitarie omesse finché manca privacy specifica |
| Altro su preventivo | Implementato | Coach stabilisce importo, Stripe dopo accettazione |
| Virgin Active, sedi Talenti e Nuovo Salario | Implementato | Blocca prenotazione se non iscritto |
| Finestre multiple per sede e corsi 19/10–30/11 | Implementato | Modificabili dal coach, dom chiuso |
| Giorni prenotabili da 12 ore a 42 giorni, griglia 15 minuti | Implementato | RPC orari reali, nessun slot fittizio |
| Approvazione coach entro 24 h | Implementato | Richiede job cron in Supabase |
| Pagamento approvato dopo conferma | Implementato come checkout successivo | **Non conforme v2:** richiesta preautorizzazione all’invio, incasso alla conferma; implementazione Stripe da completare |
| Pagamento in presenza solo su permesso coach | Implementato | Default disabilitato per tutti |
| Disdetta almeno 24 h, rimborso online | Implementato con function Stripe | Da collaudare con account Stripe test |
| Promozione prima lezione | Implementato | **ALECOACH15 15% sulla sola prima individuale: 46,75 €**, prevale sulla vecchia tabella CORSI/ONLINE |
| Pacchetto 5/10, crediti con scadenza | Predisposto | Acquisto Stripe singolo e wallet attivato con webhook |
| Continuity 4/8 a 150/260 €/mese, minimo 2 mesi | Solo catalogo | Billing ricorrente da integrare con Price ID reali |
| Notifiche in-app | Implementato | DB + Realtime quando configurato |
| Push iOS/Android | Predisposto | Da configurare VAPID e Database Webhook |
| DM Instagram `FORZA` | Link tracciato | Automazione DM da connettere a Meta |
| Codice amico personalizzato | Link generico | Generazione/verifica referral personalizzati non ancora sviluppata |
| Instagram bio/Meta/QR palestra | Implementato | QR usa **ALECOACH15** |
| Login e password | Implementato | Supabase Auth (necessita progetto dedicato) |
| Google Calendar occupazioni | Predisposto, **non collegato** | Edge Function protetta da secret; serve OAuth del coach, cron e collaudo |
| Informative privacy e termini validati | Bozze presenti, approvazione obbligatoria | `/privacy`, `/termini`, `/cookie`, `npm run release:build` e [GDPR-COMPLIANCE.md](GDPR-COMPLIANCE.md) |

## Decisione di prodotto v2

La specifica del 4 novembre prevale sul vecchio PDF: ALECOACH15 sostituisce ALECOACH10; le nuove disponibilità sono per sede e a quarti d'ora. La **preautorizzazione Stripe prima dell'approvazione non è ancora sviluppata**. Anche Continuity, rinnovi mensili, rescheduling conservativo, promemoria e integrazione Google operativa restano blocchi prima del lancio con incassi.

Per stato dettagliato e requisiti non ancora soddisfatti vedi [V2-DELTA.md](V2-DELTA.md).
