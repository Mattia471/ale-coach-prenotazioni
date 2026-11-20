# ALE COACH V1 | Pulizia selettiva dati QA prima del GO

**Decisione del responsabile: 16/11/2026.** L'attuale dataset Supabase è di collaudo e non deve essere conservato tramite un backup storico per questa release. Il responsabile intende rimuoverlo durante il passaggio alla versione commerciale. **Nessun dato deve essere rimosso finché servono i test**, e non si deve aspettare che i primi clienti reali prenotino prima di eseguire la pulizia.

## Inventario read-only (16/11/2026, conteggi e non dati personali)

| Categoria | Tabelle / numero di record |
| --- | --- |
| Identità | `auth.users`: 2; `profiles`: 2 (1 coach, 1 cliente QA) |
| Prenotazioni e transazioni | `bookings`: 16; `notifications`: 31; `package_checkout_orders`: 4; `wallet_credits`: 2; `slot_holds`: 1; `push_subscriptions`: 3 |
| Catalogo e pianificazione | `services`: 6; `venues`: 2; `availability_windows`: 10; `working_hours`: 7; `discount_codes`: 3; `calendar_closures`: 4; `calendar_course_blocks`: 12 |
| Integrazioni | `external_calendar_events`: 0; `google_calendar_sync`: 1 |
| File | `storage.objects`: 0 |

**Non è una lista di comandi di cancellazione.** I record possono cambiare durante i test, e FK/trigger/Edge/RPC o Stripe possono collegarli in modi che richiedono verifica. Non conservare utenti di prova come clienti commerciali per errore.

## Processo al cutover (richiede approvazione esplicita separata)

1. **Chiudere i test Sandbox** e impedire temporaneamente nuovi login/prenotazioni nel breve intervallo di bonifica. Verificare la data del cutover e l'ambiente Supabase corretto.
2. Eseguire **inventario aggiornato solo SELECT** delle tabelle QA, utenti, slot, notifiche, crediti, eventuali file e riferimenti a Checkout/PaymentIntent Stripe test. Identificare esplicitamente gli account cliente QA, senza desumerlo soltanto dal ruolo.
3. Preparare uno script SQL/operativo **selettivo, revisionato e idempotente**, con contatori prima/dopo e verifiche di FK, non `TRUNCATE ... CASCADE` generico. Evitare trigger di invio email/push, webhook e fatturazione durante la pulizia. Non cancellare Stripe Live né manipolare i movimenti Sandbox per mezzo di SQL.
4. **Preservare** account coach verificato, servizi, pacchetti, sedi, disponibilità e calendario aziendale approvati, codici sconto confermati, schema, migrazioni, configurazione Supabase Auth/SMTP, RLS, cron, Edge Functions, secrets Cloudflare, dominio e webhooks. Verificare eventuali righe di calendario create soltanto per QA prima di decidere su quelle specifiche.
5. Eliminare gli account cliente QA in modo coerente tramite la superficie Auth amministrativa appropriata, dopo aver risolto i riferimenti FK e le autorizzazioni. **Non eseguire adesso** alcuna operazione di cancellazione o reset `auth.users`.
6. Verificare dopo la pulizia: coach ancora autenticabile, catalogo e calendario invariati, zero prenotazioni/notifiche/crediti QA residui, zero dati cliente QA visibili; nessun saldo reale toccato. Ripetere smoke di login, richiesta slot e sito legale nel nuovo contesto.
7. **Solo dopo la checklist commerciale e GO esplicito**, aggiornare i flag del frontend/Stripe. Effettuare un controllo di una prenotazione reale autorizzata. Nessuna transazione Live prima dell'approvazione del titolare.

## Protezione dei dati clienti dopo il cutover

L'esonero deciso dal responsabile riguarda **solo il dataset di collaudo**. Prima di raccogliere dati reali, concordare una strategia operativa per proteggere dati e continuità: backup automatizzati/gestiti o esportazioni cifrate programmate, custodia credenziali, luogo di conservazione, frequenza, possibilità di ripristino e responsabile degli incidenti. Vedi [BACKUP-RESTORE-RUNBOOK.md](BACKUP-RESTORE-RUNBOOK.md) per la procedura già preparata. La prova sintetica di restore esistente non equivale a protezione dei dati in produzione.

