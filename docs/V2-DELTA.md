# Ale Coach v2 · Confronto specifica / codice
Fonte: `Ale_Coach_Specifica_Calendario_Listino.docx`, v2, 4 novembre 2026. Documento operativo e registro delle differenze. **Non è una certificazione del rilascio.**

## Integrato nel codice (ancora da collaudare su Postgres reale)
- Prezzi individuale **55 €**, Duo **80 €**, check **35 €**, valutazione **50 €**, colloquio gratuito.
- **Flex 5 / 250 €**, **Flex 10 / 450 €**, scadenze di 3 e 6 mesi calendario dal pagamento. Importi storici salvaguardati.
- **Continuity 4 / 150 € al mese** e **Continuity 8 / 260 € al mese**, con **minimo 2 mesi** memorizzato nel catalogo e comunicato nelle schede.
- **ALECOACH15** sulla sola prima individuale, 15% = **46,75 €**; vecchio ALECOACH10 e AMICO10 disattivati.
- Sedi **Talenti, Nuovo Salario, Indifferente**; possibilità effettiva di prenotare restituita dal server.
- Finestre settimanali multiple per sede, griglia a **15 minuti**, durata 15/30/45/60 minuti, intervallo 12 ore–42 giorni.
- Unico coach su due club, blocco concorrenza database, **10 minuti dopo PT**, **15 prima/10 dopo corsi**, **45 minuti di viaggio**.
- Hold di **10 minuti** su slot selezionato, una riserva per utente, con operazioni server atomiche.
- Chiusure provvisorie **11–13 novembre** e **21–22 novembre**, modificabili/approvabili dal coach.
- Palinsesto GRID/HYROX/Cross Active/Calisthenics del documento solo **19 ottobre–30 novembre 2026**. Nov 6 HYROX un evento; Nov 16 TRX un evento **da verificare**: durata 16:15–17:15 è cautelativa, non dichiarata dal documento. Nessuna ricorrenza TRX generata.
- La release base usa esclusivamente l'agenda interna: ora il coach può aggiungere blocchi orari una tantum e chiusure per intere giornate direttamente dalla schermata Disponibilità; questi dati vengono considerati dall'RPC anti-sovrapposizione. Google Calendar rimane un'integrazione **premium a preventivo separato**, da sviluppare e abilitare solo se richiesta in futuro. L'app non effettua sincronizzazioni Google nella release base.
- Il trigger impedisce conferme sovrapposte o su giorni chiusi e la decisione Stripe ricontrolla gli slot interni prima della cattura.
- Card “Dettagli e regole”, disciplina facoltativa e nuovo QR/link con ALECOACH15.
- Upload di documenti potenzialmente sanitari ancora disabilitato lato UI e Storage RLS.

## Non ancora implementato o non collaudato: BLOCCO GO-LIVE
1. **Stripe manual authorization/capture:** la v2 vuole autorizzare all'invio e incassare alla conferma, ma il codice esistente richiede Checkout **dopo** l'approvazione. Non mostrare pulsanti «Autorizza e invia» finché non ci sono PaymentIntent manual capture, webhook, annullamento hold e riconciliazione testati.
2. **Continuity ricorrenti:** prezzo/testi presenti, acquisto volutamente disabilitato. Mancano Stripe Billing, impegno di 2 mesi, rinnovo il giorno originario, quote 4/8, carry-over di 1 credito per massimo 14 giorni, extra 37,50/32,50 €, blocco crediti per pagamenti falliti.
3. **Extra premium Google Calendar:** su richiesta futura, con preventivo separato, OAuth del coach e test di sincronizzazione. Nessuna dipendenza nella release base.
4. **Spostamenti:** manca RPC che riserva il nuovo slot prima di liberare il precedente, preservando la prenotazione originale su errore.
5. **Gestione annullamenti coach, proroghe e resi:** manca una contabilità completa dei movimenti credito e relativi rimborsi.
6. **Agenda coach e conflitti:** vista giorno/settimana, filtri incassi/sede, override per singola data, ferie ricorrenti, audit dei cambi prezzi da completare; integrazione Google solo come extra futuro.
7. **Notifiche** di promemoria 48/24 ore e registro degli invii da completare.
8. **Prezzi e condizioni versionati:** i prezzi in centesimi vengono salvati, ma manca uno snapshot contrattuale completo su rinnovi/quotazioni.
9. **Evento lunedì 18:45–19:45** citato senza data: va identificato dal calendario operativo, non trasformato arbitrariamente in ricorrenza.

## Solo extra opzionale futuro: sincronizzazione Google (NON attivare nella release base)
Configurare Supabase Edge Secrets: `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_REFRESH_TOKEN`, `GOOGLE_CALENDAR_IDS` (CSV), `GOOGLE_SYNC_SECRET`. Il refresh token deriva dall'autorizzazione **dell'account Google del coach** e non va mai committato. Deploy `google-calendar-sync` con JWT disabilitato, ma POST protetto dall'header `x-ale-google-sync-secret`. Pianificare ogni 5 minuti con Supabase Cron/pg_net e Vault, testare eventi, eccezioni, cancellazioni e fusione occupazioni duplicati.

## Verifiche obbligatorie
- `verificare lo storico migrazioni di Supabase Cloud` su Supabase Cloud: tutte le nuove migrazioni applicate nell'ordine.
- `eseguire il collaudo controllato sul Supabase Cloud`: 2 clienti simultanei, promo, hold, RLS e blocco upload.
- Test su calendario DST, margini, sede, assenze, classi settimanali e prenotazioni in parallelo.
- Test Stripe Sandbox e verifiche complete dell'agenda interna, anche senza Google.
- Controlli GDPR, condizioni contrattuali, backup, cron, pagamento e fatturazione.

**Stato: nessun permesso ai pagamenti live finché questi blocchi P0 non sono risolti.**
