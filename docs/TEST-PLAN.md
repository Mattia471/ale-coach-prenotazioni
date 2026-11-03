# Piano test prima di andare live

## Autenticazione e ruoli
- [ ] Registrazione cliente con email valida, password sicura, email di conferma o Google OAuth.
- [ ] Login/logout e recupero password.
- [ ] Un cliente NON può aprire area coach alterando URL, stato JavaScript o chiamate REST.
- [ ] Un cliente NON può impostare `role=coach`, `allow_in_person=true`, né leggere altri utenti.

## Prenotazioni
- [ ] Un cliente Virgin Active prenota ognuno dei 6 servizi con campi specifici validati.
- [ ] Un utente non iscritto non può inviare richieste neppure via API.
- [ ] Due clienti che prenotano lo stesso slot contemporaneamente: una sola prenotazione accettata.
- [ ] Gli slot di due sedi diverse non si sovrappongono (unico coach).
- [ ] Richiesta respinta/disdetta/scaduta libera il posto.
- [ ] Disdetta: consentita oltre 24 ore; bloccata entro 24 ore.
- [ ] Scadenza 24 ore tramite cron con test su record scaduti.

## Pagamenti
- [ ] `ALECOACH10` 10% prima lezione entro 7 giorni; tentativo seconda lezione e codice scaduto respinti.
- [ ] Il browser non può cambiare prezzo/percentuale o confermare pagamento con REST.
- [ ] Coach abilita pagamento in palestra solo al cliente scelto.
- [ ] Senza autorizzazione, RPC in_person respinta.
- [ ] Stripe test checkout: cancellazione sul checkout non cambia stato in `confirmed`.
- [ ] Webhook con firma falsa: HTTP 400, nessuna modifica DB.
- [ ] Webhook legittimo: confirmed e paid una volta soltanto; doppio evento non crea doppia conferma.
- [ ] Disdetta prima di 24 ore: refund idempotente. Dopo 24 ore: rifiutata.
- [ ] Acquisto pacchetto: crediti +5 o +10 una volta soltanto, scadenza corretta; non cumulabili sconti.

## PWA / marketing
- [ ] Installa PWA Android e iOS (iOS: aggiungere alla Home), richiedi consenso push su gesto esplicito.
- [ ] Notifica in-app, push con VAPID e rimozione endpoint scaduti.
- [ ] Link Instagram bio/DM FORZA/Meta/QR ALECOACH10 registrano la fonte corretta.
- [ ] Nessun account o dato personale presente nell'archivio pubblicato.

## QA manuale
- [ ] Zoom 100%; viewport 320/375/430/768/1280 px, navigazione da tastiera.
- [ ] Calendario durante cambio ora legale e fuso Europe/Rome.
- [ ] Feedback di errore credenziali e rete offline; niente successi fasulli.
- [ ] `npm run build` senza errori TS e senza chiavi riservate.

## Verifica locale ripetibile

Con Docker e Supabase locale attivi, dopo tutte le migrazioni:

```powershell
npm run local:check
npm run local:integration
npm run build
```

`local:integration` usa esclusivamente l'API localhost e **crea due clienti temporanei**
per verificare RLS, autorizzazioni, collisioni vere tra utenti diversi e coupon
ALECOACH10. Elimina gli utenti al termine; non va eseguito su un database cloud.
Richiede almeno tre slot consecutivi liberi tra domani+2 e domani+7 e il promo attivo.

## Nuove prove P0 prima dei pagamenti live
- [ ] Due click simultanei sul checkout della **stessa** prenotazione restituiscono una sola sessione Stripe, con retry dopo scadenza.
- [ ] Due checkout di acquisto dello stesso pacchetto condividono l'ordine pending e una sola sessione Stripe.
- [ ] Due webhook pacchetto simultanei creano **esattamente un** wallet e una notifica, con transazione SQL.
- [ ] Se il listino pacchetti cambia durante il checkout, l'ordine conserva il prezzo concordato.
- [ ] Webhook su ordine pacchetto scaduto o incongruente attiva rimborso senza accreditare lezioni.
- [ ] Preventivo torna in scadenza dopo la quotazione e scade tramite cron.
- [ ] Rimborsi: errore DB dopo richiesta Stripe, retry ed eventuale riconciliazione manuale verificata.
- [ ] SMTP del dominio, conferme email, password reset e protezione anti-abuso.
- [ ] Backup cifrato fuori piattaforma, **ripristino completo anche degli oggetti Storage** testato.
- [ ] Google login nascosto finché provider non configurato; se attivato provare OAuth dalla URL reale.
- [ ] Test mobile 320–430px, accessibilità, PWA e assenza di dati/credenziali nel bundle.
- [ ] Security Advisor Supabase e permessi RPC `service_role` verificati.