**Stato:** pianificazione e inventario soltanto. Nessuna cancellazione autorizzata o effettuata. Il sito rimane in `PAGES_RELEASE_MODE=prelaunch`, `VITE_LEGAL_APPROVED=false`, Stripe Live OFF e signup allowlist attivo.

## Script di apertura registrazioni: sequenza successiva alla pulizia QA

Una volta terminato il collaudo, ottenuta autorizzazione al reset e rimossi i **soli** dati QA, il progetto deve preservare l'account del coach e le configurazioni. Le iscrizioni sono ancora limitate dalla funzione Supabase `private.on_signup()` finché non si effettua un GO deliberato. I due script [GO pubblico](sql/V1-GO-PUBLIC-SIGNUP-NOT-APPLIED.sql) e [rollback allowlist](sql/V1-ROLLBACK-RESTORE-SIGNUP-ALLOWLIST-NOT-APPLIED.sql) sono versionati **fuori** da `supabase/migrations`, per evitare applicazioni automatiche.

L'ordine è: approvazioni legali e Stripe; pianificazione dei backup futuri; blocco delle nuove operazioni QA; reset selettivo autorizzato e verificato; conferma config/coach; **GO esplicito**; esecuzione dello script di apertura iscrizioni nell'ambiente Supabase corretto; verifica di un nuovo account cliente con `role='client'` e senza privilegi; verifica dell'endpoint web pubblico, delle informazioni legali e degli avvisi; abilitazione commerciale soltanto quando tutti i gate sono passati. Eventuale rollback blocca **nuove iscrizioni** ma non revoca account/sessioni già esistenti.

Nessuno di questi passaggi sul cloud è stato eseguito durante la preparazione.


## Inventario aggiornato 20 novembre 2026 | Dopo il rimborso Sandbox

Campionamento **read-only** su Supabase ALE COACH, dopo il ciclo completo di autorizzazione, cattura e rimborso del 20/11/2026. I conteggi storici del 16/11 in testa al documento sono conservati per confronto.

| Categoria | Conteggio attuale |
| --- | ---: |
| Utenti Auth | 2 |
| Profili coach / cliente QA | 1 / 1 |
| Prenotazioni QA | 17 |
| Prenotazioni con rimborso registrato | 1 |
| Notifiche | 35 |
| Ordini pacchetto / wallet | 4 / 2 |
| Slot hold aperti / push subscriptions | 0 / 3 |
| Servizi / pacchetti / sedi | 6 / 4 / 2 |
| Finestre disponibilità / blocchi corsi / chiusure | 10 / 12 / 4 |
| File Storage | 0 |

**Invarianti:** 0 wallet negativi; 0 booking `authorizing/processing` vecchi oltre 2 ore; 0 lezioni online confermate ma non pagate; 0 rimborsi segnati `refunded` senza importo positivo e data; 0 ordini pagati senza wallet. I due cron `ale-coach-expire-bookings` e `ale-coach-release-stripe-authorizations` risultano attivi, ciascuno con 288 esecuzioni riuscite e 0 fallite nelle ultime 24 ore.

**Significato operativo:** questo è soltanto un inventario preparatorio. Sono ancora presenti i dati di collaudo inclusi quelli del rimborso E2E. Nessun `DELETE`, `TRUNCATE`, operazione Stripe o modifica utenti Auth è stata eseguita per preparare questo checkpoint. Al cutover occorrerà rifare l'inventario in quel momento e applicare esclusivamente la pulizia selettiva **dopo autorizzazione esplicita**. Preservare sempre account coach, cataloghi, configurazioni, cron e migrazioni.

**Protezione dati commerciali futuri:** la strategia del documento [BACKUP-RESTORE-RUNBOOK.md](BACKUP-RESTORE-RUNBOOK.md) è tecnicamente predisposta ma non ancora operativa. Sul piano Supabase Free i backup automatici scaricabili non sono inclusi: opzioni da far deliberare al titolare sono (A) Supabase Pro con backup gestiti, (B) dump PostgreSQL cifrato age verso destinazione esterna con schedulazione e restore isolato. Non programmare job che esportino dati personali verso servizi non approvati, non usare il dataset QA per una copia che il titolare ha dispensato e non considerare test sintetici equivalenti a un restore reale.
