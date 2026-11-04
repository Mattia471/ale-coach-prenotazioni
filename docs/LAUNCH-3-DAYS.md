# Ale Coach | Rilascio operativo su cloud e successivo dominio

**Stato al 4 novembre 2026:** il backend è sul Supabase Free dell'account Ale Coach e il frontend è online sul Vercel personale dello sviluppatore. **Non esistono più database o seed locali.** Il rilascio commerciale sul dominio **alecoach.online** resta subordinato al completamento dei controlli sicurezza, GDPR e pagamenti.

## Architettura attiva

| Componente | Destinazione | Stato |
| --- | --- | --- |
| Codice | GitHub `Mattia471/ale-coach-prenotazioni` | Attivo |
| Frontend | https://ale-coach-prenotazioni.vercel.app | Online, Vercel |
| Database | Supabase ref `mmtnzjdvvlouiwgrydlf` | Online in `eu-west-1` |
| Autenticazione | Supabase Auth | Tabelle e trigger presenti; configurazione URL e SMTP da ultimare |
| Catalogo e calendario | PostgreSQL + RLS + RPC | Popolati, primo test slot riuscito |
| Cron scadenze | `ale-coach-expire-bookings` | Attivo ogni cinque minuti |
| Edge Functions | Checkout, cancel, webhook, push, Google sync | Distribuite, fornitori esterni senza credenziali |
| Email dominio | `info@alecoach.online` | Casella creata dal cliente, SMTP Supabase da collegare |
| Stripe | Account del coach | **Non configurato** |
| Google Calendar | Account del coach | **Non autorizzato** |
| Sito definitivo | Cloudflare Pages e `alecoach.online` | Da configurare dopo i gate |

## Configurazione account coach e login

1. Nella Dashboard Supabase di Ale Coach, aprire **Authentication → URL Configuration**.
2. Impostare **Site URL** a `https://ale-coach-prenotazioni.vercel.app` e consentire nei Redirect URLs quel dominio. Prevedere `https://alecoach.online` in aggiunta prima del passaggio a Cloudflare.
3. Configurare SMTP dedicato, usando un provider di invio verificato via SPF/DKIM/DMARC per `info@alecoach.online`. Non usare SMTP di prova per clienti reali.
4. Creare tramite **Authentication → Users → Add user** un account coach con email verificata e password forte. Solo dopo aver verificato l'UUID, assegnare a quell'account `role='coach'` nella tabella `public.profiles` tramite Dashboard o SQL Editor. Non basarsi su un nome/email hardcoded nella migration.
5. Completare prima l'informativa privacy e le condizioni contrattuali; la registrazione pubblica rimane bloccata finché `VITE_LEGAL_APPROVED=false`. Le persone già autorizzate e create via admin possono effettuare il login.

## Configurazione servizi

- **Stripe:** aggiungere i Secrets alle Edge Functions solo nell'account Supabase, endpoint webhook firmato e pagamento in modalità test prima delle chiavi live. La v2 richiede preautorizzazione/cattura differita, ancora da implementare. Non usare il checkout iniziale per incassi reali.
- **Google Calendar:** ottenere consenso e credenziali OAuth del coach con sola lettura; configurare calendario/i, refresh token e job di sincronizzazione server-side con Vault. Le conferme sono deliberatamente bloccate quando la sincronizzazione è assente o obsoleta.
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
