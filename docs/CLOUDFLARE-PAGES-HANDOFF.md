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

Lo script verifica le risposte `OPTIONS` delle tre funzioni: **200** e `Access-Control-Allow-Origin` esatto per l'origine autorizzata; **403** e nessun header di autorizzazione CORS per `https://evil.example`. Un esito 401 o 503 indica che il preflight è bloccato a monte e richiede correzione, non va aggirato. La CI testa la logica dello script con risposte simulate.

**Verifica esterna Vercel conclusa l'11/11/2026:** il run GitHub Actions [43045747412](https://github.com/Mattia471/ale-coach-prenotazioni/actions/runs/43045747412) ha confermato il comportamento atteso da Vercel e il rifiuto di `evil.example` sulle tre funzioni. Il test temporaneo è stato eseguito senza credenziali e rimosso dalla CI permanente; **l'origin Cloudflare rimane da configurare e testare realmente prima del GO**.

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


### Blocco origine Cloudflare verificato (11/11/2026)

**Test remoto effettivo**: il runner GitHub [43047876472](https://github.com/Mattia471/ale-coach-prenotazioni/actions/runs/43047876472) ha inviato un `OPTIONS` a `create-checkout` con `Origin: https://alecoach.online` e ricevuto **HTTP 403** senza `Access-Control-Allow-Origin`. Il test Vercel [43045747412](https://github.com/Mattia471/ale-coach-prenotazioni/actions/runs/43045747412) continua invece a dare 200 e rifiuto corretto di `evil.example`. Quindi **il dominio commerciale non è ancora nella allowlist Edge effettiva**. La PR diagnostica temporanea #42 è stata chiusa senza merge.

**Configurazione da eseguire sull'account Supabase ALE COACH prima di collegare il nuovo frontend**:

1. Dashboard Supabase → progetto Ale Coach → Edge Functions → Secrets (o Settings → Edge Function Secrets secondo UI). Individuare `PUBLIC_APP_URL` e `ADDITIONAL_APP_ORIGINS`. **Non stampare né esportare altri secrets**, e non inserirli nella repository.
2. **Mantenere intatto** `PUBLIC_APP_URL` fino al cutover. Aggiungere a `ADDITIONAL_APP_ORIGINS`, **senza cancellare origini QA già presenti**: `https://alecoach.online,https://www.alecoach.online`. Sono host esatti, senza slash finale, wildcard, path o porte.
3. Salvare e verificare la propagazione delle variabili alle Edge Functions; se richiesto dal servizio, eseguire un redeploy controllato delle sole funzioni CORS. Versioni applicate: `create-checkout` v11, `cancel-booking` v10 e `decide-booking` v3. Non abilitare Stripe Live.
4. Da GitHub → Actions → **QA | Edge CORS origin probe (manual)** → Run workflow, selezionare prima Vercel e poi ciascuno dei due host Cloudflare. I tre test devono risultare verdi (200 con allow-origin esatto, 403 per origine non autorizzata).
5. Nella configurazione Supabase Auth aggiungere gli URL di redirect HTTPS approvati per entrambi gli host Cloudflare. **Non cambiare ancora Site URL di default**. Verificare login e reset password solo dopo la disponibilità di Pages e SMTP.
6. Dopo GO commerciale, collegare `alecoach.online` al Pages del cliente, commutare la Site URL e (se richiesto dal checkout server-to-server) il default `PUBLIC_APP_URL`, conservando Vercel in `ADDITIONAL_APP_ORIGINS` per QA. Ripetere smoke test e verifica dei redirect.

**Regola di stop:** il codice Edge è installato ma la preflight Cloudflare fallisce realmente. Fino a un test verde, il dominio non è utilizzabile per i flussi protetti di booking e checkout. Nessun downgrade a CORS `*` e nessuna disabilitazione dell'autenticazione.

## Aggiornamento 11/11/2026 ore 17:15 circa | Allowlist Supabase verificata

Il cliente ha aggiunto `ADDITIONAL_APP_ORIGINS` sul progetto Supabase e abbiamo effettuato un **nuovo test HTTP reale** dal runner GitHub. L'esecuzione [43056433094](https://github.com/Mattia471/ale-coach-prenotazioni/actions/runs/43056433094) è **SUCCESS**: `create-checkout`, `cancel-booking` e `decide-booking` hanno tutte superato i preflight per **Vercel QA**, `https://alecoach.online` e `https://www.alecoach.online`, rifiutando un dominio non autorizzato.

Il precedente HTTP 403 documentato sopra rappresenta **lo stato storico prima** della configurazione. **Il blocco CORS è ora chiuso.** La PR diagnostica temporanea #45 è stata chiusa **senza merge**: la CI ordinaria resta indipendente dal backend live.

**Nuovo passo corrente:** creare nell'account Cloudflare del cliente un progetto Pages con GitHub `Mattia471/ale-coach-prenotazioni`, branch `main`, comando `npm run pages:build`, output `dist`, Node 22 e `PAGES_RELEASE_MODE=prelaunch`. Configurare gli env pubblici Supabase. Fare primo deploy su `*.pages.dev` e verificarne asset, header e SPA. **Non associare subito il dominio commerciale** e non abilitare pagamenti Live o iscrizioni pubbliche prima del GO. Il semplice `noindex` **non è un controllo di accesso**: se la preview deve restare riservata, configurare Cloudflare Access o altra vera protezione, senza cambiare JWT/RLS.

L'URL di preview `*.pages.dev` e i redirect Supabase Auth vanno testati prima del collegamento del dominio. Per il dominio apex `alecoach.online`, Cloudflare Pages richiede che la zona DNS e i nameserver siano gestiti da Cloudflare. Non creare un progetto Workers per errore: selezionare esplicitamente **Pages → Import an existing Git repository**.


## Primo deployment Cloudflare Pages verificato | 11 novembre 2026

Indirizzo tecnico creato dal cliente: **https://ale-coach-prenotazioni.pages.dev/**. Test HTTP reali eseguiti dal runner GitHub Actions con richieste GET/OPTIONS pubbliche, **senza JWT, chiavi, pagamenti o scritture**: [43059834311](https://github.com/Mattia471/ale-coach-prenotazioni/actions/runs/43059834311).

**PASS:** HTTPS, root HTML React/Vite, `X-Robots-Tag: noindex` (prelaunch), header di sicurezza, fallback SPA per `/privacy`, `/termini`, `/cookie`, bundle JS/CSS, manifest PWA, icona e Service Worker.

**Due blocchi di configurazione rilevati:**
1. Il bundle JavaScript servito da Pages **non contiene l'hostname Supabase ALE COACH previsto**. Il frontend `src/lib.ts` utilizza `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` in fase di compilazione. Aprire Cloudflare Pages → Settings → Environment variables, per l'ambiente **Production**, configurare `VITE_SUPABASE_URL=https://mmtnzjdvvlouiwgrydlf.supabase.co` e `VITE_SUPABASE_PUBLISHABLE_KEY` con la **chiave pubblica** del progetto. Poi effettuare **un nuovo deployment da `main`**: Vite non aggiorna un bundle statico senza build. Nessuna `service_role` o secret Stripe in Cloudflare.
2. Un `OPTIONS` con `Origin: https://ale-coach-prenotazioni.pages.dev` verso `create-checkout` riceve **403**; le origini `alecoach.online`, `www.alecoach.online` e Vercel erano già state verificate con 200. In Supabase Edge Secrets aggiungere l'origine tecnica esatta `https://ale-coach-prenotazioni.pages.dev` a `ADDITIONAL_APP_ORIGINS` **mantenendo tutte le origini esistenti** e lasciando invariato `PUBLIC_APP_URL`.

**Per evitare il problema in futuro:** `scripts/cloudflare-pages-postbuild.mjs` verifica nelle build reali Pages (`CF_PAGES=1`) che le due variabili pubbliche Supabase siano presenti e che l'URL sia quello del progetto autorizzato, anche in `prelaunch`. La CI su GitHub conserva build e test senza credenziali; i test di rete sono disponibili solo nel workflow manuale **QA | Cloudflare Pages smoke (manual)**, che controlla separatamente la parte statica e il preflight Pages → Supabase.

**GO resta bloccato** finché entrambi i test manuali non tornano verdi, più Auth/SMTP, Stripe Sandbox E2E, backup/restore e approvazione legale. `noindex` **non protegge l'accesso** alla preview; per tenerla privata serve Cloudflare Access. Non associare ancora il dominio commerciale né attivare Stripe Live.
