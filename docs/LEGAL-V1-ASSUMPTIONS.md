# ALE COACH V1 | Assunzioni documentali e verifica pre-GO

**Testi base approvati come punto di partenza dal responsabile il 13/11/2026.** Completate le clausole standard in `src/LegalPage.tsx`, senza attivare la vendita al pubblico e senza cambiare il funzionamento dei pagamenti. Questa revisione software **non sostituisce** la verifica sulla situazione contrattuale e privacy effettiva da parte del titolare e di un consulente competente.

## Dati del titolare già confermati
- Alessandro Cola
- Via Augusto Camerini 91, 00139 Roma (RM)
- P.IVA/identificativo fiscale: 16688071006
- Email: info@alecoach.online

I dati sono visibili come fallback pubblico in `src/legal.ts`, ma la build commerciale richiede **comunque** variabili `VITE_LEGAL_*` esplicite (inclusa versione/data finale) e `VITE_LEGAL_APPROVED=true`. La Production Cloudflare resta `PAGES_RELEASE_MODE=prelaunch` fino al GO, con l'utente non autorizzato bloccato dai gate già esistenti. **Nessuna configurazione Production è stata cambiata in questa PR.**

## Allineamento verificato ai flussi applicativi

- Per prenotazione di una lezione online: `create_booking_v2` crea una richiesta `authorizing`, `create-checkout` crea Stripe Checkout con `capture_method:'manual'`, webhook registra l'autorizzazione e solo allora il coach riceve la richiesta.
- L'azione `approve` nella Edge `decide-booking` cattura l'importo preautorizzato una volta sola; `reject` annulla l'autorizzazione prima dell'incasso. Il release gate non cambia queste funzioni.
- Pacchetti Flex: pagamento immediato nel checkout; validità/quantità secondo il prodotto; un credito per una lezione individuale; nessun abbonamento ricorrente in V1.
- Disdette standard: fino a 24 ore prima per cancellazione self-service di lezione confermata, restituzione credito nel medesimo pacchetto se ammissibile; refund tramite Stripe per lezioni già pagate. Prima della decisione coach il cliente può liberare un'autorizzazione. Il rimborso automatico del 50% nelle ultime 24 ore **non** è attivo. I diritti inderogabili del consumatore prevalgono sempre.
- Nessun Google Calendar, Hevy o rinnovo automatico incluso in V1.

## Criteri di conservazione documentati, **non** automazione implementata

Il testo adotta criteri distinti per profili/account, prestazioni e prenotazioni, documenti fiscali, sessioni/log/notifiche e backup. Per documentazione contabile soggetta all'art. 2220 c.c. è indicata la conservazione generalmente decennale; gli altri dati seguono necessità della finalità, obblighi e prescrizioni pertinenti. **Non è stato implementato un job di cancellazione per categoria**: non affermare al cliente che i dati vengano eliminati automaticamente a una scadenza fissa.

Prima del GO verificare fattivamente le categorie conservate da Supabase, Stripe, Cloudflare e dall'effettivo gestore email, i tempi di retention e le possibilità di cancellazione/soddisfacimento dei diritti GDPR. Adeguare il testo se le pratiche operative differiscono.

## Verifiche esterne che restano necessarie

1. Controllo di informazioni precontrattuali e recesso applicabili ai servizi con data precisa **e** ai pacchetti Flex senza data precisa, con particolare attenzione a eventuale avvio anticipato della prestazione.
2. Provider di posta effettivamente usato e consegna SMTP, recapiti verificati, SPF/DKIM/DMARC.
3. Ruoli e condizioni contrattuali dei fornitori, sub-responsabili e trasferimenti extra SEE, verificati sulle configurazioni reali.
4. Verifica delle tecnologie di tracciamento effettivamente emesse (anche da strumenti e font esterni). Se comparissero cookie non tecnici, bloccarli e implementare un consenso appropriato prima dell'uso.
5. Conferma di un numero/data di versione definitiva e della correttezza dei dati fiscali comunicati; attivazione commerciale soltanto dopo tutti i gate complessivi (backend, Stripe Sandbox, sicurezza, backup, dominio).
6. Verifica accesso, cancellazione ed esportazione dati richiesti dagli interessati con le procedure operative vere.

## Fonti normative consultate

- [Regolamento UE 2016/679, articoli 12–13, diritti e informazioni](https://eur-lex.europa.eu/legal-content/IT-EN/TXT/?uri=CELEX%3A32016R0679)
- [Garante privacy, Registro delle attività di trattamento: criteri di conservazione](https://www.garanteprivacy.it/registro-delle-attivita-di-trattamento)
- [Garante privacy, linee guida cookie 10/06/2021](https://www.garanteprivacy.it/web/guest/home/docweb/-/docweb-display/docweb/9677876)
- [Direttiva 2011/83/UE sui diritti dei consumatori, artt. 9 e 16](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32011L0083)
- [Codice civile, art. 2220, conservazione scritture contabili](https://www.normattiva.it/)

**Stato:** testi completi come proposta V1 e senza placeholder, conferma della base iniziale acquisita; revisione normativa e controllo implementazioni effettive non sostituiti; nessun GO automatico.
