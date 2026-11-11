# ALE COACH V1 | Cloudflare Pages: consegna definitiva al cliente

**Obiettivo:** il sito commerciale del cliente usa Cloudflare Pages sul dominio **https://alecoach.online**. Vercel resta l'ambiente di verifica dello sviluppatore. PostgreSQL, Auth, Cron, Edge Functions e Stripe restano su Supabase/Stripe del cliente; nessuna migrazione dei dati o del backend.

**Stato 10/11/2026:** predisposizione tecnica e test nel repository. Il sito commerciale non va dichiarato aperto finché i gate P0 non sono conclusi e il cliente non ha collegato repository/dominio al proprio account Cloudflare.

## Configurazione Cloudflare Pages

- **Provider:** GitHub, repository `Mattia471/ale-coach-prenotazioni` (concordare accesso del cliente e manutenzione); production branch `main`.
- **Framework:** React/Vite; root directory `/`.
- **Install:** installazione `npm ci` con lockfile.
- **Build command:** `npm run pages:build`; **Build output directory:** `dist`.
- **Runtime Node:** 22 (impostare `NODE_VERSION=22` nella build se Cloudflare non usa già una versione compatibile).
- **SPA routing:** Cloudflare Pages serve automaticamente `index.html` per i percorsi sconosciuti in assenza di `404.html`. **Non aggiungere `_redirects` con catch-all**: evitiamo di riscrivere indiscriminatamente le richieste ad asset statici.
- **Header:** `public/_headers` include X-Content-Type-Options, anti-iframe, privacy, Permissions Policy, HSTS e Content-Security-Policy-Report-Only. Finché la V1 è in collaudo include anche `X-Robots-Tag: noindex` globale.
- **PWA:** `/manifest.webmanifest`, icone e `/sw.js` devono trovarsi in `dist/`; verificati da `pages:build`.

## Variabili di ambiente Pages

Usare la pagina **Settings → Environment variables** del progetto Cloudflare Pages; non registrare chiavi segrete in GitHub, Vite o Cloudflare.

| Nome | Prelancio | Go-live approvato |
| --- | --- | --- |
| `PAGES_RELEASE_MODE` | `prelaunch` | `live` SOLO dopo GO |
| `VITE_PUBLIC_SITE_URL` | `https://alecoach.online` | `https://alecoach.online` |
| `VITE_SUPABASE_URL` | URL Supabase pubblico del cliente | Stesso |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Chiave **pubblica** Supabase | Stessa |
| `VITE_PRELAUNCH_QA` | `true` solo per accessi consentiti dalla allowlist | `false` |
| `VITE_LEGAL_APPROVED` | `false` | `true` SOLO dopo firma/approvazione legale |
| `VITE_LEGAL_CONTROLLER_NAME`, `VITE_LEGAL_CONTROLLER_ADDRESS`, `VITE_LEGAL_CONTACT_EMAIL`, `VITE_LEGAL_TAX_ID`, `VITE_LEGAL_POLICY_VERSION` | Dati reali verificati (se disponibili) | Obbligatori e approvati |
| `VITE_GOOGLE_ENABLED` | `false` | `false` |
| `VITE_CANCELLATION_POLICY_V2_ENABLED` | `false` | `false` finché non superati i test rimborsi PR #26 |

La build `pages:build` si chiude con errore se `PAGES_RELEASE_MODE=live` ma manca l'approvazione legale, esistono segnaposto legali, il dominio è diverso da `alecoach.online`, resta attiva la modalità QA o si abilita Google o la policy sperimentale di disdette/rimborsi V2. In modalità `prelaunch`, **tutti** gli host rimangono `noindex`. Con il GO, il build post-process rimuove `noindex` **solo** dal dominio pubblico e lo mantiene sugli indirizzi tecnici `*.pages.dev`.

