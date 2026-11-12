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
