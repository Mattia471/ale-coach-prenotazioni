# Ale Coach Prenotazioni

Web app **mobile first** per Alessandro Cola, personal trainer a **Roma Talenti** e **Nuovo Salario**. Due aree separate: **cliente** e **coach**, con permessi verificati nel database.

> **Stato del rilascio:** interfaccia e logica realizzate; fino al collegamento di un progetto Supabase dedicato il deploy è una **anteprima interattiva**, con dati locali e due account demo. Nessun pagamento reale e nessuna push automatica vengono dichiarati completati senza chiavi e servizi configurati.

## Percorso verso la produzione (stato: **NON ANCORA LIVE PER INCASSI**)

**SPECIFICA PIÙ RECENTE:** [Ale Coach v2 · differenze e conformità](docs/V2-DELTA.md), versione 4 novembre 2026. La v2 prevale sulla demo e sulle condizioni iniziali. Checkout con preautorizzazione, Continuity e sync Google devono essere completati e collaudati prima del rilascio live.

Piano di pubblicazione con Cloudflare Pages Free, Supabase Free nell'account del cliente, Stripe e indirizzo email del dominio:
**[Piano operativo in 3 giorni](docs/LAUNCH-3-DAYS.md)**, **[test obbligatori](docs/TEST-PLAN.md)**,
**[video-guide cliente e coach](docs/VIDEO-GUIDES.md)** e **[piano GDPR](docs/GDPR-COMPLIANCE.md)**.

La build React è stata verificata, ma **migrazioni, Stripe in modalità test, webhook concorrenti,
RLS, backup e ripristino richiedono ancora collaudo su backend locale e cloud**.
Nessun pagamento reale deve essere abilitato prima di superare i controlli GO / NO-GO. Le pagine `/privacy`, `/termini`, `/cookie` sono BOZZE: per il rilascio commerciale è obbligatorio completarle e farle approvare. Il build Cloudflare `npm run release:build` blocca i placeholder e le configurazioni legali mancanti.
Su Supabase Free il servizio può fermarsi per inattività e non include backup giornalieri.

## Stack

- React 19, TypeScript, Vite 7, Tailwind CSS 4 e CSS custom per il brand Ale Coach
- Supabase: Auth, PostgreSQL/RLS, Storage privato, Realtime, Edge Functions
- Stripe Checkout: pagamento dopo l'approvazione, webhook firmati, rimborsi, pacchetti una tantum
- Web Push + PWA: service worker, push subscription con VAPID, trigger dal database
- Hosting statico **Cloudflare Pages Free** per la versione commerciale; Vercel resta soltanto una vecchia anteprima

## Funzionalità implementate

| Area | Flusso |
| --- | --- |
| Pubblica | Servizi, prezzi, pacchetti, sedi, promo `ALECOACH15`, entrata da link bio/DM/Meta/QR/referral |
| Auth | Registrazione e login email/password; Google OAuth opzionale. Informativa privacy accessibile prima della registrazione. Il coach viene autorizzato solo dal database |
| Cliente | Prenotazione a passi, controllo iscrizione Virgin Active, orari realmente liberi, conferma, stato, disdetta, notifiche interne, esportazione JSON dei principali dati personali |
| Coach | Richieste da approvare/rifiutare, preventivi, agenda, segna incasso in palestra, autorizzazione individuale a pagare in sede |
| Catalogo | Durate e prezzi modificabili dal coach, disponibilità settimanali, pacchetti e codici sconto |
| Stripe | Creazione di Checkout dopo approvazione, webhook verificato, sblocco del booking solo su conferma server, rimborsi a 24 h, acquisto pacchetti singoli |
| PWA | Installazione da browser, iscrizione Web Push con VAPID e function di inoltro da notifiche DB |
| Privacy | Pagine Privacy/Condizioni/Cookie in bozza, richiesta di presa visione, link per esercizio diritti, upload documenti disabilitato anche a livello Storage RLS |

