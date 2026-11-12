# ALE COACH V1 | Collaudo finale prenotazioni e Stripe Sandbox

**Checkpoint 11 novembre 2026.** Il cliente ha confermato manualmente sulla preview Cloudflare Pages il funzionamento di login, persistenza della sessione al refresh, logout e recupero password via email. Questo è un **risultato di collaudo dichiarato dal cliente**, distinto dai test HTTP automatici (già verdi).

La CI e il backend sono in buono stato. Stripe collegato: **Alessandro Cola sandbox** (`livemode=false`), senza incassi live. Il database non mostra ordini Flex scaduti sospesi, wallet negativi, ordini non pagati con crediti, né prenotazioni `authorizing` o `processing` bloccate oltre due ore. Al momento del controllo risultano **1 profilo coach e 1 profilo client**: serve un secondo utente di prova autorizzato per il collaudo concorrente reale a due account.

## Ambiente QA, obbligatorio prima di ogni pagamento test

- Usare **il branch separato `qa/booking-stripe-sandbox`**, con middleware server-side HTTP Basic su Cloudflare Pages e secret Preview cifrato `QA_ACCESS_PASSWORD`, non aprire la funzionalità commerciale su una preview pubblica. Verificare anche l'impostazione **Settings → Runtime → Fail open / closed → Fail closed** prima di abilitare QA.
- Conservare `PAGES_RELEASE_MODE=prelaunch` e `VITE_LEGAL_APPROVED=false`. Il frontend commerciale pubblico deve continuare a bloccare prenotazioni, acquisti Flex e riprese del pagamento.
- L'eventuale flag **`VITE_PRELAUNCH_QA=true`** serve solo a test interni autorizzati su una preview effettivamente protetta. Non abilitarlo indiscriminatamente nella Production Pages pubblica: un URL `pages.dev` con `noindex` **non è privato**.
- Stripe deve restare `STRIPE_ENVIRONMENT=test`, con chiave server `sk_test_`, webhook di test firmato e `STRIPE_LIVE_APPROVED=false`. Le chiavi segrete devono rimanere solo su Supabase.
- Prevedere slot futuri dedicati al test e due account client autorizzati più il coach. Non usare o cancellare prenotazioni commerciali reali per la QA.

## Scenari di accettazione V1

| ID | Prova da effettuare | Risultato atteso |
|---|---|---|
| B01 | Cliente A prenota una lezione senza pagamento online, scegliendo un orario libero | Richiesta registrata una sola volta e notificata al coach; niente Stripe |
| B02 | Coach approva la richiesta del cliente A | Prenotazione confermata, agenda coerente per coach/cliente |
| B03 | Due clienti A/B cercano simultaneamente l'ultimo slot libero | Uno soltanto riesce; nessuna sovrapposizione in DB |
| B04 | Cliente annulla una richiesta nei limiti di policy V1 | Stato e disponibilità coerenti; una sola restituzione di eventuali crediti |
| S01 | Cliente A prenota una lezione online e conferma il pagamento **di prova** su Stripe | Prima `authorizing`, poi `pending`/`authorized`; coach non riceve richieste non autorizzate |
| S02 | Coach approva una prenotazione con autorizzazione Stripe test | Capture una sola volta; `confirmed`/`paid`; PaymentIntent `succeeded` |
| S03 | Coach rifiuta una nuova prenotazione con carta autorizzata | Autorizzazione cancellata e slot liberato; nessun incasso |
| S04 | Cliente disdice una richiesta online ancora autorizzata | Autorizzazione Stripe annullata e stato `cancelled`, senza doppio rimborso |
| S05 | Cliente abbandona il checkout prima di pagare | Scadenza eventuale; nessuna conferma coach o credito aggiunto |
| F01 | Cliente compra un pacchetto Flex con carta **di test** | Ordine `paid`; wallet corrispondente creato una sola volta |
| F02 | Lo stesso evento Stripe di pacchetto viene ritentato | Nessun secondo wallet o credito duplicato |
| F03 | Il checkout di un pacchetto viene lasciato scadere | Ordine `expired`, nessun wallet generato |
| F04 | Due richieste simultanee tentano di usare l'ultimo credito | Un solo consumo riesce; saldo mai negativo |
| R01 | Dopo ogni scenario, chiudere e riaprire browser su telefono e desktop | Stato coerente dopo refresh, niente banner bloccati, feedback temporanei leggibili |

