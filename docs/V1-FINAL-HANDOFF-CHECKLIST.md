# ALE COACH V1 | Checklist finale di consegna

**Aggiornata il 12 novembre 2026.** Stato tecnico verificato nel repository e nel progetto Supabase; questa pagina non equivale ad autorizzazione al GO. **Nessun passaggio attiva automaticamente Stripe Live o il dominio pubblico.**

## Già verificato

- [x] **UI approvata**: Minimal Focus ripristinata con [PR #66](https://github.com/Mattia471/ale-coach-prenotazioni/pull/66); i tre CSS sono identici a quelli del commit approvato `b61d74c` in `main` e `qa/booking-stripe-sandbox`. CI main e QA verdi.
- [x] **Isolamento QA nel codice, non più nell'hosting separato**: il titolare conferma che il progetto Cloudflare `ale-coach-qa-sandbox` è stato **eliminato in passato**. Il branch storico `qa/booking-stripe-sandbox` contiene Basic Auth ma **non è un ambiente operativo**. Non chiedere la ricreazione di un secondo progetto Worker: per eventuale test E2E serve soltanto una preview nuova e verificata (401 anonimo, 200 autenticato) **dello stesso progetto Pages `ale-coach-prenotazioni`**, senza aprire la Production.
- [x] **Test manuali già confermati**: login, prenotazione del 14/11 alle 13:00, decisione coach, acquisto pacchetto Flex in Stripe Sandbox e prenotazione usando un credito. Non chiedere al tester di ripetere questi passaggi.
- [x] **Controlli CI**: concorrenza slot/crediti, webhook Stripe firmati e idempotenza simulata, cancellazione credito e `pg_dump/pg_restore` su PostgreSQL **sintetico** isolato.
- [x] **Controlli read-only Supabase** del 12/11: 0 wallet negativi, 0 booking attivi sovrapposti, 0 ordini Flex pagati senza wallet, 0 wallet scollegati dal rispettivo ordine pagato, 0 autorizzazioni scadute da oltre 2 ore.
- [x] **Cron**: `ale-coach-expire-bookings` e `ale-coach-release-stripe-authorizations` attivi; 288 esecuzioni riuscite ciascuno, 0 fallite, nelle 24 ore precedenti il controllo.
- [x] **Audit RPC preliminare**: 21 funzioni privilegiate analizzate, nessuna esposizione anonima o violazione delle invarianti automatiche; non è una revisione formale di ogni ramo autorizzativo.

## Bloccanti reali prima del GO

| Blocco | Responsabile | Prova richiesta | Stato |
| --- | --- | --- | --- |
| **Privacy, Termini, cookie e policy disdette** | Titolare/consulente | Bozze iniziali confermate, testi standard completati in PR; verificare trattamenti, termini e versione definitiva prima di impostare `VITE_LEGAL_APPROVED=true` | **PARZIALE** |
| **SMTP del dominio** | Titolare account email + tecnico | SMTP configurato; email reset ricevuta, link sul dominio definitivo e recupero funzionanti; MX/SPF/DMARC pubblicati; verificare allineamento DKIM/SPF nell'header del messaggio | **FUNZIONALE COMPLETATO, AUTENTICAZIONE EMAIL PARZIALE** |
| **Dati di collaudo e continuità operativa** | Titolare + tecnico | Il titolare accetta di non conservare il dataset QA attuale, destinato a essere ripulito **prima** dell'apertura commerciale. Predisporre una strategia di protezione dei dati reali prima del loro ingresso | **BACKUP QA DISPENSATO; PROTEZIONE DATI REALI DA DEFINIRE** |
| **Stripe Sandbox E2E residuo** | Tecnico + titolare account Stripe | Cattura/rifiuto/rimborso reali in test, replay webhook su backend, verifica redirect dalla QA Pages, 2 account concorrenti | **PARZIALE** |
| **Sicurezza autorizzazioni** | Tecnico | Review ramo-per-ramo RPC `authenticated`, verifica advisor e password compromesse, RLS mirata | **PARZIALE** |
| **Dominio Cloudflare** | Titolare Cloudflare + tecnico | DNS, HTTPS, SPA/PWA, legal deep-links, header, CORS e Auth pubblico/RLS anonima verificati su apex e www; email reset Auth rimane nel gate SMTP | **COMPLETATO (TECNICO)** |
| **Stripe Live e approvazione commerciale** | Titolare Stripe + tecnico | Attivazione deliberata solo dopo tutti i controlli e conferma del titolare; prova di pagamento concordata | **NON ATTIVARE ORA** |

## Sequenza più breve per completare

1. **Cliente**: approva testi legali, conferma dati del titolare e policy disdette; verifica accesso a Cloudflare, dominio, email e Stripe.
2. **Tecnico**: completa prove non distruttive di RLS, Stripe Sandbox, cron e deploy; prepara un piano di pulizia selettiva e verificata dei soli dati QA, senza eseguirla ora e senza perdere configurazioni/segreti.
3. **Cliente e tecnico insieme**: SMTP, reset email e dominio già verificati; stabiliscono la protezione dei **futuri dati reali**, prima dell'uso commerciale, e autorizzano separatamente la pulizia dei soli dati QA.
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
- [x] **SMTP e reset password**: configurazione custom SMTP dichiarata completata; tester ha confermato ricezione effettiva, link e nuovo accesso su `https://alecoach.online` dopo correzione Supabase Auth URL Configuration/template; MX/SPF/DMARC pubblicati. **Residuo**: DKIM/SPF alignment dai messaggi effettivi, non inferibile dalla sola configurazione DNS.
- [x] **Conservazione dati di collaudo dispensata dal responsabile il 16/11/2026**: nessun backup del dataset QA attuale richiesto. Non eseguire ora alcun reset; i dati servono per i test fino al cutover. Resta da definire una protezione ragionevole dei dati personali che arriveranno dopo il lancio.
- [ ] **Stripe Sandbox E2E residua**: refund reale test, replay webhook server, scenario simultaneo due account in ambiente protetto. Non abilitare Stripe Live.
- [ ] **Legal**: le bozze standard esistono; serve la verifica sui trattamenti reali, fornitori e versione finale prima di `VITE_LEGAL_APPROVED=true`.

**Distinzione indispensabile:** il dominio risponde correttamente ma la presenza del sito **non** autorizza iscrizioni pubbliche, acquisti o cambio Stripe Live. Mantenere `PAGES_RELEASE_MODE=prelaunch`, `VITE_PRELAUNCH_QA=false`, `VITE_LEGAL_APPROVED=false`.

## Checkpoint 15 novembre 2026 | Accesso e integrità pagamenti in presenza

- [x] Titolare conferma che reset password con SMTP personalizzato recapita email e che link, schermata e accesso funzionano sul dominio definitivo; Supabase Site URL/redirect e template allineati. Nessun token o password registrato.
- [x] Nuovo test DNS pubblico: MX, SPF, DMARC presenti. Resta da ispezionare l'autenticazione del mittente nel messaggio ricevuto (`Authentication-Results`: SPF, DKIM, DMARC), senza condividere token di recupero.
- [x] Correzione P0 [PR #83](https://github.com/Mattia471/ale-coach-prenotazioni/pull/83): `cancel_unpaid_booking` ora respinge l'annullamento self-service di una prenotazione `in_person` già `paid`, evitando di azzerare a `unpaid` un incasso registrato. Tutte le altre disdette mantengono il flusso preesistente. Test PostgreSQL isolati PASS.
- [x] Migrazione cloud `protect_paid_in_person_cancellation` **applicata e verificata**: nuovo guard presente, `anon` EXECUTE negato, `authenticated` conserva EXECUTE, 0 wallet negativi, 0 prenotazioni in-person già pagate coinvolte.
- [x] **Backup del dataset QA attuale: non richiesto per scelta esplicita del responsabile (16/11/2026)**. Il prossimo lavoro riguarda Stripe Sandbox, sicurezza e piano di bonifica dati QA prima del GO; prima di inserire clienti reali definire continuità e backup futuro. Rimane disponibile il [runbook](BACKUP-RESTORE-RUNBOOK.md) senza forzare l'esecuzione adesso.

**Commercial GO non autorizzato**: Stripe Live OFF, `PAGES_RELEASE_MODE=prelaunch`, `VITE_LEGAL_APPROVED=false` e signup allowlist.

## Decisione 16 novembre 2026 | Dataset QA sacrificabile, nessun reset ora

- Il responsabile ha dichiarato di **non voler conservare i dati attuali di collaudo**, che saranno eliminati al passaggio commerciale. Non richiedere altri interventi per effettuare backup del dataset QA.
- I dati di test devono restare intatti durante i collaudi residui. **Eseguire l'eventuale pulizia solo con autorizzazione esplicita separata e immediatamente prima dell'apertura commerciale**, non dopo che gli utenti reali hanno iniziato a utilizzare l'app.
- Il reset dovrà essere **selettivo e verificabile**: preservare progetto Supabase, migrazioni/schema, Edge Functions, Auth config/SMTP, cron, catalogo di servizi/sedi/disponibilità, account coach e chiavi/secret; trattare con attenzione riferimenti a Stripe Sandbox e non alterare transazioni o contabilità Live.
- Preparare in anticipo inventario read-only, piano di esecuzione e test post-pulizia; nessun `TRUNCATE CASCADE`, `DELETE`, `DROP` o cancellazione utenti va eseguito ora.
- L'esonero riguarda **solo la conservazione del vecchio dataset QA**, non la responsabilità di proteggere i dati personali **futuri**: definire almeno frequenza, destinazione, accesso, ripristino e responsabili del backup quando inizieranno le prenotazioni reali. Nessun GO commerciale automatico.


## Checkpoint 16 novembre 2026 | Stripe Sandbox e RLS hardening

- [x] **Stripe Sandbox read-only:** 12 Checkout Sessions (6 complete, 6 expired); 6 PaymentIntent (3 succeeded, 3 canceled); 40 eventi, zero `pending_webhooks` e nessun evento risultante non consegnato dall'API `delivery_success=false`; 0 rimborsi. Nessuna scrittura Stripe o Supabase effettuata per questo controllo. L'assenza di eventi in attesa non prova da sola il replay reale su Edge.
- [x] [PR #86](https://github.com/Mattia471/ale-coach-prenotazioni/pull/86) merged: nel percorso rimborso `cancel-booking`, controllo del PaymentIntent catturato (ID, metadata booking/client/kind, importo pienamente incassato, valuta EUR, stato `succeeded`) **prima** di chiamare Stripe Refunds. Deno test con casi negativi PASS, CI/main PASS; Edge `cancel-booking` **v14 ACTIVE** con JWT ancora richiesto e source cloud uguale a main.
- [x] **Cloudflare e CI main** dopo l'hardening: deploy e test verdi sul commit `4db78411cd00971869ff62b973002cb72095f525`; resta la modalità prelaunch.
- [x] **Supabase read-only 16/11**: 0 RPC `SECURITY DEFINER` eseguibili da anon; 0 wallet negativi, ordini paid senza crediti, wallet non pagati, booking bloccati da oltre 2 ore, conflitti attivi, booking in-presence paid+cancelled e cron falliti nelle ultime 24h. Il client authenticated **non** può aggiornare direttamente `profiles.role`, `profiles.allow_in_person`, `bookings.payment_status`, `wallet_credits.remaining` o `notifications.body`; può aggiornare `notifications.read_at` come previsto.
- [ ] **Refund E2E reale in Stripe Sandbox**: 0 rimborsi registrati sul conto; il controllo della funzione è verificato, **non** il rimborso end-to-end con un account QA e una prenotazione autorizzata. Non rimborsare checkout preesistenti manualmente via Stripe per non disallineare i dati.
- [ ] **Protezione password compromesse:** Supabase Security Advisor la segnala disabilitata; la funzione HaveIBeenPwned è disponibile solo sul piano **Pro o superiore** secondo le guide Supabase. Il piano Free non può chiudere quel warning attivando una semplice opzione. Confermare politica password / eventuale upgrade separatamente, non cambiare piano senza approvazione del titolare.
- [ ] **Altri gate prima del GO:** completare verifica dei testi legali e del trattamento dati, scegliere protezione dei **futuri** dati reali, test di rimborso e convalida manuale delle principali schermate; pulizia selettiva QA solo dopo gli ultimi test e prima dei primi clienti, con autorizzazione esplicita. Stripe Live OFF, signup allowlist e noindex rimangono attivi.

## Decisione 16 novembre 2026 | Nessun progetto QA Cloudflare separato

- Il titolare dichiara che `ale-coach-qa-sandbox` era stato cancellato. **Non è una regressione dell'app e non bisogna ricrearlo**. La Production continua a usare `ale-coach-prenotazioni` su `alecoach.online`.
- Continuiamo i test isolati Stripe, anti-overbooking e CI. L'E2E rimborso autentico Sandbox è ancora da verificare; qualora necessario, usare soltanto una **preview privata, server-side Basic Auth, fail-closed e testata 401/200** del progetto Pages già esistente. Non abilitare `VITE_PRELAUNCH_QA` su ambienti Preview condivisi non protetti o Production.
- I gate legali, i dati clienti futuri, la pulizia selettiva del dataset QA e il GO Stripe Live restano separati. Il cliente non deve effettuare ora operazioni Cloudflare per ripristinare il vecchio ambiente.

## Checkpoint 16 novembre 2026 | Refund handler isolato e Termini aggiornati

- [x] [PR #89](https://github.com/Mattia471/ale-coach-prenotazioni/pull/89) integrata: l'**handler Deno reale** `cancel-booking` eseguito con Stripe e Supabase finti tramite una import map solo CI, senza segreti né traffico verso provider. PASS: una sola restituzione e una notifica, replay senza doppio rimborso, cliente estraneo/JWT/origine non attendibili respinti, finestra 24h, metadata/importi/cattura errati rifiutati, errore Stripe senza modifica DB e recupero idempotente dopo errore del database. Il test non certifica il rimborso E2E presso il provider reale.
- [x] Dopo integrazione test, **CI GitHub e Cloudflare Pages green** sul commit `a7fd57bd04b4ad68e14b20bc4af2ec971f7023b6`; Stripe Live rimane OFF, sito in prelaunch e noindex.
- [x] Controlli SQL cloud in sola lettura: 0 wallet negativi, 0 ordini pagati senza crediti, 0 wallet non pagati, 0 prenotazioni bloccate o sovrapposte, 0 errori dei due cron nelle ultime 24h; 2 utenti di collaudo, 16 prenotazioni, 4 ordini pacchetto e 2 wallet ancora presenti (non eliminare prima del cutover autorizzato).
- [x] Bozza Termini aggiornata in `src/LegalPage.tsx`: in caso di pagamento in presenza già incassato, la disdetta e l'eventuale rimborso vengono gestiti con il titolare, come già richiesto dall'attuale guard SQL. Si preservano i diritti inderogabili del consumatore. **Questa modifica testuale non vale come approvazione legale**, che rimane aperta.
- [ ] **Ultime azioni che richiedono intervento esterno**: verificare e approvare formalmente Privacy/Termini/cookie con la situazione commerciale effettiva; testare un rimborso reale Stripe Sandbox in una preview realmente protetta del **progetto Cloudflare Pages esistente** (nessun secondo Worker), se richiesto per GO; definire protezione dei futuri dati reali; autorizzare separatamente la pulizia QA e infine il GO commerciale.

## Checkpoint 16 novembre 2026 | Preparazione registrazioni pubbliche, SOLO STAGED

- [x] Verificato **in sola lettura** che Supabase `private.on_signup()` applica l'allowlist QA e il trigger attivo `on_user_created` è collegato ad `auth.users`; attualmente risultano 2 account (1 coach e 1 cliente), allowlist di 1 email. Nessun Auth user modificato.
- [x] Preparati in `docs/sql/` uno script **GO esplicito, non eseguito** ([apertura iscrizioni](sql/V1-GO-PUBLIC-SIGNUP-NOT-APPLIED.sql)) e uno script di **rollback** ([ripristino allowlist](sql/V1-ROLLBACK-RESTORE-SIGNUP-ALLOWLIST-NOT-APPLIED.sql)). Non sono migrazioni automatiche. Richiedono il trigger e la versione prelaunch attesi, conservano tutti gli account, il ruolo `client` di default, `allow_in_person=false` e `virgin_member=false`; nessun utente può autoriconoscersi privilegi via metadata.
- [x] Suite PostgreSQL **sintetica** `qa-go-signup-isolated.mjs`: il SQL originale apre solo iscrizioni ordinarie, rifiuta email vuota, il reset chiude di nuovo le iscrizioni preservando chi si era registrato; anche l'esecuzione GO ripetuta senza precondizioni fallisce in sicurezza.
- [ ] **NON APPLICARE** gli script a Supabase finché cliente non approva le pagine legali, i pagamenti non sono collaudati, la pulizia QA non è autorizzata/completata, la protezione dei nuovi dati personali non è decisa e non esiste GO commerciale esplicito. Abilitare il signup senza sbloccare la UI commerciale non equivale al lancio.

## Checkpoint 18 novembre 2026 | Audit cookie e continuità PWA

- [x] [PR #97](https://github.com/Mattia471/ale-coach-prenotazioni/pull/97): font originali serviti localmente, licenze SIL OFL, testo Cookie e policy CSP aggiornati; build Cloudflare rifiuta asset font mancanti. Ultima CI e Cloudflare su `e065586` PASS.
- [x] [PR #98](https://github.com/Mattia471/ale-coach-prenotazioni/pull/98): suite offline di regressione HTTP e audit pubblico schedulato con sole GET ogni giorno e su richiesta. Verifica le 5 pagine e i file font e rileva nomi noti di cookie marketing negli header, senza raccogliere cookie o segreti. Per il test pubblico schedulato l'esito deve essere letto dal relativo workflow **dopo** l'esecuzione, non presunto dall'esito della CI.
- [ ] **Cookie runtime browser P0**: ispezionare una volta in DevTools una sessione anonima, un account QA e Stripe Sandbox per rilevare strumenti client-side/terze parti non visibili dal semplice HTTP. Solo strumenti tecnici o esenti: niente banner non necessario; se emergono tracciamenti non essenziali bloccarli o implementare consenso preventivo valido.
- [ ] **Altri gate precedenti al GO invariati**: prova rimborso reale Stripe Sandbox autorizzata su preview protetta dello stesso progetto Cloudflare, conferma email receipt Live nel Dashboard, gestione assistita recesso Flex con blocco wallet, protezione futuri dati clienti, reset QA selettivo esplicitamente autorizzato, GO commerciale separato. Registrazioni pubbliche e Stripe Live rimangono OFF.
