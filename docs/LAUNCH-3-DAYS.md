# Ale Coach | Rilascio operativo su cloud e successivo dominio

**Stato al 4 novembre 2026:** il backend è sul Supabase Free dell'account Ale Coach e il frontend è online sul Vercel personale dello sviluppatore. **Non esistono più database o seed locali.** Il rilascio commerciale sul dominio **alecoach.online** resta subordinato al completamento dei controlli sicurezza, GDPR e pagamenti.

## Piano operativo in tre giorni, con criteri GO/NO-GO

| Fase | Attività essenziali | Stato al 4 novembre 2026 |
| --- | --- | --- |
| **Giorno 1 · 4 novembre** | Cloud, Auth riservato, migrazioni, RLS, Stripe test preparato e domini | **Parzialmente completato**. Database e Vercel attivi, mail dominio confermata, sicurezza e protezione Stripe implementate. SMTP, redirect e segreti Stripe da verificare; nessuna vendita live. |
| **Giorno 2 · 5 novembre** | Stripe preautorizzazione/cattura, agenda interna, webhook e test concorrenti | **In corso**. Preautorizzazione Stripe, webhook, decisione del coach e UI cloud implementati il 4 novembre; richiede test completo su carta Stripe e disponibilità interna. |
| **Giorno 3 · 6 novembre** | QA completa, GDPR e termini approvati, backup/restore, dominio Cloudflare, monitoraggio e GO | **Non eseguito**. Non si pubblica commercialmente con P0 aperti. |

I giorni indicano la sequenza prevista, **non garantiscono il lancio**:
controlli anti-overbooking, sicurezza e pagamenti veri restano bloccati finché non superano i test.

### Stato Giorno 1 e controlli verificati

- [x] Supabase Ale Coach, Vercel personale, catalogo v2, migrazioni e cron cloud attivi.
- [x] Un account `info@alecoach.online` con email confermata, senza assegnazione arbitraria ruolo coach.
- [x] Accesso nuove registrazioni limitato a allowlist lato database; informativa ancora in revisione.
- [x] Privilegi SQL rafforzati: niente TRUNCATE da browser e niente UPDATE anonimo sul catalogo.
- [x] Stripe creato dal coach; funzioni checkout/cancel/webhook con abilitazione esplicita e test/live separati.
- [x] Risolto l'errore Edge Runtime `Cannot find module tslib`; webhook risponde 503 disabilitato invece di crash.
- [ ] Configurazione SMTP con `info@alecoach.online` come mittente verificato e test email ricevute.
- [ ] Controllo dei redirect di Supabase Auth su Vercel e reset password.
- [x] Stripe test: chiavi e webhook destination configurati dal cliente, quattro eventi ascoltati sulla sandbox (chiavi non lette dalla chat).
- [x] Codice preautorizzazione prima dell'invio, azioni server coach e frontend pubblicati sulla URL di collaudo.
- [ ] Abilitare Stripe test per una prova controllata; verificare evento firmato, stato `requires_capture` e prenotazione invisibile al coach fino all'autorizzazione.
- [ ] Verificare identità del coach e assegnare il ruolo corretto.
- [ ] Definire titolare, contatto privacy, conservazione dei dati e condizioni contrattuali.
- [ ] Verificare backup esterno sicuro e procedure di ripristino.

Per la configurazione Stripe senza condividere credenziali:
[STRIPE-SETUP.md](STRIPE-SETUP.md). Per i test cloud:
[CLOUD-OPERATIONS.md](CLOUD-OPERATIONS.md).

## Architettura attiva

| Componente | Destinazione | Stato |
| --- | --- | --- |
| Codice | GitHub `Mattia471/ale-coach-prenotazioni` | Attivo |
| Frontend | https://ale-coach-prenotazioni.vercel.app | Online, Vercel |
| Database | Supabase ref `mmtnzjdvvlouiwgrydlf` | Online in `eu-west-1` |
| Autenticazione | Supabase Auth | Tabelle e trigger presenti; configurazione URL e SMTP da ultimare |
| Catalogo e calendario | PostgreSQL + RLS + RPC | Popolati, primo test slot riuscito |
| Cron scadenze | `ale-coach-expire-bookings` | Attivo ogni cinque minuti |
| Edge Functions | Checkout, cancel, webhook, push | Distribuite e attive per QA. Il codice Google Sync rimane disabilitato e fuori ambito base |
| Email dominio | `info@alecoach.online` | Casella creata dal cliente, SMTP Supabase da collegare |
| Stripe | Account creato dal coach | Edge Functions protette e runtime corretto; segreti test e webhook firmato da configurare |
| Google Calendar | Extra futuro su richiesta | **Escluso dalla release e dal preventivo base** |
| Sito definitivo | Cloudflare Pages e `alecoach.online` | Da configurare dopo i gate |

