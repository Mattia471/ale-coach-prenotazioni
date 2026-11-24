# ALE COACH V1 | Revisione manuale delle RPC SECURITY DEFINER

**Data:** 13 novembre 2026. **Modalità:** sola lettura del catalogo `pg_proc` sul progetto Supabase Ale Coach, con `pg_get_functiondef`; nessuna migrazione o modifica ai dati.

## Contesto

Supabase Security Advisor segnala 12 funzioni `public` con `SECURITY DEFINER` ed `EXECUTE` per `authenticated`. In questa applicazione le RPC sono il punto d'ingresso previsto per il client e applicano controlli nel corpo SQL. **Il warning non è automaticamente una vulnerabilità**, ma non va ignorato. L'audit automatico precedente conferma `search_path=''`, nessuna esecuzione `anon` e grant attesi; questa revisione controlla il flusso concreto.

## Analisi delle 12 funzioni

| RPC | Controllo osservato nel corpo | Esito review statica |
| --- | --- | --- |
| `available_slots_v2` | Servizio attivo, finestra 12h–42 giorni, chiusure e conflitti; EXECUTE solo `authenticated`. Non richiede un ID utente esplicito perché restituisce solo disponibilità | **Coerente** con lettura calendario; verificare che nessun dato privato venga aggiunto in futuro |
| `reserve_slot_v2` | `auth.uid()` obbligatorio, lock transazionale, verifica `available_slots_v2`, hold del solo utente | **Coerente**, dipende da lock e vincoli DB |
| `release_slot_hold_v2` | Cancella esclusivamente `slot_holds.client_id=auth.uid()` | **Coerente** |
| `create_booking_v2` | `auth.uid()`, profilo Virgin, servizio attivo, slot valido, wallet dell'utente con credito e scadenza, lock, promo verificata; `client_id` non è input controllabile | **Coerente**; la sicurezza transazionale dipende anche dai vincoli DB e da `private.coach_slot_is_free` |
| `cancel_unpaid_booking` | Booking proprio oppure coach; rifiuta metodo online, controlla finestra 24h e stati; credito restituito nello stesso transaction scope | **Coerente**; il ramo `payment_mode='online' AND payment_status='paid'` è ridondante dopo il blocco online |
| `claim_booking_cancellation` | Booking esclusivamente proprio, solo online, stati ammissibili; transizione a `processing` idempotente per `stripe_decision='cancel'` | **Coerente**; il completamento reale dipende dalla Edge Function Stripe |
| `claim_booking_decision` | `private.is_coach()`, `approve/reject`, lock, online autorizzato, stato e scadenza, conflitti prima di approvare | **Coerente**; Stripe deve finalizzare lato server |
| `coach_decide_booking` | `private.is_coach()`, `pending`, scadenza, blocco pagamento online, azioni consentite e quote limitate | **Coerente**; attenzione a eventuali futuri cambi policy rimborso credito |
| `coach_classify_external_event` | `private.is_coach()`, sede valida, modifica evento esistente | **Coerente** |
| `coach_mark_in_person_paid` | `private.is_coach()`, stato confirmed, metodo in_person, pagamento dovuto | **Coerente** |
| `coach_set_booking_method` | `private.is_coach()`, pending, metodo in_person; vieta passaggio online senza Stripe | **Coerente** |
| `coach_set_in_person` | `private.is_coach()`, profilo esistente con ruolo client | **Coerente** |

## Limiti e punti ancora aperti

1. **Questa è una review statica, non un penetration test.** Sono già disponibili test negativi RLS/ownership e race su DB isolato, ma non sono state esercitate tutte le transizioni con due sessioni reali e Stripe Sandbox Cloud.
2. La correttezza dei guard `private.is_coach()` e `private.coach_slot_is_free()`, trigger, grant e policy va preservata con test dedicati. Evitare di cambiare a `SECURITY INVOKER` o revocare `EXECUTE` indiscriminatamente: romperebbe i flussi applicativi.
3. La disponibilità di slot è leggibile dagli utenti autenticati. È intenzionale per la prenotazione; riconsiderare se vengono aggiunte informazioni personali agli output.
4. La protezione password compromesse di Supabase Auth risulta **disabilitata** nel Security Advisor; abilitarla dalla Dashboard quando disponibile e verificare l'impatto sui test.
5. `public.package_checkout_orders` ha RLS senza policy: **intenzionale** per uso server-only; mantenere la non esposizione a client.
6. Nessuna configurazione SMTP, backup reale, DNS/Cloudflare, Stripe Live o legal gate viene risolta da questa review.

## Risultato

