# ALE COACH · Perimetro vincolante di progetto della release V1

**Congelamento funzionale: 10 novembre 2026.** Questo documento descrive l'ambito operativo e la gestione delle richieste future; non sostituisce un contratto firmato, i Termini verso il cliente finale o i controlli tecnici di lancio.

## V1 inclusa

- Autenticazione coach/cliente con Supabase Auth, recupero password, profili e autorizzazioni RLS.
- Calendario **interno** di disponibilità e agenda del coach: sedi, fasce, impegni, blocchi, prenotazioni, stati e controlli anti-sovrapposizione.
- Prenotazioni per i servizi già configurati, richieste e decisioni del coach, storico, informazioni di servizio e annullamenti secondo policy approvata.
- Pagamenti Stripe nel flusso già previsto (preautorizzazione, cattura dopo approvazione, annullamento/rimborso), **soltanto dopo** collaudo Sandbox e approvazioni necessarie.
- Pacchetti Flex non ricorrenti, consumo/restituzione dei crediti, promozioni già configurate, notifiche e push web se configurate.
- Interfaccia **Minimal Focus** responsive cliente e coach, navigazione mobile Gestione e feedback dopo 3 secondi.
- Documentazione essenziale, test di regressione, configurazione e monitoraggio della V1.

## Escluso esplicitamente dalla V1

- **Hevy**: collegamento API, sincronizzazione allenamenti, esercizi, schede e progressi tramite piattaforme terze.
- **Google Calendar** o altri calendari esterni: connessione OAuth, import/export, sincronizzazione bidirezionale, conflitti intercalendario.
- **Abbonamenti e rinnovi automatici Continuity** o altra fatturazione ricorrente (il catalogo puramente illustrativo non abilita acquisti).
- Nuovi moduli gestionali, reportistica avanzata, app native, integrazioni con sistemi di accesso/palestra, automazioni marketing non già presenti.
- Qualsiasi personalizzazione o funzionalità non compresa nell'elenco della V1 concordata.

L'**agenda interna** rimane fondamentale ed è compresa nella V1. "Google Calendar escluso" **non** significa eliminare il calendario di prenotazione dell'app.

## Regola commerciale per estensioni

Le funzioni escluse **non fanno parte del corrispettivo o della consegna della V1**. Ogni richiesta successiva del cliente costituisce una **change request a pagamento** e richiede un preventivo separato e approvato prima dell'inizio dei lavori. Il preventivo deve includere attività tecniche, tempi di analisi/sviluppo/test, costi di terze parti, abbonamenti/API e manutenzione se pertinente. Non assumere gratuità o disponibilità delle API di terzi.

Non sviluppare, abilitare, promettere o considerare bloccante una delle integrazioni escluse per raggiungere il primo rilascio.

## Regola GO/NO-GO: i soli gate reali della V1

1. Booking reale: disponibilità corretta, blocco conflitti e tentativi simultanei, decisione coach, annullamento e notifiche; test con account di prova autorizzati.
2. Pagamenti e crediti: Stripe Sandbox completo (autorizzazione/cattura, webhook firmati/idempotenti, rimborso, scadenze, rifiuto), test Flex incluso; nessun pagamento live prima del GO.
3. Autenticazione, autorizzazioni e dati: RLS, privilegi RPC, email e reset password, protezione dati e procedure backup/restore.
4. Legal/commerciale: condizioni e privacy approvate dal titolare, completezza dati obbligatori, informativa corretta e policy disdette coerente tra UI/backend; gestione degli obblighi fiscali.
5. Distribuzione e verifica: build e test CI verdi, deploy e dominio scelto verificati, test base su smartphone e desktop, logging/monitoraggio operativi.

**Sequenza rapida:** chiudere i cinque gate; congelare il codice V1 e rilasciare; valutare gli extra soltanto in una nuova fase e dietro accordo commerciale distinto.

## Riferimenti operativi

- [Piano di lancio](LAUNCH-3-DAYS.md)
- [Test funzionali e cloud](TEST-PLAN.md)
- [Issue disdette/rimborsi](https://github.com/Mattia471/ale-coach-prenotazioni/issues/5)
- [Issue crediti Flex](https://github.com/Mattia471/ale-coach-prenotazioni/issues/15)
- [PR della nuova policy disdette, non ancora attiva](https://github.com/Mattia471/ale-coach-prenotazioni/pull/26)
