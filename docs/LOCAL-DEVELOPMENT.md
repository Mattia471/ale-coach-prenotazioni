# Ale Coach: sviluppo **100% locale** con Supabase + Docker

Questa guida è per lo sviluppatore su **Windows (PowerShell)**. Non serve un account Supabase cloud, né un progetto Pro/Free. PostgreSQL, Auth, Storage, Realtime, Studio e le Edge Functions girano sul computer tramite Docker Desktop.

> Il backend **locale non è raggiungibile dal sito Vercel**: il sito online rimane una demo finché non verrà configurato l'account del cliente. Non inserire mai l'URL localhost nelle variabili di produzione Vercel.

## 1. Requisiti

- Docker Desktop installato, **avviato**, con motore Linux/WSL 2 attivo.
- Node.js 20.19+ (preferibilmente Node 22) e npm.
- RAM libera sufficiente: la prima installazione scarica diverse immagini Docker (prevedi circa 7 GB per lo stack completo tradizionale; lo stack sperimentale attiva i servizi quando servono).
- Supabase CLI viene installato come dipendenza del repository (`supabase@2.121.0`). Non serve installarlo globalmente né eseguire `supabase login`.

Verifica Docker:

```powershell
docker info
```

## 2. Avvio completo

```powershell
git clone https://github.com/Mattia471/ale-coach-prenotazioni.git
cd ale-coach-prenotazioni
npm install
npm run local:start
npm run dev
```

`npm run local:start` esegue nell'ordine:

1. `supabase start`: avvia **un'istanza locale dedicata** e applica le migrazioni in `supabase/migrations/` (catalogo e schema inclusi).
2. `node scripts/sync-local-env.mjs`: legge le URL e la chiave **pubblica** dalla CLI e scrive `.env.local` (ignorato da Git).
3. `node scripts/seed-local-users.mjs`: crea i due utenti **solo su localhost**, con ruoli separati e appartenenza palestra per i test.

Apri **http://localhost:5173**. Se esegui Vite con host/porta diversi, adatta gli URL di redirect nella configurazione locale.

## 3. Credenziali di prova

| Ruolo | Email | Password |
| --- | --- | --- |
| Coach | `ale.dev@example.test` | `AleCoachLocal2026!` |
| Cliente | `cliente.dev@example.test` | `ClienteLocal2026!` |

Gli account vengono creati nella **tua** istanza Docker, non nella produzione. Il coach è impostato come `role = 'coach'` tramite un client server con privilegi amministrativi **esclusivamente nello script locale**. La registrazione normale crea solo clienti.

Le password sono intenzionalmente pubbliche perché valgono **solo per test su localhost**. Mai usarle in un progetto cloud o con utenti reali.

La conferma email è disattivata **solo** nella configurazione di sviluppo, per consentire il login immediato. Le email di recupero password possono essere verificate nel servizio Mailpit.

## 4. Dove si trovano database e dashboard?

```powershell
npm run local:status
```

L'output include le URL assegnate a **questa** istanza:

- **API URL**: usata automaticamente dal frontend tramite `.env.local`.
- **Studio URL**: amministrazione database, tabelle, Auth, SQL Editor e Storage.
- **DB URL**: connessione diretta PostgreSQL.
- **Mailpit URL**: email di test (nessuna email reale viene inviata).

**Non indovinare le porte**: grazie a `[experimental] stack = true`, possono cambiare da un progetto all'altro. Non copiare `SERVICE_ROLE_KEY` o `SECRET_KEY` in un file `VITE_*` o nel frontend.

## 5. Sviluppare più applicazioni in contemporanea

Ogni applicazione ha una cartella `supabase/` e un proprio `config.toml`, con:

```toml
[experimental]
stack = true
```

**Nessuna porta fissa**. La CLI (versione 2.119+) individua gli stack per cartella e assegna le porte disponibili. Così puoi tenere Ale Coach e altri gestionali attivi insieme, senza condividere tabelle o utenti.

