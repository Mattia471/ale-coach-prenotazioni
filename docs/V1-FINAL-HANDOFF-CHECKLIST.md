# ALE COACH V1 | Checklist finale di consegna

**Aggiornata il 12 novembre 2026.** Stato tecnico verificato nel repository e nel progetto Supabase; questa pagina non equivale ad autorizzazione al GO. **Nessun passaggio attiva automaticamente Stripe Live o il dominio pubblico.**

## Già verificato

- [x] **UI approvata**: Minimal Focus ripristinata con [PR #66](https://github.com/Mattia471/ale-coach-prenotazioni/pull/66); i tre CSS sono identici a quelli del commit approvato `b61d74c` in `main` e `qa/booking-stripe-sandbox`. CI main e QA verdi.
- [x] **Ambiente di test isolato**: `https://ale-coach-qa-sandbox.pages.dev`, con password gate server-side. Branch QA e PR #53 restano separati da `main`; non eseguire il merge.
- [x] **Test manuali già confermati**: login, prenotazione del 14/11 alle 13:00, decisione coach, acquisto pacchetto Flex in Stripe Sandbox e prenotazione usando un credito. Non chiedere al tester di ripetere questi passaggi.
- [x] **Controlli CI**: concorrenza slot/crediti, webhook Stripe firmati e idempotenza simulata, cancellazione credito e `pg_dump/pg_restore` su PostgreSQL **sintetico** isolato.
- [x] **Controlli read-only Supabase** del 12/11: 0 wallet negativi, 0 booking attivi sovrapposti, 0 ordini Flex pagati senza wallet, 0 wallet scollegati dal rispettivo ordine pagato, 0 autorizzazioni scadute da oltre 2 ore.
- [x] **Cron**: `ale-coach-expire-bookings` e `ale-coach-release-stripe-authorizations` attivi; 288 esecuzioni riuscite ciascuno, 0 fallite, nelle 24 ore precedenti il controllo.
- [x] **Audit RPC preliminare**: 21 funzioni privilegiate analizzate, nessuna esposizione anonima o violazione delle invarianti automatiche; non è una revisione formale di ogni ramo autorizzativo.

## Bloccanti reali prima del GO

| Blocco | Responsabile | Prova richiesta | Stato |
| --- | --- | --- | --- |
| **Privacy, Termini, cookie e policy disdette** | Titolare/consulente | Dati reali, testi e condizioni approvati; `VITE_LEGAL_APPROVED` resta `false` fino alla firma | **APERTO** |
| **SMTP del dominio** | Titolare account email + tecnico | Mittente verificato, SPF/DKIM/DMARC, email di reset realmente ricevuta | **APERTO** |
| **Backup reale e restore isolato** | Titolare infrastruttura + tecnico | Dump cifrato offsite, custodia chiavi, ripristino in ambiente diverso e verifica Auth/Storage | **APERTO** |
| **Stripe Sandbox E2E residuo** | Tecnico + titolare account Stripe | Cattura/rifiuto/rimborso reali in test, replay webhook su backend, verifica redirect dalla QA Pages, 2 account concorrenti | **PARZIALE** |
| **Sicurezza autorizzazioni** | Tecnico | Review ramo-per-ramo RPC `authenticated`, verifica advisor e password compromesse, RLS mirata | **PARZIALE** |
| **Dominio Cloudflare** | Titolare Cloudflare + tecnico | DNS/HTTPS per `alecoach.online` e `www`, test di navigazione, Auth redirect e CORS | **APERTO** |
| **Stripe Live e approvazione commerciale** | Titolare Stripe + tecnico | Attivazione deliberata solo dopo tutti i controlli e conferma del titolare; prova di pagamento concordata | **NON ATTIVARE ORA** |

## Sequenza più breve per completare

1. **Cliente**: approva testi legali, conferma dati del titolare e policy disdette; verifica accesso a Cloudflare, dominio, email e Stripe.
2. **Tecnico**: completa prove non distruttive di RLS, Stripe Sandbox, cron e deploy. Prepara backup cifrato e restore **senza** usare dati reali in ambienti pubblici.
3. **Cliente e tecnico insieme**: configurano SMTP, eseguono backup/restore, associano dominio a Cloudflare Pages e testano Auth/email.
4. **Solo con GO esplicito**: applicano configurazione commerciale, chiavi Stripe Live esclusivamente lato server, pubblicano e verificano monitoraggio.

**Regole:** non integrare Hevy, Google Calendar o abbonamenti Continuity in V1. Non modificare la UI desktop senza una preview separata approvata. Non unire la PR #53 di QA in main. Non copiare segreti in repository, ticket o chat.

## Collegamenti

- [Issue #56: QA residua](https://github.com/Mattia471/ale-coach-prenotazioni/issues/56)
- [Perimetro V1](RELEASE-V1-SCOPE.md)
- [Cloudflare Pages](CLOUDFLARE-PAGES-HANDOFF.md)
- [Backup e ripristino](BACKUP-RESTORE-RUNBOOK.md)
- [Piano test](TEST-PLAN.md)

## Tentativo di ridistribuzione Cloudflare del 13/11/2026

Su richiesta del responsabile del progetto è stato generato un nuovo commit **solo documentale** su `main` per attivare il collegamento automatico GitHub → Cloudflare Pages, senza cambiare codice, build, dati o impostazioni di rilascio. I controlli sul deploy Production restano aperti nell'[issue #75](https://github.com/Mattia471/ale-coach-prenotazioni/issues/75). **Non considerare il push una pubblicazione riuscita**: verificare l'esito reale di Cloudflare e il branch Production, mantenendo `PAGES_RELEASE_MODE=prelaunch`, la QA commerciale bloccata e Stripe Live disattivato.
