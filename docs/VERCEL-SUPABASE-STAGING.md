# Ale Coach · demo su Vercel personale, backend Supabase del cliente

Data configurazione: 4 novembre 2026. Stato: configurazione parziale, **nessun pagamento live**.

## Proprietà dei servizi e destinazione finale

- **GitHub sviluppo:** `Mattia471/ale-coach-prenotazioni` su `main`.
- **Vercel personale:** progetto `ale-coach-prenotazioni`, ambiente temporaneo di anteprima e QA.
- **Supabase proprietario:** progetto nel **separato account Ale Coach**, regione UE da verificare. Tutti i dati, utenti, webhook, Edge Functions, Storage e credenziali rimangono nell'account del cliente.
- **Dominio e email proprietario:** `alecoach.online` e `info@alecoach.online`. Nessuna modifica DNS necessaria per un test su `*.vercel.app`.
- **Rilascio definitivo:** frontend su Cloudflare Pages del cliente. Stesso backend Supabase, stesso codice GitHub; aggiornare allowlist Auth e URL Stripe.
- **Separazione dati:** il demo senza backend usa solo dati sintetici in localStorage. Non inserire dati personali reali nella demo.

## Due modalità separate

### Modalità demo statica, sempre sicura

Senza `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`, la web app usa il catalogo dimostrativo e account sintetici nel browser. Compare il banner **ANTEPRIMA DIMOSTRATIVA**. La registrazione Auth e i pagamenti non funzionano e non vengono simulati come transazioni reali. Questa modalità permette di far vedere le interfacce prima di applicare le migrazioni cloud.

Il gate GDPR delle operazioni reali rimane attivo non appena le due variabili Supabase vengono configurate su una build di produzione, anche se l'app viene eseguita su Vercel.

### Modalità test integrata con Supabase Cloud

Con le variabili di progetto e migrazioni applicate sul Supabase del cliente:
- il frontend usa la chiave **publishable** nel browser, mai service-role o secret;
- il backend esegue Auth/RLS, RPC di prenotazione, notifiche e Edge Functions;
- usare account di prova e Stripe **test mode**;
- la registrazione e la prenotazione rimangono bloccate se le informative non sono approvate in un build di produzione. L'approvazione richiede testi definitivi, non modificare il flag soltanto per aggirare il gate;
- le conferme restano bloccate se la sincronizzazione Google Calendar non è aggiornata: il coach deve autorizzare Google e bisogna collaudare il job prima delle prove complete.

## Passaggi sull'account Supabase Ale Coach

1. Selezionare il progetto **Ale Coach**; confermare reference ID e regione. Non utilizzare il vecchio account personale.
2. Applicare **tutte** le migrazioni `supabase/migrations/` con CLI autenticata sul progetto corretto; controllare e correggere gli errori PostgreSQL localmente prima di spingere in cloud.
3. Impostare **Authentication → URL Configuration**:
   - `Site URL` = URL stabile del progetto Vercel di test, es. `https://ale-coach-prenotazioni.vercel.app` (verificare URL reale);
   - `Redirect URLs`: URL Vercel e localhost necessari ai test. Per i singoli preview usare wildcard coerenti con le raccomandazioni ufficiali.
   - Per il definitivo cambiare Site URL in `https://alecoach.online` e mantenere i domini Vercel solo durante la transizione.
4. Abilitare conferma email in produzione e configurare SMTP custom (ad esempio Resend) con mittente `info@alecoach.online` **solo dopo verifica DNS e dominio**. Una casella `info@` già creata non equivale a SMTP autorizzato per Supabase.
5. Non creare il coach tramite email seed locale; usare una procedura sicura d'invito/assegnazione ruolo e verifica RLS.
6. Implementare e collaudare `google-calendar-sync`, `create-checkout`, `stripe-webhook`, `cancel-booking` e le relative secrets **solo nelle Edge Functions**; non incollare segreti in GitHub o frontend.
7. Abilitare controlli sicurezza, backup e retention prima dell'uso reale.

## Passaggi su Vercel personale

Configurare in **Project → Settings → Environment Variables**, soltanto dopo avere verificato il progetto Supabase giusto:

```dotenv
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<public-publishable-key>
VITE_LEGAL_CONTACT_EMAIL=info@alecoach.online
VITE_GOOGLE_ENABLED=false
VITE_LEGAL_APPROVED=false
```

La chiave publishable può essere presente nel bundle client; **mai** pubblicare `service_role`, `sb_secret_*`, `STRIPE_SECRET_KEY` o `GOOGLE_OAUTH_CLIENT_SECRET`. Se l'ambiente di test usa un Supabase reale, mantenere accesso ristretto e non mostrare una registrazione reale prima del completamento delle informative.

Per la demo senza backend non impostare le prime due variabili. Non aggiungere una finta URL Supabase, perché disabiliterebbe la modalità statica e produrrebbe richieste fallite.

Vercel attuale è sull'account personale. Verificare che sia consentito dal piano Vercel usato per questa modalità di demo: i termini del piano Hobby riservano l'uso a finalità personali/non commerciali. Per il rilascio del servizio commerciale usare **Cloudflare Pages nell'account del cliente**, come previsto.

## Preparazione del passaggio a Cloudflare Pages

- Impostare repository GitHub, framework Vite, build `npm run release:build`, output `dist`.
- Copiare **solo** le variabili browser pubbliche e la configurazione dei domini; lasciare secrets e cron su Supabase.
- Configurare `alecoach.online` e `www.alecoach.online` e SSL su Cloudflare.
- Aggiornare `Auth Site URL`, redirect allowlist, OAuth callback, URL della webhook e della mail transazionale; testare dopo il cutover.
- Non cancellare subito Vercel: mantenere la demo finché l'app Cloudflare è verificata, quindi revocare i suoi redirect se non più necessari.

## Collaudo GO/NO-GO

`pnpm run build` e `pnpm run local:check` non sostituiscono i test sul database reale.
Vedere [V2-DELTA.md](V2-DELTA.md), [TEST-PLAN.md](TEST-PLAN.md), [GDPR-COMPLIANCE.md](GDPR-COMPLIANCE.md).

In particolare la specifica v2 richiede **preautorizzazione Stripe prima della conferma e rinnovi Continuity** che non sono ancora completi. Non abilitare pagamenti reali per superare o ignorare questa condizione.