**Regole v2:** `ALECOACH15` = **15%** sulla prima lezione individuale da 55 € (**46,75 €**), non cumulabile. Vecchio ALECOACH15 disattivato, AMICO10 disattivato. Pagamento **online obbligatorio** per impostazione predefinita, salvo autorizzazione esplicita individuale del coach. Richiesta da approvare entro il primo tra 24 ore dall'invio e 2 ore prima della lezione. Slot da 15 minuti, prenotabili con 12 ore di anticipo e fino a 42 giorni avanti. Prima dell'invio, il cliente può riservare uno slot per 10 minuti. Disdetta gratuita almeno 24 ore prima. Nessun overbooking fra Talenti e Nuovo Salario. Le persone non iscritte a Virgin Active non possono prenotare. La v2 richiede autorizzazione della carta all'invio e incasso alla conferma: **questo flusso Stripe è ancora da implementare**. L'attuale codice usa Checkout dopo approvazione. I Continuity sono illustrati ma NON acquistabili.

## Novità della specifica v2

- **Prezzi:** individuale 55 €, Duo 80 €, check scheda 35 €, valutazione 50 €, colloquio gratuito; Flex 5 da 250 € / 3 mesi e Flex 10 da 450 € / 6 mesi.
- **Continuity:** 4 lezioni a 150 €/mese e 8 lezioni a 260 €/mese, impegno iniziale 2 mesi. Catalogo presente, acquisti disabilitati finché non sarà sviluppato Stripe Billing.
- **Calendario:** più finestre per sede, scelta Indifferente, 15 minuti, margini PT/corsi e trasferimento 45 min; chiusure e palinsesto stagionale da validare.
- **Google Calendar:** funzione Edge predisposta alla lettura di più agende con OAuth e sync periodica; non è ancora collegata. Il DB blocca le conferme quando la sincronizzazione non è recente.
- **Pagamenti v2:** preautorizzazione/incasso differito richiesta dalla specifica, **non ancora disponibile**. Nessun go-live con incassi finché Stripe non è allineato.
- **Test:** `pnpm run local:integration` ora copre i nuovi RPC. Eseguire dopo le migrazioni, su Docker.

## Sviluppo locale con Docker (modalità predefinita)

**Non serve un progetto Supabase cloud, né un account Pro.** Avvia Docker Desktop e usa PowerShell:

```powershell
git clone https://github.com/Mattia471/ale-coach-prenotazioni.git
cd ale-coach-prenotazioni
npm install
npm run local:start
npm run dev
```

Apri `http://localhost:5173`. Il comando `local:start` avvia Postgres, Auth, Storage, Studio e le API di **Ale Coach**, applica le migrazioni, genera automaticamente `.env.local` (solo chiavi pubbliche per il browser) e crea due account locali di prova con ruoli cliente/coach.

- **Coach locale:** `ale.dev@example.test` / `AleCoachLocal2026!`
- **Cliente locale:** `cliente.dev@example.test` / `ClienteLocal2026!`
- **Dashboard Studio e porte:** `npm run local:status` (porte dinamiche, stack isolato dagli altri progetti).
- **Stop conservando i dati:** `npm run local:stop`.
- **Reset DB locale distruttivo:** `npm run local:reset`.

**Guida completa Windows/Docker, avvio parallelo di più progetti, test e consegna:** [docs/LOCAL-DEVELOPMENT.md](docs/LOCAL-DEVELOPMENT.md).

La CLI Supabase è tra le `devDependencies`; il repository usa la modalità sperimentale `supabase stack` (versione pin `2.121.0`) per evitare conflitti di porte quando sviluppi più applicazioni. Non viene eseguito alcun deploy Supabase cloud.

### Modalità anteprima senza Docker

Se non configuri `.env.local`, `npm run dev` mostra soltanto la vecchia anteprima con account demo e dati nel browser. Per **testare il database reale locale**, esegui `npm run local:start`.