**Non** configurare in Pages `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `VAPID_PRIVATE_KEY`, chiavi di Vault o altri segreti server. Rimangono nell'account Supabase/Stripe del cliente.

## Supabase Auth e CORS durante la migrazione

1. Supabase Authentication → URL Configuration: consentire esattamente `https://alecoach.online/**`, `https://www.alecoach.online/**` e `https://ale-coach-prenotazioni.vercel.app/**`. Cambiare la **Site URL** di default in `https://alecoach.online` soltanto al go-live.
2. Le chiamate Edge Functions da browser usano una allowlist *exact-match*. **Deploy già eseguito e verificato sul cloud l'11/11/2026**: `create-checkout` v11, `cancel-booking` v10 e `decide-booking` v3, tutte `ACTIVE` con `verify_jwt=true` e dipendenza `_shared/trusted-origins.ts` presente. Il codice distribuito corrisponde al branch principale.
3. Nei **Secrets delle Edge Functions Supabase**, usare `PUBLIC_APP_URL=https://alecoach.online` come default pubblico e `ADDITIONAL_APP_ORIGINS=https://ale-coach-prenotazioni.vercel.app,https://www.alecoach.online` (ed eventualmente l'URL `*.pages.dev` **esatto**, non wildcard, se autorizzato per collaudo).
4. L'allowlist non sostituisce autenticazione o RLS: le RPC continuano a verificare l'utente; CORS non deve mai diventare `*`.
5. I nuovi Stripe Checkout creati dal browser vengono riportati **all'origine di richiesta approvata** (Cloudflare oppure Vercel). Checkout avviati in precedenza conservano i redirect già memorizzati da Stripe.
6. Verificare, da entrambi gli host, il preflight `OPTIONS` e la risposta di `create-checkout`, `cancel-booking`, `decide-booking`. Verificare che `Origin: https://evil.example` sia rifiutato.

**Attenzione:** le tre Edge Functions sono già state distribuite, ma **non basta il deploy del codice**: occorre impostare/verificare `PUBLIC_APP_URL` e `ADDITIONAL_APP_ORIGINS` nei Secrets del progetto Supabase senza cambiare anticipatamente la Site URL di Auth. La disponibilità effettiva da Cloudflare è ancora da testare. Nessuna credenziale server va inserita in Pages.

### Smoke test CORS non distruttivo

Da una shell con Node.js 22 e accesso a Internet (nessuna chiave o JWT richiesti per la simulazione del preflight):

```bash
QA_ALLOWED_ORIGIN=https://ale-coach-prenotazioni.vercel.app node scripts/qa-cors-preflight.mjs
# Soltanto DOPO aver aggiunto il dominio esatto ai Secrets Edge:
QA_ALLOWED_ORIGIN=https://alecoach.online node scripts/qa-cors-preflight.mjs
```

Lo script verifica le risposte `OPTIONS` delle tre funzioni: **200** e `Access-Control-Allow-Origin` esatto per l'origine autorizzata; **403** e nessun header di autorizzazione CORS per `https://evil.example`. Un esito 401 o 503 indica che il preflight è bloccato a monte e richiede correzione, non va aggirato. La CI testa la logica dello script con un server simulato, ma il test remoto reale resta P0.

## Checklist della consegna, senza nuovi moduli

- [ ] Il cliente collega il repository GitHub e crea il progetto Pages sul suo account Cloudflare.
- [ ] Anteprima Pages con `PAGES_RELEASE_MODE=prelaunch` buildata; route dirette `/privacy`, `/termini`, `/cookie` e asset PWA verificati.
- [ ] Security headers, `noindex` e risposte a HTTP/HTTPS verificati.
- [ ] Dopo deploy/allowlist Edge Functions: login, logout, reset password, creazione prenotazioni, coach approva/rifiuta e pagamento Stripe Sandbox da origine Pages.
- [x] Distribuito `stripe-webhook` v11 su Supabase (11/11/2026); corregge `checkout.session.expired` dei pacchetti da `pending` a `expired` con controllo su ordine/sessione. Riconciliato separatamente l'unico ordine Flex storico verificato scaduto su Stripe.
- [ ] **Ancora da testare:** nuovo evento webhook firmato, replay idempotente e retry; verificare dopo la v11 che ordini già `paid` e wallet non vengano alterati. Nessun test con carta live.
- [ ] Redirect di Auth verificati su Pages e dominio personalizzato.
- [ ] Controllo di concorrenza ultimo credito e ultimo slot in ambiente isolato (non eseguire sul dataset commerciale).
- [ ] Migrazione/disdette/rimborsi solo dopo approvazione della policy e verifica Sandbox.
- [ ] Backup con restore provato, configurazione SMTP dominio, RLS e consulenza legale/fiscale completati.
- [ ] Controllo sito su smartphone e desktop; nessun errore console, RLS o Edge; PWA ricaricata correttamente.
- [ ] Dopo GO: impostare `PAGES_RELEASE_MODE=live`, disattivare QA, approvare le informative, collegare il dominio e controllare il `noindex` solo sull'host tecnico Pages.
- [ ] Regole di responsabilità e accesso per cliente/sviluppatore, rinnovi dei servizi, backup e manutenzione definite.

**Non serve migrare database o avviare Hevy/Google Calendar.** Queste restano estensioni a pagamento separate. Vercel può mantenere l'ambiente di collaudo, ma dal GO il dominio pubblico del cliente è **Cloudflare Pages**.

Riferimenti: [Cloudflare Pages React](https://developers.cloudflare.com/pages/framework-guides/deploy-a-react-site/), [SPA fallback](https://developers.cloudflare.com/pages/configuration/serving-pages/), [Header](https://developers.cloudflare.com/pages/configuration/headers/), [Scope V1](RELEASE-V1-SCOPE.md).
