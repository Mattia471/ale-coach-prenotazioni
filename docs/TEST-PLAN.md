# Ale Coach · Piano di collaudo sul solo Supabase Cloud

**Ambiente unico:** progetto Ale Coach (`mmtnzjdvvlouiwgrydlf`) e frontend https://ale-coach-prenotazioni.vercel.app.
Non utilizzare Docker, database locale o seed automatici. Il database è reale: non inserire dati personali di terzi senza autorizzazione, non alterare pagamenti reali per effettuare prove.

## Checkpoint Stripe manual capture (4 novembre 2026)

- [x] Richiesta `authorizing` privata prima del checkout, coach vede solo `authorized`.
- [x] Checkout con `capture_method=manual`, approvazione/rifiuto tramite Edge Function.
- [x] Webhook Stripe Sandbox ascolta completamento, scadenza, cattura e annullamento.
- [x] Deploy Vercel sul dominio di collaudo; build TypeScript e test esistenti superati.
- [ ] **Da testare**: checkout con carta Stripe di prova e webhook firmato `requires_capture`.
- [ ] **Da testare**: approvazione e incasso usando l'agenda interna, rifiuto, doppie esecuzioni, scadenza autorizzazione e compensazione.
- [ ] Blocco GO LIVE: cron automatico per annullare preautorizzazioni scadute e riconciliazione degli errori dopo l'incasso.

## Checkpoint del giorno 1, 4 novembre 2026

- [x] Modifiche SQL privilegio minimo applicate: niente TRUNCATE o modifica diretta degli ordini via browser.
- [x] Account email del dominio confermato; ruolo coach non assegnato senza verifica.
- [x] Import Edge Runtime compatibile `npm:@supabase/supabase-js@2`; prima c'era un errore `tslib`.
- [x] Webhook Stripe senza configurazione restituisce HTTP 503, non errore runtime 500.
- [x] Google sync senza segreto restituisce HTTP 401.
- [x] Push webhook senza segreto restituisce HTTP 401.
- [x] `create-checkout`, `cancel-booking`, `stripe-webhook` richiedono abilitazione esplicita e separano modalità test/live.
- [ ] Segreti Stripe test configurati nell'account del coach e sottoscrizione webhook firmato, vedi [STRIPE-SETUP.md](STRIPE-SETUP.md).
- [ ] Verificare un webhook Stripe **firmato**, con evento test e idempotenza.
- [ ] Preautorizzazione/cattura manuale v2: **non ancora implementata**.
- [x] Backend indipendente da Google Calendar per il controllo di prenotazioni interne (migrazione di release base applicata).

## Già verificato

- [x] Progetto Supabase cloud nell'organizzazione Ale Coach, regione `eu-west-1`, attivo.
- [x] Sei migrazioni schema applicate, più hardening dei permessi RPC e cron.
- [x] Catalogo 6 servizi, 2 sedi, 4 pacchetti e 10 finestre disponibili.
- [x] RPC `available_slots_v2` restituisce slot ogni 15 minuti dalla base dati reale.
- [x] `anon` non può eseguire funzioni `SECURITY DEFINER` privilegiate.
- [x] Edge Functions distribuite su progetto cloud, con JWT sulle due funzioni per utenti loggati e verifica server dei webhook.
- [x] Job `ale-coach-expire-bookings` schedulato su pg_cron ogni 5 minuti.
- [x] React/TypeScript e unit test compilano; `npm test` non scrive nel database.
- [x] Vercel HTTPS con backend pubblicato, siti `/` e `/privacy` raggiungibili.

## Accessi e GDPR (prima del primo account vero)

- [ ] Completare e approvare le pagine /privacy, /termini e /cookie, data retention, dati del titolare e DPA fornitori.
- [ ] Impostare SMTP transazionale del dominio e URL di conferma/recupero password in Supabase Dashboard.
- [ ] Creare un account coach verificato, assegnare ruolo coach dal database soltanto all'utente approvato.
- [ ] Creare utenti di collaudo esplicitamente autorizzati. Non usare email o telefoni reali di clienti senza consenso adeguato.
- [ ] Testare che un cliente non possa leggere/aggiornare profili, prenotazioni, importi o crediti di altri.
- [ ] Testare che ruolo coach e autorizzazione pagamento in palestra non siano modificabili dall'utente.
- [ ] Confermare tramite API che Storage neghi gli upload sanitari e che esportazione dati non includa altri utenti.

## Calendario e booking

