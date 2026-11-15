# ALE COACH V1 | Checklist finale di consegna

**Aggiornata il 12 novembre 2026.** Stato tecnico verificato nel repository e nel progetto Supabase; questa pagina non equivale ad autorizzazione al GO. **Nessun passaggio attiva automaticamente Stripe Live o il dominio pubblico.**

## Già verificato

- [x] **UI approvata**: Minimal Focus ripristinata con [PR #66](https://github.com/Mattia471/ale-coach-prenotazioni/pull/66); i tre CSS sono identici a quelli del commit approvato `b61d74c` in `main` e `qa/booking-stripe-sandbox`. CI main e QA verdi.
- [x] **Isolamento QA nel codice**: branch `qa/booking-stripe-sandbox` con Basic Auth server-side previsto dalla PR #53, separato da `main` e non da integrare. **L'host storico `ale-coach-qa-sandbox.pages.dev` non è più risolvibile**: prima di eventuali nuovi test autenticati serve una nuova preview effettivamente protetta e verificata (401 anonimo, 200 autorizzato). Non confondere il branch con un ambiente accessibile.
- [x] **Test manuali già confermati**: login, prenotazione del 14/11 alle 13:00, decisione coach, acquisto pacchetto Flex in Stripe Sandbox e prenotazione usando un credito. Non chiedere al tester di ripetere questi passaggi.
- [x] **Controlli CI**: concorrenza slot/crediti, webhook Stripe firmati e idempotenza simulata, cancellazione credito e `pg_dump/pg_restore` su PostgreSQL **sintetico** isolato.
- [x] **Controlli read-only Supabase** del 12/11: 0 wallet negativi, 0 booking attivi sovrapposti, 0 ordini Flex pagati senza wallet, 0 wallet scollegati dal rispettivo ordine pagato, 0 autorizzazioni scadute da oltre 2 ore.
- [x] **Cron**: `ale-coach-expire-bookings` e `ale-coach-release-stripe-authorizations` attivi; 288 esecuzioni riuscite ciascuno, 0 fallite, nelle 24 ore precedenti il controllo.
- [x] **Audit RPC preliminare**: 21 funzioni privilegiate analizzate, nessuna esposizione anonima o violazione delle invarianti automatiche; non è una revisione formale di ogni ramo autorizzativo.

## Bloccanti reali prima del GO

| Blocco | Responsabile | Prova richiesta | Stato |
| --- | --- | --- | --- |
| **Privacy, Termini, cookie e policy disdette** | Titolare/consulente | Bozze iniziali confermate, testi standard completati in PR; verificare trattamenti, termini e versione definitiva prima di impostare `VITE_LEGAL_APPROVED=true` | **PARZIALE** |
| **SMTP del dominio** | Titolare account email + tecnico | Mittente verificato, SPF/DKIM/DMARC, email di reset realmente ricevuta | **APERTO** |
| **Backup reale e restore isolato** | Titolare infrastruttura + tecnico | Dump cifrato offsite, custodia chiavi, ripristino in ambiente diverso e verifica Auth/Storage | **APERTO** |
| **Stripe Sandbox E2E residuo** | Tecnico + titolare account Stripe | Cattura/rifiuto/rimborso reali in test, replay webhook su backend, verifica redirect dalla QA Pages, 2 account concorrenti | **PARZIALE** |
| **Sicurezza autorizzazioni** | Tecnico | Review ramo-per-ramo RPC `authenticated`, verifica advisor e password compromesse, RLS mirata | **PARZIALE** |
| **Dominio Cloudflare** | Titolare Cloudflare + tecnico | DNS, HTTPS, SPA/PWA, legal deep-links, header, CORS e Auth pubblico/RLS anonima verificati su apex e www; email reset Auth rimane nel gate SMTP | **COMPLETATO (TECNICO)** |
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

## Aggiornamento legal V1 | 13 novembre 2026

Il responsabile ha confermato l'utilizzo dei testi iniziali e ha autorizzato il completamento delle informazioni standard. La pagina Privacy, i Termini e l'informativa cookie sono stati completati senza placeholder, con i dati del titolare già forniti (Alessandro Cola, Via Augusto Camerini 91 Roma, P.IVA 16688071006, info@alecoach.online). Il testo sui pagamenti ora distingue la preautorizzazione Stripe prima della decisione coach dalla cattura dopo approvazione e dall'acquisto immediato dei pacchetti Flex. La policy disdette V1 resta di 24 ore, senza rimborso 50% automatico entro le 24 ore.

**Non è un GO:** la V1 resta in prelaunch, nessuna chiave Live o flag legale è stata attivata. Il titolare deve verificare che i criteri di conservazione, le condizioni recesso, il provider email e i trasferimenti corrispondano ai trattamenti effettivi e fissare una versione finale. Dettagli e fonti in [LEGAL-V1-ASSUMPTIONS.md](LEGAL-V1-ASSUMPTIONS.md); issue di rilascio [#77](https://github.com/Mattia471/ale-coach-prenotazioni/issues/77).

## Checkpoint 15 novembre 2026 | Dominio pubblico e sicurezza prelaunch

- [x] Cloudflare Pages collegato al dominio `https://alecoach.online` e `https://www.alecoach.online`. **HTTPS 200 con certificati verificati** da un runner pubblico; risoluzione A/AAAA presente.
- [x] **Prova completa esterna GET** sui due domini: SPA React, `/privacy`, `/termini`, `/cookie`, CSS e JS versionati, icone e manifest PWA, service worker, header di sicurezza, `X-Robots-Tag: noindex` prelaunch tutti **PASS**. Host tecnico `https://ale-coach-prenotazioni.pages.dev` continua a passare.
- [x] Supabase Auth salute e settings pubblici, catalogo anonimo, negazione dati privati anonimi, rifiuto JWT sintetico: PASS da ciascun dominio; **nessuna password/utente reale usati**.
- [x] CORS delle Edge Functions create-checkout, decide-booking, cancel-booking accetta esattamente apex/www e nega origin estraneo, come atteso.
- [x] Workflow di monitoraggio giornaliero ampliati ai due domini custom, senza chiavi o richieste commerciali. Test integrati su runner temporaneo [43724163003](https://github.com/Mattia471/ale-coach-prenotazioni/actions/runs/43724163003): PASS; workflow temporaneo rimosso dal branch prima del merge.
- [x] Security hardening [PR #79](https://github.com/Mattia471/ale-coach-prenotazioni/pull/79) applicato su Supabase: signup allowlist ripristinata, 31/31 audit dei privilegi cloud PASS e profili esistenti invariati.
- [x] Nuovo controllo in sola lettura: **0** wallet negativi, ordini paid senza wallet, wallet di ordini unpaid, booking bloccati da >2 ore e sovrapposizioni attive; una sola email autorizzata alla registrazione QA.
- [ ] **SMTP/DMARC**: MX e SPF presenti su DNS, record `_dmarc.alecoach.online` non trovato; DKIM/consegna/reset password reali non certificati. Prima del GO servono configurazione provider, verifica DNS e prova di consegna con account autorizzato.
- [ ] **Backup cifrato reale e restore isolato**: la prova con PostgreSQL sintetico in CI non sostituisce il backup/restauro del progetto Supabase commerciale.
- [ ] **Stripe Sandbox E2E residua**: refund reale test, replay webhook server, scenario simultaneo due account in ambiente protetto. Non abilitare Stripe Live.
- [ ] **Legal**: le bozze standard esistono; serve la verifica sui trattamenti reali, fornitori e versione finale prima di `VITE_LEGAL_APPROVED=true`.

**Distinzione indispensabile:** il dominio risponde correttamente ma la presenza del sito **non** autorizza iscrizioni pubbliche, acquisti o cambio Stripe Live. Mantenere `PAGES_RELEASE_MODE=prelaunch`, `VITE_PRELAUNCH_QA=false`, `VITE_LEGAL_APPROVED=false`.