**Non sono emersi bypass evidenti dei controlli di ownership/ruolo nella lettura dei 12 corpi RPC.** Il warning di Supabase resta come promemoria di superficie privilegiata, non come vulnerabilità confermata né come certificazione di sicurezza. Non effettuare mutazioni al database senza una migration, test isolati e un piano di rollback.

Documentazione ufficiale: [SECURITY DEFINER Advisor](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), [Password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection), [QA residua](QA-BOOKING-STRIPE-SANDBOX.md).

## Verifica addizionale del 16 novembre 2026

L'audit live, effettuato con sole query di catalogo e conteggi, conferma:
- 0 funzioni `SECURITY DEFINER` eseguibili da `anon`; le 12 funzioni pubbliche eseguibili da `authenticated` rimangono le RPC funzionali previste, con controlli nel corpo.
- I permessi **a livello di colonna** di `authenticated` **non** consentono `UPDATE` diretto di `public.profiles.role`, `public.profiles.allow_in_person`, `public.bookings.payment_status`, `public.wallet_credits.remaining` e `public.notifications.body`. L'utente può modificare `notifications.read_at` (con RLS di proprietà).
- I cataloghi `services` e `packages`, la disponibilità e le modifiche al calendario sono gestiti da policy `private.is_coach()` sui comandi di scrittura. `push_subscriptions` ha policy di proprietà `user_id=auth.uid()`.
- 0 wallet con saldo negativo, 0 wallet associati a ordini non pagati, 0 ordini pacchetto pagati senza wallet, 0 sovrapposizioni di prenotazioni attive e 0 prenotazioni bloccate oltre due ore al campionamento. Cron delle ultime 24h senza errori.
- Il Security Advisor continua a segnalare 12 RPC `SECURITY DEFINER` eseguibili da authenticated (superficie intenzionale da monitorare), una tabella server-only con RLS senza policy (per progetto) e leaked-password protection disattivata. La protezione password compromesse è disponibile su Supabase **Pro e superiori**, non sul piano Free, secondo [password security](https://supabase.com/docs/guides/auth/password-security).

**Limiti:** questa verifica di cataloghi/permessi e gli smoke anonimizzati non sostituiscono un penetration test né l'esercizio con due JWT di veri utenti. Le policy future devono conservare la separazione `anon` / `authenticated` / `service_role`. Non è stato abilitato alcun servizio a pagamento.


## Aggiornamento 20 novembre 2026 | 13 RPC esposte e audit fail-closed

- Nuova funzione applicativa esposta a `authenticated` rispetto al checkpoint iniziale: `public.coach_cancel_confirmed_booking(p_booking_id uuid, p_cash_refunded boolean)`. È intenzionale per la disdetta del coach e contiene `private.is_coach()`. Il suo comportamento sui crediti Flex e sul pagamento contante confermato è già coperto dalla suite PostgreSQL isolata `qa-client-cancellation-policy-isolated.mjs`; non richiede accesso anonimo.
- Il Security Advisor del 20/11/2026 segnala **13** funzioni `SECURITY DEFINER` accessibili da `authenticated` (non 12), **1** tabella server-only `package_checkout_orders` con RLS e nessuna policy (intenzionale), e **1** warning Auth per leaked-password protection disabilitata. Non interpretare questi warning come prova automatica di vulnerabilità né considerarli chiusi.
- Audit runtime `docs/QA-RPC-SECURITY-AUDIT.sql` aggiornato: elenco esplicito delle 13 RPC autorizzate, controllo guard coach sulla nuova RPC, segnalazione automatica di ogni ulteriore funzione privilegiata eseguibile da utenti autenticati ma non ancora revisionata.
- Esecuzione read-only del nuovo audit sul progetto Supabase del 20/11/2026: **22** funzioni `public SECURITY DEFINER`, **13** eseguibili da authenticated, **1** coach cancellation esposta, **0** accessibili da anon, **0 violazioni statiche**.
- Aggiunta una regressione nella suite Node che impedisce di perdere accidentalmente questi controlli nell'audit versionato. Il SQL analizza solo cataloghi e testi delle funzioni; **non** dimostra ogni ramo di autorizzazione e non sostituisce il test end-to-end con account separati.
- Il warning leaked-password protection richiede valutazione piano/feature Supabase e non autorizza alcun upgrade automatico. Anche gli advisory indici FK sono prioritizzazioni di performance da non introdurre durante il cutover senza misurazioni o necessità concreta.

**Non eseguire `REVOKE` generali sulle 13 RPC**, altrimenti la prenotazione, l'agenda e le disdette non funzionerebbero. Eventuali cambi richiedono revisione puntuale, migrazione, test e piano rollback.
