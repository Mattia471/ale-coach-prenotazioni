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


## Test manuali per l'agenda base senza Google Calendar
- [ ] Coach: crea impegno orario con data, descrizione e sede. Gli slot sovrapposti in entrambe le sedi devono sparire, con buffer di trasferimento.
- [ ] Coach: disattiva, riattiva ed elimina il solo impegno manuale. Il calendario deve aggiornare le disponibilità.
- [ ] Coach: crea chiusura giornaliera e verifica che la data non sia prenotabile.
- [ ] Client: tentativi di INSERT/UPDATE/DELETE su calendar_course_blocks e calendar_closures devono essere rifiutati dalle RLS.
- [ ] Blocchi inseriti dopo una prenotazione confermata non annullano automaticamente la lezione: controllare gli impegni già registrati.
- [ ] Conferma Stripe Sandbox: usa la sola agenda interna, senza credenziali o chiamate a Google.


## Checkpoint QA cloud del 10 novembre 2026 (sola lettura)

Risultati osservati alla data indicata, non certificazione di idoneità al lancio.

- [x] Vercel: versione di produzione approvata del 6 novembre, deployment READY.
- [x] Supabase ACTIVE_HEALTHY; RLS abilitata su tutte le 17 tabelle applicative pubbliche.
- [x] Transazioni READ ONLY: senza identità o con ruolo anon nessun profilo, prenotazione, notifica o credito visibile; con identità cliente visibili solo record propri; con ruolo coach visibili i record consentiti.
- [x] Un cliente non può eseguire coach_set_in_person né coach_decide_booking: entrambe le RPC rifiutano con messaggio di autorizzazione. Nessun dato alterato.
- [x] Gli utenti autenticati non possono aggiornare profiles.role, profiles.allow_in_person né notifications.title: privilegi di colonna verificati.
- [x] Nessuna sovrapposizione tra le due prenotazioni confermate; nessuna hold attiva o scaduta al momento del controllo.
- [x] available_slots_v2 invocata in sola lettura come cliente su sette date future: restituisce disponibilità nei giorni di attività, nessuna negli altri giorni del campione. Non sostituisce una prova anti-overbooking con due utenti.
- [x] Cron scadenze e riconciliazione Stripe attivi, 288 esecuzioni ciascuno nelle 24h precedenti, zero esiti non riusciti.
- [x] package_checkout_orders senza policy RLS e senza privilegi diretti anon/authenticated: tabella server-only, avviso informativo non equivale a esposizione.
- [ ] Security Advisor: 12 RPC SECURITY DEFINER eseguibili da utenti autenticati; i corpi contengono controlli di identità o ruolo, ma serve test negativo completo sulle singole funzioni.
- [ ] Auth: protezione da password compromesse disabilitata; abilitare e verificare se disponibile.
- [ ] E2E di creazione, approvazione/rifiuto, conflitti e cancellazione con due account autorizzati: non eseguito per evitare modifiche reali al cloud.
- [ ] Stripe Sandbox: preautorizzazione, cattura, annullamento, webhook, scadenze e rimborsi ancora da validare.
- [ ] Disdette e rimborsi parziali (issue #5), crediti Flex (issue #15), approvazioni GDPR/Termini, SMTP e backup/restore ancora da completare.

Issue #8: navigazione notifica-prenotazione già presente; in branch di revisione viene aggiunto il passaggio automatico a letta, subordinato a CI e verifica su dispositivo.

Regola GO/NO-GO: non attivare incassi live né accesso commerciale prima di completare test e approvazioni.


## Checkpoint Stripe Sandbox del 10 novembre 2026 (verifica in sola lettura)

Questo checkpoint documenta la riconciliazione di eventi **già avvenuti**, non l'esecuzione di nuovi pagamenti né il completamento del collaudo E2E.

- [x] Account collegato: Alessandro Cola **sandbox/test**, nessuna verifica su denaro reale.
- [x] Stripe: 1 endpoint webhook attivo verso Supabase; eventi previsti `checkout.session.completed`, `checkout.session.expired`, `payment_intent.succeeded`, `payment_intent.canceled`.
- [x] Eventi Stripe osservati (ultimi 30 giorni): 33; filtro sugli eventi con consegne non riuscite o ancora pendenti: 0.
- [x] Quattro PaymentIntent di test con cattura manuale associati a quattro booking nel DB: approvato/pagato, rifiutato/non pagato, annullato/non pagato, scaduto/non pagato.
- [x] Flex 5: un checkout di 250,00 € pagato corrisponde a **un** portafoglio crediti con 4 crediti residui su 5 e scadenza a circa 3 mesi.
- [x] Ordini Flex `expired` e `pending` non hanno generato wallet.
- [x] Individuato un checkout Flex scaduto e non pagato su Stripe ma rimasto `pending` nel DB: la funzione webhook precedente ignorava `checkout.session.expired` con `kind='package'`. Correzione integrata tramite PR #31 e successivamente distribuita su Supabase Edge Function `stripe-webhook` v11 l'11/11/2026. Il test end-to-end con nuovo evento firmato rimane aperto.
- [x] Hardening di `cancel_unpaid_booking` per identità nulla integrato tramite PR #30; migrazione applicata al database cloud l'11/11/2026 (`cancel_unpaid_booking_null_identity`) e verificata su definizione, finestra 24h e privilegi.

**Ancora P0 aperti:** nuovo test end-to-end del webhook v11 con evento firmato e retry/idempotenza, concorrenza di due utenti su ultimo slot/credito, test negativo delle RPC su account autorizzati, Auth/SMTP, GDPR e backup/restore. Nessuna attivazione di incassi live o Cloudflare live prima del GO.

## Checkpoint cloud dell'11 novembre 2026 (dopo il deploy controllato)

- [x] `stripe-webhook` aggiornata da v10 a **v11** sul progetto Supabase Ale Coach; mantenuto `verify_jwt=false` per la firma di Stripe, verificata all'interno dell'handler. Il codice distribuito differisce dalla v10 soltanto per il ramo di scadenza Flex e una guardia esplicita sul secret.
- [x] Checkout Flex 5 da 250 € rimasto `pending`: Stripe Sandbox conferma `expired`, `unpaid`, ordine associato corretto e nessun PaymentIntent. Riconciliato con UPDATE a una sola riga, vincolato a session ID, importo, stato e assenza wallet.
- [x] Ordini pacchetti dopo la riconciliazione: **1 pagato, 2 scaduti, 0 sospesi**. Nessun wallet collegato a ordini non pagati.
- [x] Migrazione `cancel_unpaid_booking_null_identity` applicata sul cloud: vecchio confronto SQL `<>` con `auth.uid()` nullo sostituito da `IS DISTINCT FROM`. Il controllo logico è stato verificato con quattro casi (proprietario, altro cliente, coach, identità assente) prima dell'applicazione. Permessi `anon=false`, `authenticated=true`, invariati.
- [x] Monitoraggio dei due cron nelle 24 ore precedenti: 288 esecuzioni riuscite ciascuno, **0 fallite**. Nessuna prenotazione `processing` oltre due ore, wallet negativi o ordini Flex scaduti rimasti `pending` al controllo.
- [x] Supabase Health Advisor: nessun rilievo.
- [ ] **Non equivale a collaudo E2E:** da ripetere con flussi isolati e due clienti; non è stato inviato un nuovo webhook firmato dopo la v11 né effettuato un vero test con carta per questo checkpoint.
- [ ] Security Advisor continua a segnalare 12 RPC `SECURITY DEFINER` accessibili ad authenticated (revisione di autorizzazioni necessaria) e protezione dalle password compromesse disabilitata; la tabella `package_checkout_orders` è server-only e senza permessi browser.
- [ ] Per Cloudflare: creare Pages nell'account del cliente, configurare Auth/allowlist origini e verificare login, checkout Sandbox e redirect prima di modificare il dominio pubblico.



## Checkpoint P0 autorizzazioni (11 novembre 2026, sessione QA)

**Eseguiti senza dati di prova persistenti** sul cloud del cliente. Script ripetibile: [QA-RPC-RLS-READONLY.sql](QA-RPC-RLS-READONLY.sql).

- [x] Sessione SQL `authenticated` con un profilo `client` esistente, senza esposizione di ID o dati personali; `private.is_coach()=false`.
- [x] In `READ ONLY` il cliente non vede record di altri utenti in `profiles`, `bookings`, `notifications`, `wallet_credits` e `slot_holds`. `package_checkout_orders` resta priva di SELECT browser.
- [x] Sei RPC con privilegi coach verificati con test **negativi effettivi** da ruolo cliente: `coach_set_in_person`, `coach_set_booking_method`, `coach_mark_in_person_paid`, `coach_decide_booking`, `coach_classify_external_event`, `claim_booking_decision`. Tutte hanno negato l'operazione prima della scrittura.
- [x] Due RPC di cancellazione `claim_booking_cancellation` e `cancel_unpaid_booking` testate con UUID assente e controllo preliminare del guard SQL. Esecuzione in transazione esplicitamente **ROLLBACK**, perché `SELECT FOR UPDATE` non funziona in una transazione `READ ONLY`.
- [x] Script eseguito su Supabase senza errori e protetto dal test di regressione CI che verifica transazioni, ruolo, limiti di tempo e rollback.

**Attenzione:** l'identità SQL simulata a partire da un profilo cliente è un collaudo amministrativo dei controlli database, **non** una sessione browser con JWT verificato. Non sostituisce test reali con due account di prova, concorrenza ultimo slot/credito, permessi nelle altre RPC (12 avvisi in totale), né collaudo di webhook e pagamenti.


## CI anti-overbooking e ultimo credito (test isolati, 11/11/2026)

Lo script scripts/qa-concurrency.mjs è predisposto per una **istanza PostgreSQL 17 temporanea nel runner GitHub Actions**, con connessione obbligatoria a localhost/alecoach_ci (non accetta database esterni). I test sono concorrenti e usano due vere connessioni PostgreSQL, non chiamate sequenziali né dati simulati in UI.

Casi coperti, superati in CI sul database PostgreSQL temporaneo:
- [x] Due clienti tentano contemporaneamente di inserire lo stesso intervallo in sedi differenti: un solo booking resta attivo grazie al vincolo di esclusione GiST.
- [x] Due clienti tentano di prelevare l'ultimo credito con FOR UPDATE SKIP LOCKED: un solo addebito riesce e il saldo non diventa negativo.
- [x] Se un booking va in conflitto dopo il consumo del credito nella stessa transazione, il rollback ripristina il credito.
- [x] Una prenotazione rifiutata libera lo slot per una nuova prenotazione confermata.

**Limite:** lo schema minimo del test riproduce i vincoli e gli statement PostgreSQL essenziali delle migrazioni verificate nel repository, ma non invoca la RPC reale di Supabase con utenti e Stripe. Il collaudo completo end-to-end in un ambiente isolato resta obbligatorio prima dell'apertura commerciale. Nessun dato, segreto o chiave del cliente è accessibile al runner.