## Setup Supabase del cliente (solo per la consegna futura)

1. Crea un **progetto separato** (preferibilmente `eu-west-1`), senza riutilizzare database di altri clienti.
2. Applica **tutte le migrazioni in `supabase/migrations/` in ordine cronologico**, non solo `202611030001_initial.sql`. In particolare, la migrazione GDPR successiva disabilita l'upload di documenti potenzialmente sanitari. Preferire il workflow Supabase CLI.
3. Abilita Auth **Email/Password** e, opzionalmente, **Google OAuth**. Configura `Site URL` con il tuo dominio e aggiungi tutti gli URL di redirect, inclusi localhost. In Supabase hosted la conferma email è attiva per default: il servizio SMTP incluso è limitato e non adatto alla produzione. Con Google OAuth non dipendi dalle email di conferma, ma devi configurare Google Cloud OAuth. Non disabilitare la verifica email per un'app reale senza valutarne le conseguenze.
4. Registra l'account del coach tramite login e annota **il suo UUID** dalla tabella Auth users. Assegna il ruolo **solo dal SQL Editor**:
   ```sql
   update public.profiles set role = 'coach'
   where id = '<UUID-UTENTE-ALE>';
   ```
   La registrazione pubblica crea esclusivamente clienti; il frontend non può assegnare ruoli.
5. Rendi `public.bookings` e `public.notifications` disponibili nella publication `supabase_realtime` da Database → Replication (o da SQL dopo aver verificato la publication).
6. Configura la scadenza delle richieste: abilita `pg_cron` e, **una sola volta**, esegui:
   ```sql
   select cron.schedule('ale-coach-expire', '*/5 * * * *', 'select public.expire_stale_bookings()');
   ```
   Senza cron, le richieste saranno marcate scadute solo quando la funzione verrà invocata manualmente.
7. Verifica con `Supabase Database Advisors`: nessuna policy RLS permissiva, nessun token amministrativo nei client. La migrazione crea il bucket Storage privato `client-documents` (JPG/PNG/PDF, max 5 MB).

### Funzioni server

Distribuisci:

```bash
supabase functions deploy create-checkout
supabase functions deploy cancel-booking
supabase functions deploy stripe-webhook --no-verify-jwt
supabase functions deploy push-notify --no-verify-jwt
```

Valori segreti da configurare **solo** nella pagina Supabase Edge Functions → Secrets:

```text
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
PUBLIC_APP_URL
VAPID_PUBLIC_KEY
VAPID_PRIVATE_KEY
VAPID_CONTACT_EMAIL
PUSH_WEBHOOK_SECRET
```

I normali segreti Supabase (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) sono gestiti dal runtime; verifica che siano disponibili. Il webhook Stripe si configura con endpoint:

```text
https://<project-ref>.supabase.co/functions/v1/stripe-webhook
```

Seleziona almeno l'evento `checkout.session.completed`. Il webhook usa il **raw body** e verifica `Stripe-Signature` prima di aggiornare una prenotazione.

### Web Push

1. Genera una coppia VAPID (pubblica/privata) in locale, senza inserire la privata nel codice.
2. Configura la chiave pubblica nella variabile Vite e le due chiavi VAPID come secrets Supabase.
3. In Supabase Database Webhooks, crea un webhook per `INSERT` su `public.notifications`, chiamando la function `push-notify` e inviando l'header `x-ale-push-secret: <PUSH_WEBHOOK_SECRET>`. Il valore non va mai pubblicato su GitHub.
4. L'utente deve **consentire** le notifiche. Su iOS l'app va aggiunta alla schermata Home. Senza questo setup, funzionano comunque le **notifiche interne** dell'app, ma non i push fuori dall'app.

### Stripe e pagamenti

