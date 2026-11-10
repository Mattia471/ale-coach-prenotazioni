# ALE COACH · Disdette 100% / 50% | Piano di attivazione controllata

Stato 10 novembre 2026: **release candidate, NON attiva**. Non usare importi veri fino alla verifica legale e Stripe Sandbox. Questo ramo aggiunge SQL, Edge Functions, UI/Termini con flag espliciti, e test automatizzati.

## Regole

- Prima della lezione, se mancano almeno 24 ore, rimborso **100%** dell'importo effettivamente pagato online.
- Se mancano meno di 24 ore ma la lezione non è iniziata, rimborso **50%**, con frazioni di centesimo arrotondate a favore del cliente. Esempio: 46,75 € → 23,38 € rimborsati e 23,37 € trattenuti.
- Dopo l'inizio della lezione, non eseguire rimborsi automatici.
- Preautorizzazioni non catturate: **annullamento** del PaymentIntent, non un rimborso.
- La nuova policy automatizzata riguarda **solo** lezioni già confermate e pagate online. Per pagamenti in presenza, gratuiti e crediti è ancora da concordare il comportamento nelle ultime 24 ore. Non inventare addebiti né trattenere crediti arbitrariamente.
- Ogni importo è congelato dalla RPC SQL al primo tentativo, così i retry non cambiano percentuale in prossimità della soglia di 24h.
- In caso di rimborso Stripe pending, l'app mostra la disdetta e il rimborso avviato, non un pagamento già accreditato; il webhook aggiorna lo stato. In caso di failed/canceled, serve intervento umano e viene notificato il coach.

## Attivazione ordinata (solo dopo GO)

1. Far approvare dal titolare e dal consulente la policy, i Termini e gli importi inclusi gli arrotondamenti, le eccezioni legali, gli acquisti online e la modalità manuale dei casi non online. Non impostare il flag legale prima.
2. Eseguire backup verificato prima della modifica schema. Applicare la migration `20261110113000_paid_booking_partial_refunds.sql` attraverso il normale flusso di migrazioni Supabase; verificare privilegi, CHECK e RPC. Non applicarla due volte manualmente.
3. In Stripe **Sandbox** ampliare la webhook destination firmata includendo `refund.created`, `refund.updated`, `refund.failed` oltre ai quattro eventi preesistenti. Verificare stessa modalità `sk_test_` e `whsec_`.
4. Distribuire `cancel-booking` e `stripe-webhook` dal branch approvato su Supabase. Tenere `CANCELLATION_POLICY_V2_ENABLED=false`.
5. Eseguire checkout sandbox con autorizzazione e successiva cattura, usando solo account autorizzati. Provare disdetta sopra, esattamente a e sotto 24h; importi dispari, sconti, Stripe retry, richieste simultanee, notifiche e disdetta successiva a refund pending. Verificare che non sia possibile doppio rimborso né saldi incoerenti.
6. Inviare anche eventi firmati di refund pending → succeeded e refund failed, con replay. Confermare `stripe_refund_status` e `payment_status` nella tabella, notifiche al coach e nessuna incongruenza.
7. Solo dopo il GO tecnico e legale, impostare sul server `CANCELLATION_POLICY_V2_ENABLED=true` (Edge Functions) e nel frontend `VITE_CANCELLATION_POLICY_V2_ENABLED=true`. Ricostruire la UI con lo stesso stato del backend. I due flag devono essere coerenti.
8. Monitorare per almeno la finestra iniziale di test edge logs, webhook non riconciliati e `bookings.payment_status in ('refund_pending','refund_failed')`; prevedere intervento manuale.
9. Rollback applicativo: riportare entrambi i flag a `false` per bloccare nuove disdette parziali; **non** eliminare colonne/migrazioni se esistono rimborsi già avviati. Lasciare webhook di riconciliazione attivo finché i refund pendenti non sono chiusi.

## Gate non ancora superati

- Stripe Sandbox end-to-end su pagamento già catturato e retry/webhook reali
- Gestione completa delle disdette con credito e pagamento in presenza sotto 24 ore
- Revisione/approvazione legale delle condizioni e delle informazioni fiscali
- Concorrenza su ultimo credito del pacchetto Flex e visibilità saldo dopo reload
- Backup/restore, SMTP e redirect Supabase Auth, verifica sicurezza RPC

**Mai aprire al pubblico, usare carte reali o attivare i flag in produzione prima di aver chiuso questi gate.**