- [ ] Sette giorni consecutivi con finestre diverse, sedi corrette e domenica non prenotabile.
- [ ] Regole 12 ore–42 giorni, slot ogni 15', durata reale 15/30/45/60 minuti e timezone Europe/Rome.
- [ ] Due account chiedono lo stesso slot: uno solo riesce; nessun doppio appuntamento tra le due sedi.
- [ ] Hold di 10 minuti: il secondo cliente non può occupare lo slot, cambio scelta libera il precedente, TTL scaduto si libera.
- [ ] Buffer 10 minuti PT, corsi 15' prima/10' dopo, 45' trasferimento club, date chiusura applicate.
- [ ] Sconto ALECOACH15, 15% solo prima individuale, da 55 € a 46,75 €.
- [ ] Il coach modifica fasce/chiusure senza consentire collisioni sulle prenotazioni già confermate.
- [ ] Cron scadenze funziona su una richiesta scaduta senza prenotazioni reali coinvolte.

## Google Calendar (extra opzionale escluso dalla v1)

Non è un prerequisito per pubblicare l'app base. Non attivare OAuth, token o cron senza richiesta e preventivo aggiuntivo. Per la release attuale verificare invece che il coach possa approvare dopo i controlli interni e che il database rifiuti sovrapposizioni e giorni chiusi.

## Stripe, acquisti e rimborsi: **NON autorizzati per il live**

- [ ] Integrare la preautorizzazione della carta all'invio richiesta dalla v2 e la cattura dopo l'approvazione.
- [ ] Testare pagamento riuscito, rifiutato e scaduto, webhook firmato, retry e due eventi simultanei senza doppio credito.
- [ ] Flex 5/10 a 250/450 €, durata 3/6 mesi calendario, scadenza e consumi corretti.
- [ ] Continuity 4/8 a 150/260 €/mese, vincolo 2 mesi e rinnovi Stripe Billing.
- [ ] Annullamento e rimborso riconciliati con Stripe, anche se il DB fallisce.
- [ ] Spostamenti di lezione atomici, recupero e proroga crediti nel rispetto del contratto.

## Controlli operativi

- [ ] Security Advisor Supabase riesaminato, ruoli e funzioni `SECURITY DEFINER` sottoposti ad audit.
- [ ] Backup cifrato fuori Supabase Free e ripristino verificato.
- [ ] Monitorare errori Edge Functions, pg_cron, Auth ed eventi Stripe.
- [ ] Verificare da smartphone il percorso cliente e coach.
- [ ] Correggere qualunque errore P0 prima della pubblicazione commerciale.

**Regola:** finché i test contrassegnati per GDPR, pagamenti, concorrenza e calendario non sono completati, niente incassi reali e niente apertura al pubblico.


## Regressione PWA mobile e recupero password (4 novembre 2026)

- iPhone da schermata Home: aprire login, digitare e passare tra i campi senza zoom automatico né perdita del focus; verificare anche gli step di prenotazione e il tastierino degli orari.
- Verificare che lo zoom manuale e le funzioni di accessibilità rimangano disponibili e che il layout non scorra lateralmente.
- Da un account di collaudo autorizzato, richiedere il recupero password, aprire il link ricevuto via email, inserire due password diverse (errore atteso) e poi una coppia valida: confermare il salvataggio e il successivo accesso.
- Link di recupero scaduto: la password non deve cambiare; richiedere un nuovo link. Verificare i redirect autorizzati su Supabase Auth e le mail via SMTP.
- Push: controllare che il banner sia visibile dopo login sul dispositivo senza subscription, non richieda permessi in automatico e sparisca quando la subscription è registrata. Testare la ricezione reale a schermo bloccato.
- La build e i test CI verificano la correttezza statica ma non sostituiscono i test E2E su iPhone, Stripe Sandbox e agenda interna.


## Agenda base senza integrazione Google (feature premium esclusa)
- [ ] Accedere come coach: Disponibilità > blocco orario manuale. Inserire impegno di 60 minuti, verificare che gli slot in entrambe le sedi risultino bloccati tenendo conto dei 45 minuti di trasferimento.
- [ ] Disattivare e riattivare un blocco, verificare la disponibilità pubblica; eliminare un blocco manuale e verificare la ricomparsa dello slot.
- [ ] Creare una chiusura per intera giornata; verificare che non si possano prenotare nuovi slot nel giorno e che gli altri giorni restino invariati.
- [ ] Ripetere come cliente: la RLS deve impedire insert, update e delete su calendar_course_blocks e calendar_closures.
- [ ] Lezioni già confermate: blocchi manuali successivi non devono annullarle né incassare automaticamente; verificare l'avviso e un eventuale conflitto manualmente.
- [ ] Stripe Sandbox: per prenotazione in attesa, la conferma controlla sempre l'agenda interna senza richiedere Google Calendar.
- [ ] Nessun account o credenziale Google da attivare; l'integrazione si realizzerà solo su richiesta con un preventivo separato.
