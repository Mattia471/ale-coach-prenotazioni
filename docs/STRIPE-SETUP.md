# Ale Coach · Giorno 1, configurazione Stripe (solo account del coach)

Aggiornato il 4 novembre 2026. Integrazione sul solo Supabase Cloud del cliente.
Non creare ambienti Docker, non salvare segreti in repository, Vercel o browser.

## Stato già verificato

- [x] Progetto Supabase Ale Coach: `mmtnzjdvvlouiwgrydlf`, `eu-west-1`.
- [x] Stripe creato dal titolare (confermato dal cliente, **account non ancora verificato tramite API**).
- [x] Edge Functions `create-checkout`, `stripe-webhook`, `cancel-booking` pubblicate con protezione test/live.
- [x] Le funzioni non elaborano pagamenti senza `STRIPE_PAYMENTS_ENABLED=true` e chiave coerente.
- [x] Webhook: `verify_jwt=false`, ma firma `Stripe-Signature` verificata lato server sui byte originali.
- [x] Risolto crash runtime `Cannot find module tslib` sostituendo l'import Supabase JS con `npm:@supabase/supabase-js@2`.
- [x] Ordini pacchetto non scrivibili direttamente dal browser; grants potenzialmente pericolosi rimossi.
- [ ] Credenziali **Stripe TEST** del coach da configurare nei segreti Supabase, non in chat.
- [ ] Registrare endpoint webhook di test e verificare ricezione eventi firmati.
- [ ] Sviluppare autorizzazione carta prima dell'approvazione e cattura differita richiesta dalla v2.
- [ ] Collaudare rinnovi Continuity e annullamenti/rimborsi, quindi concordare apertura commerciale.

## Le impostazioni Stripe TEST da completare

1. Accedere al proprio account Stripe e attivare **test mode / sandbox**.
2. Aprire la sezione **Developers / API keys** e individuare la chiave segreta di test `sk_test_...`.
   Non inviarla in una chat, email, screenshot o file GitHub.
3. Aprire Supabase del coach:
   https://supabase.com/dashboard/project/mmtnzjdvvlouiwgrydlf/functions/secrets
4. Aggiungere i seguenti **Edge Function Secrets**:

   | Segreto | Valore consentito |
   | --- | --- |
   | `STRIPE_SECRET_KEY` | La chiave privata **sk_test_** dell'account del coach |
   | `STRIPE_ENVIRONMENT` | `test` |
   | `PUBLIC_APP_URL` | `https://ale-coach-prenotazioni.vercel.app` |
   | `STRIPE_PAYMENTS_ENABLED` | Inizialmente **`false`** |

5. In Stripe, registrare in **modalità test** un webhook destination HTTPS:
   `https://mmtnzjdvvlouiwgrydlf.supabase.co/functions/v1/stripe-webhook`.
   Sottoscrivere inizialmente `checkout.session.completed`. Quando la v2 sarà pronta,
   aggiungere eventi per autorizzazioni, annullamenti, catture e pagamenti falliti.
6. Copiare **soltanto nella Dashboard Supabase** il segreto di firma della destination
   Stripe (prefix `whsec_`) con nome `STRIPE_WEBHOOK_SECRET`.
   Il webhook e la chiave segreta devono provenire dalla **stessa modalità test**.
7. In questa fase **non modificare** `STRIPE_PAYMENTS_ENABLED`: l'abilitazione sarà
   eseguita solo dopo i test di integrazione, con pagamenti simulati. **Mai usare
   `sk_live_`** nel cloud durante questo collaudo.

Il link Vercel usa le **sole** variabili pubbliche di Supabase; Stripe Secret Key,
signing secret e credenziali Google sono conservate esclusivamente su Supabase.

## Flusso richiesto dalla specifica v2: non confondere con il checkout attuale

Per lezioni singole l'obiettivo è:

1. Cliente sceglie data, sede e servizio.
2. Il server ricontrolla disponibilità, importo e validità della richiesta.
3. Stripe Checkout autorizza la carta con **`payment_intent_data.capture_method=manual`**:
   il cliente completa l'autenticazione, il denaro non viene ancora incassato.
4. Webhook firmato conferma `requires_capture`; la prenotazione resta in attesa del coach.
5. Il coach approva, il server ricontrolla Google Calendar e cattura **una sola volta**;
   la conferma definitiva arriva dopo riscontro Stripe.
6. In caso di rifiuto/scadenza si annulla l'autorizzazione; mai indicarla come rimborso
   di un addebito già incassato.
7. Registrare gli ID Stripe, gli stati, i motivi, le scadenze dell'autorizzazione
   e le idempotency key sul backend. Il client non può cambiare importi o stati.

**Limitazione importante:** le autorizzazioni di carte online in genere scadono
entro circa 5–7 giorni a seconda del circuito e tipo di transazione; non assumere
che un'autorizzazione possa restare valida per tutto l'orizzonte di prenotazione
di 42 giorni. Il coach deve decidere in tempo utile. La v2 richiede risposta
in massimo 24h, che è compatibile solo se le autorizzazioni vengono effettivamente
monitorate e confermate.

Documentazione ufficiale:
- https://docs.stripe.com/payments/place-a-hold-on-a-payment-method
- https://docs.stripe.com/webhooks
- https://supabase.com/docs/guides/functions/secrets

## Casi da verificare prima del GO

- [ ] Pagamento test che produce `requires_capture`, senza incasso.
- [ ] Rifiuto coach, scadenza e retry: nessuna carta addebitata.
- [ ] Doppio webhook e doppio clic del coach: una sola cattura o rimborso.
- [ ] Pagamento già autorizzato ma Google non aggiornato: nessuna conferma, niente addebito.
- [ ] Disponibilità cross-sede: un solo posto per coach, sempre.
- [ ] Sconto ALECOACH15 applicato dal server, non alterabile nel browser.
- [ ] Flex 5 e 10: un solo wallet di crediti per checkout pagato.
- [ ] Continuity 4 e 8: implementare **solo dopo** un flusso Billing e condizioni approvate.
- [ ] Rimborsi e chargeback conciliati con il database, senza modificare impropriamente storico e fatture.
- [ ] Segreti live inaccessibili dal browser; reviewer GDPR/fiscale approva prima dell'attivazione.

**Nessuna carta reale viene testata in questa fase.**
