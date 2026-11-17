# ALE COACH | Percorso rapido al rilascio

**Decisione 17/11/2026:** il responsabile ha confermato integralmente le correzioni del cliente ai tre documenti (Privacy, Condizioni, Cookie), incluse le nuove regole economiche e il modulo di recesso. Questa conferma **non equivale** a mettere online pagamenti Live o aprire registrazioni.

## Perimetro concordato

- Risposta del coach entro **48 ore**, senza superare inizio della lezione o scadenza effettiva della preautorizzazione Stripe; assenza di risposta: scadenza e nessun addebito.
- Ritardo del cliente: la lezione termina all'ora prevista e il prezzo non cambia.
- Pagamento di persona solo se consentito, **in contanti al termine**.
- Pacchetti Flex: scadenza crediti, recesso entro 14 giorni con rimborso proporzionale ai crediti/lezioni già goduti, ove ricorrano i presupposti di legge; modulo tipo all'indirizzo `/recesso`. Le eventuali pratiche di recesso e Stripe refund per il pacchetto vanno riconciliate con il wallet.
- Disdetta della lezione **prima dell'inizio**: online pagata, >=24h rimborso 100%; sotto 24h rimborso 50%; credito Flex restituito con scadenza originaria anche nelle ultime 24h; pagamento in presenza senza penali. Nessun rimborso o credito restituito per no-show senza disdetta.
- Lezione annullata dal coach: rimborso integrale online, credito ripristinato; incasso già ricevuto in contanti restituito fisicamente e registrato solo dopo conferma.
- Ricevuta via email per ogni pagamento online riuscito (abilitare le email per **Successful payments** nell'account Stripe Live, verificare email cliente e invio). I pagamenti di prova Stripe normalmente richiedono ricevute test inviate manualmente.
- Contatti, basi giuridiche, conservazione, fornitori e tabella cookie rivisti; **nessuna versione, bozza o numero di revisione visibile nelle pagine legali**. Font esterni nominati in modo esplicito fino a eventuale self-hosting.

## Scansione rapida, per blocchi (stime di lavoro, non date garantite)

| Blocco | Attività | Durata indicativa | Uscita verificabile |
|---|---|---|---|
| A. Testi e comportamento | Applicare testi approvati, `/recesso`, UI clienti/coach e funzioni pagamenti/disdette; eseguire test isolati delle regole 48h, 100/50%, credito e no-show | 1–2 giornate tecniche | CI verde; Edge e migrazioni verificabili, nessun Stripe Live |
| B. Smoke Sandbox mirato | Applicare migrazione non distruttiva solo dopo CI, distribuire Edge test, verificare 1 pagamento/annullamento <24h, 1 credito, 1 annullamento coach, Stripe email receipts e sessioni/cron | 0,5–1 giornata, dipende dall'accesso all'ambiente protetto | Riconciliazione importi Stripe/DB senza doppi rimborsi |
| C. Cutover e rilascio | Approfondire solo le anomalie residue; confermare obblighi informativi/provider, protezione dei dati clienti futuri; autorizzare pulizia selettiva QA, attivare registrazioni pubbliche e Stripe Live separatamente; smoke dopo GO | 0,5–1 giornata, con approvazione responsabile | GO/NO-GO documentato, rollback pronto |

**Ordine di grandezza:** 2–4 giornate lavorative di intervento tecnico **dopo la disponibilità degli accessi e delle decisioni**. Non fissare una data commerciale senza Stripe Sandbox reale e consenso esplicito al GO. Evitare test ripetitivi già superati.

## Solo scenari P0 ancora da verificare

1. **48 ore / scadenza:** online autorizzato viene accettato o scade senza incasso; cap `capture_before` rispettato; non modificare ordini QA preesistenti.
2. **Cliente >=24h:** rimborso Stripe 100%, booking annullato, webhook/retry idempotenti.
3. **Cliente <24h:** rimborso Stripe 50%, importo registrato e nessuna seconda transazione al replay.
4. **Credito Flex <24h:** restituzione una sola volta; dopo l'inizio della lezione non si restituisce; scadenza originale invariata.
5. **Coach annulla:** rimborso online 100%, crediti restituiti; per pagamenti cash il titolare certifica restituzione prima di registrarli.
6. **Flex recesso:** entro 14 giorni pratica manuale via email, calcolo proporzionale, nessun wallet spendibile a rimborso concluso e verifica coerenza Stripe.
7. **Email Stripe:** verifica opzione Customer emails, ricevuta del pagamento Live inviata dopo il successo; niente receipt per sola preautorizzazione.
8. **Sicurezza e produzione:** signup solo dopo GO, account nuovo ruolo cliente, permessi RPC e RLS, noindex rimosso soltanto dal dominio ufficiale con GO.

## Politica di intervento

- Prima correggere **P0 oggettivi**, non ridefinire design, palette o layout Minimal Focus senza richiesta.
- Niente nuovo progetto `ale-coach-qa-sandbox`; eventuale test browser richiede una preview privata dello **stesso** progetto Pages, protetta e verificata prima di attivare bypass QA.
- Hevy, Google Calendar, nuovi abbonamenti o funzioni non concordate restano **extra a pagamento** e non bloccano il rilascio.
- Nessun backup storico dei dati QA richiesto, secondo decisione esistente; **prevedere invece protezione dei futuri dati reali prima del GO**.
- Non cancellare dati, modificare credenziali, disattivare allowlist o abilitare Stripe Live senza autorizzazione distinta.
- **Rollback:** PR/commit precedenti, config Pages prelaunch, script per ripristinare la signup allowlist, Edge precedenti; non ripristinare una versione UI con rimborsi promessi ma backend incoerente.
