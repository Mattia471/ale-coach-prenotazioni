# Ale Coach | Prenotazioni, calendario e gestione clienti

Applicativo React + TypeScript + Vite dedicato ad Alessandro Cola e alle lezioni di personal training presso Virgin Active Talenti e Nuovo Salario (Roma).

**Ambiente unico attivo:** Supabase Cloud di Ale Coach + Vercel dello sviluppatore. Nessun Docker, seed locale, login fittizio o prenotazione simulata. Il futuro dominio commerciale è **alecoach.online** e l'indirizzo di riferimento è **info@alecoach.online**.

## Stato del progetto

| Parte | Stato |
|---|---|
| PostgreSQL, RLS e catalogo v2 | Migrazioni applicate a Supabase Cloud, da collaudare con utenti reali autorizzati |
| Frontend React/Vite | Build completata, collegamento Supabase pubblico configurato su Vercel |
| Prenotazioni e slot a 15 min | Funzioni RPC cloud disponibili, test multiutente e concorrenza da completare |
| Sedi, disponibilità e corsi | Configurati nel database; coach può modificare fasce e chiusure |
| Promo ALECOACH15 | 15% prima individuale (55 € → 46,75 €) |
| Flex 5 / Flex 10 | 250 € / 450 €; pagamento Stripe da collaudare |
| Continuity 4 / 8 | Catalogo 150 / 260 € al mese, **non ancora acquistabili** |
| Supabase Edge Functions | Pubblicate: checkout, annullamento, webhook, notifiche e Google sync |
| Google Calendar | Funzione pronta, ma **non collegata** all'account del coach; conferme bloccate se sync assente |
| Stripe | Account creato, Edge Functions protette e caricate senza crash; chiavi test, webhook test e nuova preautorizzazione v2 ancora da configurare/collaudare |
| Email di dominio e Auth | `info@alecoach.online` registrato e confermato; redirect di Auth e SMTP personalizzato da verificare |
| GDPR | Informative in bozza; registrazioni limitate da allowlist cloud, lancio commerciale ancora bloccato |

**Attenzione:** essere online su un ambiente cloud non significa essere pronti per il pubblico pagante. Non impostare `VITE_LEGAL_APPROVED=true` finché i testi non sono completi e approvati.

## Architettura

```text
Browser (Vercel)
   └─ React + TypeScript + Vite
        └─ HTTPS → Supabase Ale Coach (eu-west-1)
             ├─ Auth: profili coach e cliente
             ├─ PostgreSQL: servizi, prenotazioni, sedi, pacchetti, calendari
             ├─ RLS e RPC: autorizzazioni e concorrenza
             ├─ Storage privato (upload documenti disabilitato)
             └─ Edge Functions: Stripe, push, Google Calendar
```

**Supabase project ref:** `mmtnzjdvvlouiwgrydlf`
**API:** `https://mmtnzjdvvlouiwgrydlf.supabase.co`
**Sito Vercel:** https://ale-coach-prenotazioni.vercel.app

L'account Supabase è quello del cliente. Nel passaggio a Cloudflare Pages cambierà solo l'hosting del frontend; il database e le funzioni server resteranno gli stessi.

## Configurazione Vercel

Nel progetto Vercel, impostare solo **variabili pubbliche**:

```dotenv
VITE_SUPABASE_URL=https://mmtnzjdvvlouiwgrydlf.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<chiave pubblica da Supabase Dashboard>
VITE_GOOGLE_ENABLED=false
VITE_LEGAL_CONTACT_EMAIL=info@alecoach.online
VITE_LEGAL_APPROVED=false
```

Non inserire mai in Vite o in GitHub `service_role`, `sb_secret_*`, `STRIPE_SECRET_KEY`, refresh token Google o password.

Le impostazioni Auth (Site URL, Redirect URLs, SMTP) si configurano nella Dashboard Supabase dell'account Ale Coach. Per il coach, creare un utente con invito amministrativo e poi assegnare `role='coach'` soltanto a quell'account verificato; mai promuovere utenti basandosi sulla loro email senza conferma.

## Migrazioni e sicurezza

Le migrazioni versionate sono in `supabase/migrations/` e sono state applicate in ordine al progetto cloud. **Non ripetere migrazioni manualmente se già presenti nello storico Supabase**. Usare una nuova migrazione per cambi successivi.

Prima di aprire a clienti reali, completare i controlli RLS, l'accesso coach, gli orari concorrenti, la sincronizzazione Google, le politiche di rimborso, backup e la gestione GDPR. Le funzioni `SECURITY DEFINER` sono intenzionalmente disponibili ai soli ruoli autorizzati con controlli server-side; non a `anon`.

## Comandi del progetto

```bash
npm ci
npm run build
npm test
```

`npm test` esegue controlli statici e di release che non modificano il database cloud. Non esistono comandi di seed o reset del database in questo progetto.

## Documentazione

- [Specifiche v2, differenze e attività ancora aperte](docs/V2-DELTA.md)
- [Piano di rilascio e condizioni GO/NO-GO](docs/LAUNCH-3-DAYS.md)
- [Checklist GDPR e privacy](docs/GDPR-COMPLIANCE.md)
- [Piano test funzionali e di sicurezza](docs/TEST-PLAN.md)
- [Storyboard guide cliente e coach](docs/VIDEO-GUIDES.md)
- [Requisiti funzionali](docs/REQUIREMENTS.md)

## Credits

Sviluppo web: [Mattia Cucuzza](https://www.instagram.com/mattiacucuzza_/) · [Portfolio](https://mattiacucuzza.com).
