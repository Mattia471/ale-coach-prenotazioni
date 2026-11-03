# Ale Coach Prenotazioni

Web app **mobile first** per Alessandro Cola, personal trainer a **Roma Talenti** e **Nuovo Salario**. Due aree separate: **cliente** e **coach**, con permessi verificati nel database.

> **Stato del rilascio:** interfaccia e logica realizzate; fino al collegamento di un progetto Supabase dedicato il deploy è una **anteprima interattiva**, con dati locali e due account demo. Nessun pagamento reale e nessuna push automatica vengono dichiarati completati senza chiavi e servizi configurati.

## Stack

- React 19, TypeScript, Vite 7, Tailwind CSS 4 e CSS custom per il brand Ale Coach
- Supabase: Auth, PostgreSQL/RLS, Storage privato, Realtime, Edge Functions
- Stripe Checkout: pagamento dopo l'approvazione, webhook firmati, rimborsi, pacchetti una tantum
- Web Push + PWA: service worker, push subscription con VAPID, trigger dal database
- Hosting statico Vercel (oppure Cloudflare Pages per produzione commerciale con piano gratuito compatibile)

## Funzionalità implementate

| Area | Flusso |
| --- | --- |
| Pubblica | Servizi, prezzi, pacchetti, sedi, promo `ALECOACH10`, entrata da link bio/DM/Meta/QR/referral |
| Auth | Registrazione e login email/password; Google OAuth opzionale. Il coach viene autorizzato solo dal database |
| Cliente | Prenotazione a passi, controllo iscrizione Virgin Active, orari realmente liberi, conferma, stato, disdetta e notifiche interne |
| Coach | Richieste da approvare/rifiutare, preventivi, agenda, segna incasso in palestra, autorizzazione individuale a pagare in sede |
| Catalogo | Durate e prezzi modificabili dal coach, disponibilità settimanali, pacchetti e codici sconto |
| Stripe | Creazione di Checkout dopo approvazione, webhook verificato, sblocco del booking solo su conferma server, rimborsi a 24 h, acquisto pacchetti singoli |
| PWA | Installazione da browser, iscrizione Web Push con VAPID e function di inoltro da notifiche DB |

**Regole principali:** `ALECOACH10` = **10%** entro **7 giorni** dal primo contatto, solo alla prima lezione pagata, non cumulabile. Pagamento **online obbligatorio** per impostazione predefinita, salvo autorizzazione esplicita individuale del coach. Richiesta da approvare entro 24 ore; dopo l’approvazione online il cliente ha fino a 90 minuti per completare il checkout. Disdetta gratuita almeno 24 ore prima. Nessun overbooking fra Talenti e Nuovo Salario. Le persone non iscritte a Virgin Active non possono prenotare.

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
2. Esegui **`supabase/migrations/202611030001_initial.sql`** nel SQL Editor, oppure con un normale workflow Supabase CLI di migrazioni.
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
- Ale la approva: lo stato diventa `awaiting_payment` e il cliente può aprire Checkout (60 minuti per iniziare il checkout; 90 minuti per completarlo).
- Stripe verifica e incassa la carta. **Solo il webhook firmato** porta la prenotazione a `confirmed/paid`.
- Pagamento in presenza disponibile esclusivamente per utenti abilitati da Ale; il coach registra «Segna pagata» dopo l'incasso.
- Pacchetti **5 e 10 lezioni**: checkout immediato, crediti creati dal webhook, scadenza per piano.
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

| Canale | Parametri URL |
| --- | --- |
| Instagram bio | `/?source=instagram_bio` |
| DM automatico FORZA | `/?source=instagram_dm&campaign=FORZA` |
| Pubblicità Meta | `/?source=meta_ads` |
| QR palestra | `/?source=club&code=ALECOACH10` |
| Codice amico | `/?source=friend&ref=AMICO` |

I parametri vengono salvati nella prenotazione. L'invio **automatico** dei DM richiede una piattaforma/API Meta configurata separatamente. Il QR viene creato nel pannello Marketing; non devi caricare immagini da siti esterni.

## Pubblicazione su Vercel

1. Crea un progetto **Vite** e carica il repository GitHub, oppure importa la directory del progetto.
2. Configura in Vercel **solo** le variabili pubbliche `VITE_*`.
3. Imposta `npm run build`, directory `dist`.
4. Associa il dominio in Supabase `Auth → URL Configuration` e come `PUBLIC_APP_URL` nelle Edge Functions.
5. Controlla registrazione, RLS, checkout Stripe **test mode**, webhook, doppie prenotazioni e login coach prima di usare dati reali.

> **Nota sui piani gratuiti:** Supabase Free consente due progetti attivi complessivi. Vercel Hobby è destinato a uso **personale non commerciale**; la demo può restare su Hobby, ma una versione venduta a un coach richiede un hosting con termini compatibili oppure Vercel Pro.

## Repository e controllo qualità

Il progetto è pronto da caricare in una repository nuova `ale-coach-prenotazioni` (consigliata **privata** finché non saranno verificati privacy, testi e asset):

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