**Non inventare esiti**: ogni scenario va segnato `PASS` solo dopo prova con utenti reali **nel solo ambiente Sandbox**. Prima della prova, verificare che il nuovo ambiente QA sia protetto e che la configurazione Stripe reale sia disattivata.

## Verifiche di riconciliazione dopo gli scenari

Usare soltanto query amministrative **aggregate**, evitando di esportare email, numeri di telefono, token o chiavi.

```sql
select (select count(*) from public.wallet_credits where remaining<0) as negative_wallets,
       (select count(*) from public.package_checkout_orders where status='pending' and expires_at<now()) as stale_packages,
       (select count(*) from public.package_checkout_orders o
         join public.wallet_credits w on w.stripe_session_id=o.stripe_session_id
         where o.status<>'paid') as unpaid_package_wallets,
       (select count(*) from public.bookings where status='authorizing'
         and created_at<now()-interval '2 hours') as stale_authorizations,
       (select count(*) from public.bookings where status='processing'
         and created_at<now()-interval '2 hours') as stale_processing;
```

Lato Stripe Sandbox, verificare manualmente che le sessioni e i PaymentIntent generati nei test abbiano `livemode=false`, importi coerenti e stati previsti. I webhook devono essere firmati e gestiti in modo idempotente. Non resettare il database commerciale né replayare webhook di produzione per fare QA.

## Gate commerciali non sostituiti da questa checklist

Continuano a richiedere chiusura e approvazione: GDPR/termini commerciali, backup cifrato reale con restore isolato, sicurezza Auth (protezione password compromesse), verifica finale mobile, domini DNS definitivi e decisione esplicita di GO. Google Calendar, Hevy e ulteriori integrazioni sono **fuori perimetro V1**.

**Stato attuale:** Auth su Cloudflare confermata dal cliente; controlli SQL, Stripe Sandbox pregressa e simulazioni di concorrenza verdi; **B01–R01 non ancora certificati end-to-end su Pages**.

**Gate automatico aggiunto:** le build Cloudflare Pages del branch `main` (`CF_PAGES=1`, `CF_PAGES_BRANCH=main`) falliscono se `VITE_PRELAUNCH_QA=true`, anche in `prelaunch`. La modalità QA è riservata al branch `qa/booking-stripe-sandbox` con HTTP Basic autenticata lato server, password conservata come Secret Cloudflare Preview e `Fail closed` verificato. Il controllo è in `scripts/cloudflare-pages-postbuild.mjs` ed è coperto da regressione CI.

## Audit RPC Supabase, 12 novembre 2026

La query ripetibile in [QA-RPC-SECURITY-AUDIT.sql](QA-RPC-SECURITY-AUDIT.sql) è stata eseguita **in sola lettura** sul progetto Supabase cloud: 21 funzioni SECURITY DEFINER, 12 eseguibili da authenticated, **0 violazioni** nei controlli automatici di grants, search_path e presenza delle guardie attese. Non sono stati alterati ruoli, policy, crediti o prenotazioni.

Limite importante: la presenza testuale di `auth.uid()` o `private.is_coach()` **non dimostra da sola** che ogni ramo del codice applichi correttamente l'autorizzazione. I test RLS/RPC con rollback in [QA-RPC-RLS-READONLY.sql](QA-RPC-RLS-READONLY.sql) completano solo parzialmente la copertura. Prima del GO servono revisione puntuale dei rami di business, controllo Auth e delle eventuali nuove RPC. Le funzioni server-only per saldo pacchetti e autorizzazione Stripe non sono accessibili ad authenticated.

**Non** applicare REVOKE generalizzati alle RPC authenticated: sono necessarie al booking e all'agenda. In caso di modifica SQL, verificare l'intero percorso cliente/coach con test automatici e collaudo mirato.
