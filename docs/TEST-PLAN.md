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


## Backup Free Plan | Procedura preparata (11/11/2026)

- [x] Piano Supabase verificato: organizzazione cliente **Free**. Backup giornalieri gestiti non disponibili.
- [x] Script di dump logico con cifratura immediata age, senza output temporaneo in chiaro o password in CLI: scripts/backup-cloud-encrypted.sh.
- [x] Script verifica decrittazione autenticata e firma PGDMP **solo in memoria**: scripts/verify-encrypted-backup.sh.
- [x] Runbook con file Supabase Storage da salvare separatamente, custodia chiavi e ripristino solo su ambiente isolato: [BACKUP-RESTORE-RUNBOOK.md](BACKUP-RESTORE-RUNBOOK.md).
- [ ] **P0 aperto:** eseguire primo backup reale con il titolare autorizzato e verificare la copia offsite.
- [ ] **P0 aperto:** prova di ripristino completo su progetto isolato, incluso Auth/Storage, senza sostituire Supabase live.

Nessun dump, secret o password è stato esportato né inserito nel repository.


## Checkpoint 11/11: accesso senza JWT alle RPC prenotazione

- [x] Ruolo PostgreSQL authenticated ma identità auth.uid() assente: create_booking_v2 nega la chiamata con il messaggio di autenticazione previsto.
- [x] Stesso contesto senza JWT: reserve_slot_v2 nega la prenotazione dello slot prima di scritture.
- [x] Entrambi verificati in transazione PostgreSQL READ ONLY, ora ripetibili nel terzo blocco dello script QA-RPC-RLS-READONLY.sql.
- [ ] Restano da verificare con sessioni reali il comportamento delle RPC read-only di disponibilità e il rilascio slot, oltre ai casi E2E con due clienti autenticati.

In totale: **10 controlli negativi RPC superati** nei blocchi database di questo checkpoint, senza modifiche persistenti.

- [x] CI release indipendente da download age: bash syntax + controlli Node restano obbligatori. Prova di cifratura age con dati sintetici disponibile nel workflow manuale `.github/workflows/backup-crypto-smoke.yml`, già superata nel run della PR #37. Un successivo run può dipendere dalla disponibilità del mirror Ubuntu.


## CORS Cloudflare | Checkpoint 11/11/2026

