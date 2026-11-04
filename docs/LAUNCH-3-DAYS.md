# Ale Coach: piano di lancio in 3 giorni (dal dominio acquistato)

**Stato:** piano operativo, non attestazione di sicurezza né autorizzazione ai pagamenti reali. **La specifica v2 del 4 novembre prevale**: vedere [V2-DELTA.md](V2-DELTA.md). La scadenza di tre giorni è un obiettivo, non autorizza il go-live se mancano preautorizzazione Stripe, sync Google e Continuity.
**OBBLIGATORIO:** consultare [GDPR-COMPLIANCE.md](GDPR-COMPLIANCE.md), finalizzare e far approvare
le informative, i diritti degli interessati, i contratti con i fornitori e i criteri di conservazione.
Il comando di pubblicazione non deve consentire build commerciali senza approvazione legale.
La data di pubblicazione è condizionata ai test **GO / NO-GO**. Cliente proprietario di dominio,
account Cloudflare, Supabase, provider email e Stripe. Lo sviluppatore può avere accesso
temporaneo con permessi necessari, senza conservare credenziali personali.

## Stack e limiti 2026

- **Cloudflare Pages Free:** sito statico React/Vite; build automatica da GitHub, HTTPS e dominio personalizzato. Limite Free attuale: 500 build/mese.
- **Supabase Free:** PostgreSQL, Auth, RLS, Storage, Edge Functions, Cron. Limiti attuali: 500 MB DB, 1 GB Storage, 50.000 MAU, 2 progetti Free attivi. **Il progetto può essere sospeso per scarsa attività dopo circa 7 giorni. Nessun backup automatico giornaliero Free.** Per esigenze di continuità garantita occorre considerare un piano a pagamento.
- **Resend Free:** SMTP per conferma email e password dimenticata; 3.000 email/mese e 100/giorno secondo il listino verificato al 03/11/2026.
- **Email del dominio:** `no-reply@dominio.tld` per invio SMTP via Resend (non è una casella di posta). Per ricevere risposte `assistenza@dominio.tld`: Cloudflare Email Routing in inoltro verso una casella esistente oppure casella email acquistata separatamente.
- **Stripe:** account reale del coach, commissioni per pagamento secondo contratto Stripe, test mode prima del live. La piattaforma non gestisce direttamente numeri di carta.

Documentazione ufficiale:
https://supabase.com/pricing
https://supabase.com/docs/guides/auth/auth-smtp
https://supabase.com/docs/guides/deployment/going-into-prod
https://supabase.com/docs/guides/security/production-checklist
https://supabase.com/docs/guides/platform/backups
https://developers.cloudflare.com/pages/platform/limits/
https://developers.cloudflare.com/pages/configuration/build-configuration/
https://resend.com/pricing
https://www.garanteprivacy.it/faq/cookie
https://www.garanteprivacy.it/Regolamentoue/diritti-degli-interessati

## Prima di comprare il dominio (lavoro preparatorio)

- [ ] Eseguire `npm ci && npm run build && npm run local:check`.
- [ ] Su Docker locale: avviare Supabase e applicare **tutte** le migrazioni; eseguire `npm run local:integration` (RLS, collisioni, promo e blocco upload Storage).
- [ ] Ripetere prove di: 2 clienti stesso slot, prezzi alterati dal browser, coupon duplicati, credito pacchetto, scadenze, limiti di cancellazione.
- [ ] Terminare hardening dei pagamenti: pacchetto con ordine persistente, webhook idempotenti, rimborsi riconciliati, Stripe test.
- [ ] Preparare informativa privacy, termini di acquisto e cancellazione/rimborso, dati del titolare, contatti e conservazione; evitare raccolta di dettagli sanitari senza base giuridica e misure adeguate.
- [ ] Ottenere dal coach dati fiscali e commerciali, prezzi finali, disponibilità, politica rimborsi e approvazione testi.
- [ ] Stabilire piano di backup esterno con test di ripristino, allarmi e chi risponde ai problemi.

## Giorno 1: dominio, hosting, database, email

1. Registrare il dominio **a nome del coach** e gestire DNS in Cloudflare. Verificare certificato HTTPS.
2. Prima della build di produzione, compilare `src/LegalPage.tsx` e le impostazioni
   `VITE_LEGAL_*` con contenuti verificati e senza alcun `[DA COMPILARE]`. Se il controllo
   fallisce, NON disabilitare il gate: completare il documento.