- Il cliente invia una richiesta **senza addebito**.
- Ale la approva: lo stato diventa `awaiting_payment` e il cliente può aprire Checkout (90 minuti di validità, con finestra tecnica minima per aprire Checkout).
- Stripe verifica e incassa la carta. **Solo il webhook firmato** porta la prenotazione a `confirmed/paid`.
- Pagamento in presenza disponibile esclusivamente per utenti abilitati da Ale; il coach registra «Segna pagata» dopo l'incasso.
- Pacchetti **5 e 10 lezioni**: ordine server persistente, checkout idempotente, credito e notifica creati atomicamente dopo webhook firmato.
- Abbonamenti **mensili ricorrenti**: visualizzati in catalogo, da completare con Stripe Billing, Price ID e rinnovi `invoice.paid`. Non sono ancora attivi.
- Rimborsi online: Edge Function autenticata, prima di 24 h dalla lezione, con idempotency key.
- In assenza di chiavi Stripe **nessun pagamento viene simulato come riuscito** in modalità reale.

### Sicurezza e privacy

- RLS su **tutte** le tabelle applicative e sul bucket privato, policy per utente/coach.
- Registrazione `client` obbligatoria; upgrade coach manuale via SQL.
- Gli importi non provengono dal browser: sono ricalcolati in una RPC protetta. Collisioni bloccate anche nel database con EXCLUDE su intervalli.
- `service_role`, chiavi Stripe e VAPID private **mai** distribuite a React.
- Per un'attivazione commerciale servono **privacy policy, termini, informativa per rimborsi e un controllo professionale sulla gestione di informazioni sanitarie**. Il campo sugli infortuni è deliberatamente non acquisito online fino a questa verifica.
- Non inserire nomi di utenti reali, segreti, foto personali o numeri privati nella repository.

## Marketing e codici

La **sezione Marketing del coach mostra solo QR code scaricabile, link di prenotazione da copiare e
codice promozionale ALECOACH15 da copiare**. QR e link puntano a
`/?source=club&code=ALECOACH15`. Non contiene pulsanti Instagram, DM Meta o advertising.
Eventuali query di attribuzione legacy restano riconosciute dal backend, ma nessuna automazione
Instagram viene dichiarata attiva.

## Cloudflare Pages Free e consegna

Vedi [LAUNCH-3-DAYS.md](docs/LAUNCH-3-DAYS.md) per guida **GitHub → Cloudflare Pages → dominio,
Supabase Free cliente → SMTP dominio → Stripe e backup**.
**Build commerciale: `npm run release:build`**, output `dist`, branch `main` (in sviluppo locale usare `npm run build`).
La variabile `VITE_GOOGLE_ENABLED=true` mostra il pulsante Google **solo dopo**
che OAuth è realmente configurato in Supabase.
I segreti Stripe e `service_role` sono **solo** nelle Edge Functions.
La configurazione `public/_headers` viene usata da Pages. Le pagine GDPR sono bozze finché il titolare non completa i campi mancanti e ne valida il contenuto. L'app non garantisce automaticamente adempimenti GDPR solo perché dispone di policy RLS. Il routing SPA è gestito nativamente da Cloudflare Pages, senza rewrite globale degli asset.

## Repository e controllo qualità

Repository ufficiale già esistente: **https://github.com/Mattia471/ale-coach-prenotazioni**. Per sincronizzare il checkout locale:

```bash
git init
git add .
git commit -m "feat: Ale Coach booking platform"
git branch -M main
git remote add origin https://github.com/<utente>/ale-coach-prenotazioni.git
git push -u origin main
```

Per i test manuali vedi [`docs/TEST-PLAN.md`](docs/TEST-PLAN.md) e per il mapping funzionale vedi [`docs/REQUIREMENTS.md`](docs/REQUIREMENTS.md).

---

Design e sviluppo: Mattia Cucuzza, [Instagram](https://www.instagram.com/mattiacucuzza_/).