- [x] `create-checkout` v11, `cancel-booking` v10, `decide-booking` v3 distribuite su Supabase. Confrontate con `main`: logica commerciale invariata, `verify_jwt=true` mantenuto, modulo `_shared/trusted-origins.ts` distribuito per ciascuna.
- [x] Test Deno `trusted-origins_test.ts` già inclusi in CI; nuovo script `scripts/qa-cors-preflight.mjs` testabile in Node con risposte simulate e senza credenziali.
- [x] **Test remoto reale dal runner GitHub:** tutte e tre le Edge Functions hanno risposto correttamente al preflight `OPTIONS` con origine Vercel approvata e hanno rifiutato `https://evil.example` senza header CORS. Eseguito senza JWT, API key, prenotazioni o pagamenti; run [43045747412](https://github.com/Mattia471/ale-coach-prenotazioni/actions/runs/43045747412) (11/11/2026). La PR temporanea #40 usata per la prova è stata chiusa senza merge per non creare dipendenza di rete nella CI quotidiana.
- [ ] Test reale **Cloudflare** dopo configurazione `ADDITIONAL_APP_ORIGINS` / `PUBLIC_APP_URL` e redirect Supabase Auth. Non ancora verificato; l'esito Vercel non implica automaticamente che il nuovo dominio sia abilitato.
- [ ] Da verificare separatamente redirect di login/recupero password e checkout Stripe Sandbox dai nuovi host. Nessuna apertura pubblica prima del GO.


## Test del webhook firmato con backend simulato (11 novembre 2026)

La CI avvia **il vero handler Deno** `supabase/functions/stripe-webhook/index.ts` in un processo locale isolato con chiavi Stripe finte e Supabase REST simulato su `127.0.0.1`. Non interagisce con Stripe Sandbox reale o con il database del cliente. Script: `scripts/qa-stripe-webhook-isolated.mjs`.

- [x] Evento `checkout.session.expired` con firma Stripe HMAC valida fa passare l'ordine Flex di prova da pending a expired.
- [x] Replay del medesimo evento: la transizione resta idempotente.
- [x] Evento scaduto riferito a ordine pagato: lo stato `paid` resta invariato.
- [x] Associazione sessione/ordine differente: nessuna alterazione.
- [x] Firma non valida o contenuto manipolato: `400` prima di ogni chiamata al DB.
- [x] Evento livemode=true in ambiente test: `400`; firma assente: `503`.
- [x] Test isolato completamente verde nella GitHub CI.

**Non sostituisce** un webhook realmente consegnato da Stripe Sandbox né il test end-to-end di checkout e pagamento, che restano bloccanti per GO commerciale.

**CI verificata:** run GitHub Actions [43048715876](https://github.com/Mattia471/ale-coach-prenotazioni/actions/runs/43048715876): handler Deno avviato con backend fittizio, 8 scenari superati e job PostgreSQL parallelo verde. Nessuna scrittura su Supabase cloud né addebito Stripe.


## Checkpoint Cloudflare bloccato | 11/11/2026

- [x] Test reale da GitHub con origine `https://alecoach.online`: **HTTP 403**, header `Access-Control-Allow-Origin` assente per `create-checkout` (run [43047876472](https://github.com/Mattia471/ale-coach-prenotazioni/actions/runs/43047876472)). È una **verifica negativa**, non un pass di autorizzazione Cloudflare.
- [x] L'origine Vercel QA continua a essere autorizzata dalle tre Edge Functions; `evil.example` bloccata.
- [x] Workflow GitHub manuale `.github/workflows/edge-cors-preflight.yml` preparato per ritestare Vercel, `alecoach.online` e `www.alecoach.online` senza JWT né segreti.
- [ ] **P0:** aggiornare `ADDITIONAL_APP_ORIGINS` nel Supabase del cliente, preservando il valore esistente di `PUBLIC_APP_URL`; test remoto verde su entrambi gli host prima della configurazione finale Pages.
- [ ] **P0:** autorizzare redirect Supabase Auth e testare email, reset password e checkout Sandbox da Pages. Il GO commerciale rimane NO-GO.

## Risultato aggiornato: CORS Cloudflare chiuso (11/11/2026)

- [x] Il cliente ha inserito `ADDITIONAL_APP_ORIGINS` e il test HTTP remoto [43056433094](https://github.com/Mattia471/ale-coach-prenotazioni/actions/runs/43056433094) ha verificato `OPTIONS` reale su **tutte e tre le Edge Functions** per `https://alecoach.online`, `https://www.alecoach.online` e Vercel QA: HTTP 200, allow-origin esatto, `Vary: Origin`. `https://evil.example` continua a essere rifiutato.
- [x] PR temporanea diagnostica #45 chiusa senza merge. Nessuna modifica a chiavi, pagamenti, prenotazioni o funzioni Edge durante il test.
- [ ] **Prossimo gate P0:** creare progetto Cloudflare Pages sul GitHub del titolare e build `prelaunch` su `*.pages.dev`; verificare noindex, route SPA, PWA, header e TLS.
- [ ] **P0 successivo:** configurazione redirect Auth, login/reset password, email SMTP, intero checkout Sandbox e test mobile sull'URL Pages prima del cutover DNS.
- [ ] **P0 commerciale:** approvazioni legali, backup reale con prova restore e successivo collegamento dominio apex tramite zona Cloudflare, **solo dopo autorizzazione al GO**.


## Primo deployment Cloudflare Pages verificato | 11 novembre 2026

Indirizzo tecnico creato dal cliente: **https://ale-coach-prenotazioni.pages.dev/**. Test HTTP reali eseguiti dal runner GitHub Actions con richieste GET/OPTIONS pubbliche, **senza JWT, chiavi, pagamenti o scritture**: [43059834311](https://github.com/Mattia471/ale-coach-prenotazioni/actions/runs/43059834311).

**PASS:** HTTPS, root HTML React/Vite, `X-Robots-Tag: noindex` (prelaunch), header di sicurezza, fallback SPA per `/privacy`, `/termini`, `/cookie`, bundle JS/CSS, manifest PWA, icona e Service Worker.

**Due blocchi di configurazione rilevati:**
1. Il bundle JavaScript servito da Pages **non contiene l'hostname Supabase ALE COACH previsto**. Il frontend `src/lib.ts` utilizza `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` in fase di compilazione. Aprire Cloudflare Pages → Settings → Environment variables, per l'ambiente **Production**, configurare `VITE_SUPABASE_URL=https://mmtnzjdvvlouiwgrydlf.supabase.co` e `VITE_SUPABASE_PUBLISHABLE_KEY` con la **chiave pubblica** del progetto. Poi effettuare **un nuovo deployment da `main`**: Vite non aggiorna un bundle statico senza build. Nessuna `service_role` o secret Stripe in Cloudflare.
2. Un `OPTIONS` con `Origin: https://ale-coach-prenotazioni.pages.dev` verso `create-checkout` riceve **403**; le origini `alecoach.online`, `www.alecoach.online` e Vercel erano già state verificate con 200. In Supabase Edge Secrets aggiungere l'origine tecnica esatta `https://ale-coach-prenotazioni.pages.dev` a `ADDITIONAL_APP_ORIGINS` **mantenendo tutte le origini esistenti** e lasciando invariato `PUBLIC_APP_URL`.

**Per evitare il problema in futuro:** `scripts/cloudflare-pages-postbuild.mjs` verifica nelle build reali Pages (`CF_PAGES=1`) che le due variabili pubbliche Supabase siano presenti e che l'URL sia quello del progetto autorizzato, anche in `prelaunch`. La CI su GitHub conserva build e test senza credenziali; i test di rete sono disponibili solo nel workflow manuale **QA | Cloudflare Pages smoke (manual)**, che controlla separatamente la parte statica e il preflight Pages → Supabase.

**GO resta bloccato** finché entrambi i test manuali non tornano verdi, più Auth/SMTP, Stripe Sandbox E2E, backup/restore e approvazione legale. `noindex` **non protegge l'accesso** alla preview; per tenerla privata serve Cloudflare Access. Non associare ancora il dominio commerciale né attivare Stripe Live.


## Cloudflare Pages | Verifica Auth pubblica e RLS anonimo (11/11/2026)

Test HTTP **effettivo**, dalla preview `https://ale-coach-prenotazioni.pages.dev/` al progetto Supabase del cliente. Run GitHub [43062615798](https://github.com/Mattia471/ale-coach-prenotazioni/actions/runs/43062615798), esito `SUCCESS`. Script `scripts/qa-pages-auth-public.mjs` e workflow on-demand `.github/workflows/pages-auth-public-smoke.yml`; la CI di rilascio include solo `node --check`, non dipende dal cloud esterno.

- [x] Chiave `sb_publishable_` rilevata **solo in memoria**, una sola chiave nel bundle Pages; il test non la mostra nei log.
- [x] Supabase `/auth/v1/health` e `/auth/v1/settings` rispondono 200 con la chiave pubblica del frontend.
- [x] Accesso pubblico di sola lettura a `services`, `venues`, `packages` riuscito. Nessuna riga o dato personale stampato nei log.
- [x] Lettura anonima di `profiles`, `bookings`, `wallet_credits`, `notifications`, `slot_holds`: **nessuna riga esposta**.
- [x] Chiamata `GET /auth/v1/user` con JWT sintetico invalido respinta.
- [x] Il cliente ha dichiarato di aver aggiunto `https://ale-coach-prenotazioni.pages.dev/**` alla allowlist Redirect URLs Supabase. **L'effettiva redirezione di una email non è stata ancora collaudata**.
- [ ] P0: login con account di test reale su Cloudflare, ricarica sessione, logout, password recovery tramite email SMTP e verifica che il link ritorni a `pages.dev` e non a Vercel.
- [ ] P0: creazione prenotazione e approvazione/rifiuto con identità reali, Stripe Checkout Sandbox e backup/restore.

La verifica pubblica non richiede password, non genera email, non crea utenti/prenotazioni/pagamenti e non è equivalente al collaudo E2E autenticato.


## Checkpoint 11/11/2026: autenticazione confermata dal cliente e prossima QA E2E

- [x] **Verifica manuale dichiarata dal cliente** su Cloudflare Pages: login, persistenza della sessione dopo refresh, logout e recupero password tramite email funzionanti. La prova browser non è stata osservata da un runner automatico; il cliente ne ha confermato l'esito.
- [x] Audit read-only successivo: Stripe Sandbox `livemode=false`, sessioni e PaymentIntent di prova già presenti, nessun wallet negativo o associato a ordine non pagato, nessun pacchetto scaduto ancora `pending`, nessuna prenotazione bloccata in `authorizing`/`processing` oltre due ore.
- [x] Fix UI: il prelaunch senza approvazione legale blocca anche acquisti pacchetti Flex e riprese dell'autorizzazione carta, non solo nuove prenotazioni e registrazioni; relativi CTA disabilitati. Test di regressione CI aggiunto.
- [ ] **P0 prossimo:** test prenotazione e pagamenti Stripe Sandbox dalla preview QA protetta. Servono due account client autorizzati per il test di concorrenza con due sessioni reali; il database ne registra attualmente uno. Non creare o alterare account commerciali in automatico.
- [ ] **P0 ancora aperti:** chiusura legale, backup/restore verificato, protezione delle password compromesse, ultime verifiche mobile e GO verso dominio custom.

Procedura dettagliata e casi B01–R01: [QA-BOOKING-STRIPE-SANDBOX.md](QA-BOOKING-STRIPE-SANDBOX.md). `VITE_PRELAUNCH_QA` è una modalità di collaudo interno da non attivare su un frontend Pages pubblico senza un controllo di accesso effettivo; non equivale al consenso a vendere o all'approvazione legale.