3. Cloudflare Dashboard → Workers & Pages → Create → Pages → Connect to Git → repository `Mattia471/ale-coach-prenotazioni` (verificare l'accesso GitHub):
   - branch: `main`; framework: React (Vite); build: `npm run release:build`; output: `dist`; root: `/`.
   - variabili **pubbliche** di build: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_GOOGLE_ENABLED` solo se OAuth configurato, `VITE_VAPID_PUBLIC_KEY` (opzionale), `VITE_COACH_WHATSAPP`. Includere **tutte** le variabili `VITE_LEGAL_*` e `VITE_PUBLIC_SITE_URL` descritte in [GDPR-COMPLIANCE.md](GDPR-COMPLIANCE.md).
   - **mai** creare variabili `VITE_STRIPE_SECRET_KEY`, `VITE_SUPABASE_SERVICE_ROLE_KEY` o altri segreti server.
   - assegnare `dominio.tld` e configurare redirect a un unico host canonico (`www` o apex).
4. Creare Supabase **nell'account del cliente**, regione UE compatibile con requisiti. Usare una password DB forte in vault; non copiare il database di sviluppo.
5. Applicare le migrazioni versionate in `supabase/migrations` **nell'ordine**. Non eseguire script seed demo `*.dev@example.test` su cloud. Attivare Realtime su tabelle necessarie e verificare bucket privato.
6. Auth: Site URL `https://dominio.tld`, redirect espliciti; email confirmation attiva; impostare limite OTP e protezione CAPTCHA, policy password e recupero credenziali. Google OAuth opzionale: Client ID/Secret di Google Cloud con callback Supabase hosted, poi impostare `VITE_GOOGLE_ENABLED=true`.
7. Resend: verificare il dominio con DNS SPF/DKIM/DMARC secondo istruzioni del provider; abilitare SMTP personalizzato in Supabase Auth (es. `no-reply@dominio.tld`). Test invio a Gmail/Outlook e spam. **Non usare SMTP di default Supabase** per utenti reali.
8. Ricezione email: se richiesta, configurare Cloudflare Email Routing da `assistenza@dominio.tld` all'email effettiva del coach; Email Routing non equivale a una casella IMAP/SMTP in uscita.

## Giorno 2: API, Stripe, sicurezza, affidabilità

1. Deploy delle Edge Functions `create-checkout`, `stripe-webhook`, `cancel-booking` e (se attivate) `push-notify`.
2. Configurare **solo** Secrets server in Supabase: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `PUBLIC_APP_URL=https://dominio.tld`, eventuali `VAPID_*` e `PUSH_WEBHOOK_SECRET`.
3. Stripe **test mode**: endpoint `https://<project-ref>.supabase.co/functions/v1/stripe-webhook`, evento `checkout.session.completed`. Webhook firmato, funzione con verifica JWT **disabilitata solo sul webhook**.
4. Provare pagamenti riusciti/falliti, ripetizione dello stesso webhook, richiesta doppia di checkout, acquisto pacchetto, crediti creati una sola volta, importo listino variato durante checkout, rimborsi e cancellazioni.
5. Verificare funzionalità con più account: RLS, escalation coach negata, update importi negato, slot simultanei tra sedi, coupon una sola volta, disponibilità e scadenze.
6. Abilitare Supabase Cron e pianificare job nominato `ale-coach-expire` ogni 5 minuti con SQL:
   `select cron.schedule('ale-coach-expire', '*/5 * * * *', 'select public.expire_stale_bookings()');`
   Attivare prima l'estensione pg_cron da Dashboard; ispezionare `cron.job_run_details`.
7. Attivare notifiche interne; PWA/push solo se chiavi VAPID e Database Webhook verificati su Android e iOS.
8. Eseguire **backup logico cifrato, esterno** e prova reale di ripristino su staging. Conservare un backup delle **immagini/file Storage** separatamente: il solo dump SQL non salva i file caricati.
9. Controllare Supabase Security Advisor, permessi di tutte le funzioni `SECURITY DEFINER`, RLS e policy Storage; documentare risultati senza esportare dati personali.
10. Predisporre monitoraggio HTTPS e controlli giornalieri di Stripe webhook failures e job cron.

## Giorno 3: verifica finale e attivazione

1. Collegare la release Cloudflare al dominio definitivo con HTTPS e test da smartphone; nessuna variabile `localhost` nel build.
2. Eseguire `docs/TEST-PLAN.md` e test end-to-end in modalità Stripe test. Verificare email di registrazione, recupero password e segnalazioni errori.
3. Consegnare ad Ale policy privacy, termini, canale assistenza, procedure per gestione resi e reclami; ottenere approvazione.
4. Solo dopo il **GO**: attivare chiavi Stripe live, endpoint webhook live distinto, eseguire 1 pagamento reale controllato e la relativa verifica/rimborso concordato (eventuali commissioni applicabili), registrare id ordine e transizione DB senza salvare dati carta.
5. Congelare una release Git tag, verificare che Cloudflare abbia distribuito **esattamente** il commit approvato.
6. Registrare accessi minimi, backup, allarmi, credenziali revocate, proprietari account; produrre le due video-guide con utenze demo e dati fittizi.

## GO / NO-GO: nessuna eccezione sui pagamenti

**NO-GO immediato** se uno di questi casi fallisce:
- [ ] Una prenotazione concorrente su stesso slot è respinta, anche fra sedi e account diversi.
- [ ] Clienti non possono leggere/modificare profili, prenotazioni, prezzi, ruoli o crediti di altri.
- [ ] Coupon ALECOACH15 non è riutilizzabile su più acquisti attivi.
- [ ] Checkout non genera doppio addebito su richieste simultanee, e non incassa su prenotazioni scadute.
- [ ] Webhook senza firma è respinto; eventi Stripe ripetuti non generano doppi crediti.
- [ ] Ogni rimborso è riconciliato con Stripe; fallimenti DB producono allerta e non falsi successi.
- [ ] SMTP dominio funzionante, login/ripristino account, policy privacy e rimborsi approvate.
- [ ] `npm run release:build` supera il gate, pagine `/privacy`, `/termini`, `/cookie` validate, dati del titolare completi.
- [ ] Nessun upload di schede sanitarie tramite frontend **o** Storage API, incluso bypass diretto.
- [ ] Procedure GDPR per accesso/esportazione, rettifica, cancellazione e incidenti documentate; DPA fornitori verificati.
- [ ] Cron scadenze operativo, backup esterno **testato nel restore**.
- [ ] Cloudflare live carica solo chiavi pubbliche, tutte le funzioni server hanno secrets appropriati.
- [ ] Un utente reale non vede account demo o dati personali di prova.

**Rischi accettati solo per iscritto:** sospensione di Supabase Free per inattività, assenza di SLA/backup automatici, quote Free, escalation a piano a pagamento se servizio critico. Se un gate fallisce, si pubblica solo demo senza incassi finché non è corretto.

## Ruoli e consegna

**Coach:** titolare delle utenze e dei dati; approva testi, politiche e test su pagamenti reali. **Sviluppatore:** gestisce codice/migrazioni, test, documentazione e pubblicazione con accesso limitato. Non trasferire credenziali test in produzione; usare un vault e rimuovere i permessi non necessari alla consegna.

## Video-guide

Script e storyboard: [VIDEO-GUIDES.md](VIDEO-GUIDES.md). La registrazione dello schermo va fatta **solo quando la UI definitiva è stabile**, con utenze demo e dati inventati, senza clienti reali né chiavi/segreti.

## Requisiti nuovi da completare prima della pubblicazione con clienti paganti

- [ ] **Stripe autorizza alla richiesta, cattura alla conferma**. L'attuale checkout dopo approvazione non soddisfa la specifica del 4 novembre. Completare prima il flusso e testare annullamento delle autorizzazioni.
- [ ] **Google Calendar collegato realmente** con refresh token del coach, cron, classificazione sede, test degli eventi ricorrenti, storico sincronizzazione e comportamento fail-closed.
- [ ] **Continuity 4 e 8**: rinnovi mensili, due mesi minimi, accredito crediti solo a incasso verificato, riporto e scadenza. Finché incompleti, restano visibili soltanto come presentazione non acquistabile.
- [ ] **Spostamenti e annullamenti**: nuova prenotazione confermata prima di liberare la vecchia, rimborsi/crediti e registro operazioni.
- [ ] Test DB v2 con `pnpm exec supabase migration up --local` + `pnpm run local:integration`. La build Vite da sola non valida la migrazione.