Questa funzione è **sperimentale**. Se una versione della CLI cambiasse i comandi, controlla la [guida ufficiale](https://supabase.com/docs/guides/local-development/running-multiple-local-projects). In caso di problemi, non eliminare mai volumi Docker di altri progetti.

## 6. Comandi quotidiani

```powershell
npm run local:status  # stato e porte
npm run local:env     # rigenera .env.local se le porte cambiano
npm run local:seed    # ricrea i test user mancanti, senza duplicati
npm run local:stop    # arresta i container e conserva i dati
npm run local:reset   # ATTENZIONE: cancella i dati locali e riapplica le migrazioni
npm run local:check   # test script di configurazione e controllo localhost
npm run local:integration # RLS, overbooking, promo e blocco upload (crea utenti temporanei)
npm run build         # controlla TypeScript e build Vite
```

Dopo `npm run local:reset`, riavvia il frontend se necessario. I dati su database non vengono condivisi con altre istanze.

## 7. Quali funzioni sono utilizzabili senza Stripe?

**Sì, realmente locali**: autenticazione, ruoli, tabelle, catalogo, codici promozionali, disponibilità, richieste di prenotazione, approvazioni, utenti abilitati al pagamento in presenza, notifiche interne, Storage con regole RLS.

**Non ancora**: incasso online, rimborsi su carta e abbonamenti ricorrenti (richiedono Stripe e le relative chiavi). Le push sul telefono richiedono VAPID, HTTPS o contesto sicuro supportato, permesso del browser e l'inoltro Web Push; non vengono emulate come notifiche vere. I DM automatici Instagram richiedono un servizio separato.

### Collaudo pagamenti in presenza

1. Accedi come coach con le credenziali locali.
2. Abilita *Paga in palestra* per il cliente di test.
3. Accedi come cliente, conferma l'iscrizione Virgin Active e prenota un servizio selezionando pagamento in presenza.
4. Torna come coach, approva la richiesta, visualizza la lezione in agenda e segnala l'incasso quando effettuato.
5. Verifica che un cliente **non** abilitato non possa prenotare con quel metodo.

### Edge Functions e servizi esterni (opzionali)

Le funzioni sono in `supabase/functions/`. Per testare Stripe in modalità **test**, crea solo localmente `supabase/.env.local` (ignorato da Git) con le chiavi Stripe di test e i segreti necessari. Consulta `npm exec -- supabase functions serve --help` per l'esecuzione con `--env-file`, secondo la versione della CLI. Il checkout non è operativo senza `STRIPE_SECRET_KEY` e un webhook di test configurato.

## 8. Trasferimento al progetto Supabase del cliente

Alla consegna:

1. Il **cliente** crea il proprio account e progetto Supabase (Free se i requisiti e i rischi sono compatibili).
2. Applica le migrazioni della repository in un database nuovo, poi configura Auth, RLS, Storage e le Edge Functions.
3. Crea l'account coach reale e assegna il ruolo da backend, senza portare con sé gli utenti `*.dev@example.test`.
4. Configura le chiavi Stripe **del coach** nei secrets server e le URL di produzione su hosting e Auth.
5. Esegui i test `docs/TEST-PLAN.md` e verifica sicurezza, backup e privacy.

**Non esportare né trasferire in produzione** i dati e le credenziali del database di sviluppo. Vedi il [README principale](../README.md) per tutte le specifiche del prodotto.

## In caso di problemi

- **Docker non raggiungibile**: apri Docker Desktop e riprova `docker info`.
- **Porta occupata**: non reintrodurre porte fisse in `config.toml`. Controlla `npm run local:status` e `supabase stack list`.
- **App ancora in modalità demo**: riesegui `npm run local:env` e **riavvia** `npm run dev` (Vite legge l'env all'avvio).
- **Login non funziona**: controlla il profilo Auth e la tabella `public.profiles` nello Studio locale, poi `npm run local:seed`.
- **Errore durante la migrazione**: esamina il log di `npm run local:start`; non azzerare Docker globalmente.
- **Upload scheda**: il bucket privato `client-documents` esiste, ma la migrazione GDPR `20261103194607_gdpr_minimization.sql` rimuove la policy di upload. L'invio di documenti è **disabilitato anche via API**, in attesa di una valutazione sui dati sanitari.

## Spec v2 del 4 novembre: migrazioni e collaudo

Dopo il `git pull`, con Docker Desktop acceso e Supabase locale avviato:

```powershell
pnpm exec supabase migration up --local
pnpm run local:integration
pnpm run local:check
pnpm run build
```

Le migrazioni del 4 novembre aggiornano il listino, sostituiscono ALECOACH10 con ALECOACH15, definiscono fasce multiple per sede, hold da 10 minuti, condizioni per la sync Google e blocchi delle conferme quando il calendario non è aggiornato. **Non applicare la vecchia funzione `create_booking` o `available_slots`**: le RPC v2 sono `create_booking_v2`, `available_slots_v2`, `reserve_slot_v2` e `release_slot_hold_v2`.

La sync Google non può funzionare con la sola demo locale. Occorre un OAuth Google rilasciato dal coach, segreti nelle Edge Functions e un job di sincronizzazione. Fino a quella configurazione le conferme possono restare correttamente bloccate, per non rischiare overbooking. Dettagli: [V2-DELTA.md](V2-DELTA.md).