## Configurazione account coach e login

1. Nella Dashboard Supabase di Ale Coach, aprire **Authentication → URL Configuration**.
2. Impostare **Site URL** a `https://ale-coach-prenotazioni.vercel.app` e consentire nei Redirect URLs quel dominio. Prevedere `https://alecoach.online` in aggiunta prima del passaggio a Cloudflare.
3. Configurare SMTP dedicato, usando un provider di invio verificato via SPF/DKIM/DMARC per `info@alecoach.online`. Non usare SMTP di prova per clienti reali.
4. Creare tramite **Authentication → Users → Add user** un account coach con email verificata e password forte. Solo dopo aver verificato l'UUID, assegnare a quell'account `role='coach'` nella tabella `public.profiles` tramite Dashboard o SQL Editor. Non basarsi su un nome/email hardcoded nella migration.
5. Completare prima l'informativa privacy e le condizioni contrattuali; la registrazione pubblica rimane bloccata finché `VITE_LEGAL_APPROVED=false`. Le persone già autorizzate e create via admin possono effettuare il login.

## Configurazione servizi

- **Stripe:** aggiungere i Secrets alle Edge Functions solo nell'account Supabase, endpoint webhook firmato e pagamento in modalità test prima delle chiavi live. La v2 richiede preautorizzazione/cattura differita, ancora da implementare. Non usare il checkout iniziale per incassi reali.
- **Agenda interna:** unica fonte operativa per la release base, con finestre, corsi, blocchi orari manuali, chiusure e buffer tra sedi. Il coach può inserire a mano gli impegni esterni dalla schermata Disponibilità. Google Calendar NON è un requisito, non è incluso nell'offerta base e sarà sviluppato solo su richiesta con compenso aggiuntivo. Blocchi o chiusure nuovi non annullano automaticamente lezioni già confermate.
- **Push:** configurare VAPID e secret Webhook prima di dichiararle attive; permission browser su azione esplicita.
- **Supabase Cron:** il job scadenza di prenotazioni è già attivo in produzione. Monitorare `cron.job_run_details`.

## Regole di sicurezza e continuità

- Nessun `service_role`, `sb_secret_*`, chiave Stripe, Google refresh token o password nel bundle Vite o nella repository.
- RLS sulle tabelle esposte; l'esecuzione anonima di funzioni privilegiate è stata revocata. Le RPC esposte agli utenti autenticati richiedono comunque revisione e test d'autorizzazione.
- Non utilizzare dati dei clienti reali per test senza autorizzazione. Non impostare flag legali in modo fittizio.
- Supabase Free può sospendere il progetto dopo prolungata inattività e non offre backup automatici giornalieri; prevedere backup esterno e prove di restore. Per garanzie di servizio valutare piano a pagamento.
- Durante la preparazione Vercel restituisce `X-Robots-Tag: noindex`; il sito non viene presentato come servizio pubblicamente disponibile.
- GDPR: [GDPR-COMPLIANCE.md](GDPR-COMPLIANCE.md), checklist completa: [TEST-PLAN.md](TEST-PLAN.md), differenze v2: [V2-DELTA.md](V2-DELTA.md).

## Go-live su alecoach.online

1. Tutti i gate P0 di calendario, sicurezza, email e pagamenti superati.
2. Informative approvate, configurazione fiscale e contrattuale verificata con il coach.
3. Cloudflare Pages con repository GitHub, Vite, build `npm run release:build` e `dist`; DNS e HTTPS.
4. Aggiornare Supabase Auth Site URL e Redirect URLs, callback Google se attivato, success URL Stripe e indirizzi nelle email.
5. Validare il nuovo sito mobile, controllare che nessuna chiave privata sia distribuita nel frontend, effettuare una transazione controllata concordata, monitorare webhook e backup.
6. Solo allora rimuovere la protezione anti-indicizzazione e aprire ai clienti finali.

La scadenza di tre giorni è un obiettivo commerciale e non elimina i controlli obbligatori.
