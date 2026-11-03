# Piano test prima di andare live

## Autenticazione e ruoli
- [ ] Registrazione cliente con email valida, password sicura, email di conferma o Google OAuth.
- [ ] Login/logout e recupero password.
- [ ] Un cliente NON pu√≤ aprire area coach alterando URL, stato JavaScript o chiamate REST.
- [ ] Un cliente NON pu√≤ impostare `role=coach`, `allow_in_person=true`, n√© leggere altri utenti.

## Prenotazioni
- [ ] Un cliente Virgin Active prenota ognuno dei 6 servizi con campi specifici validati.
- [ ] Un utente non iscritto non pu√≤ inviare richieste neppure via API.
- [ ] Due clienti che prenotano lo stesso slot contemporaneamente: una sola prenotazione accettata.
- [ ] Gli slot di due sedi diverse non si sovrappongono (unico coach).
- [ ] Richiesta respinta/disdetta/scaduta libera il posto.
- [ ] Disdetta: consentita oltre 24 ore; bloccata entro 24 ore.
- [ ] Scadenza 24 ore tramite cron con test su record scaduti.

## Pagamenti
- [ ] `ALECOACH10` 10% prima lezione entro 7 giorni; tentativo seconda lezione e codice scaduto respinti.
- [ ] Il browser non pu√≤ cambiare prezzo/percentuale o confermare pagamento con REST.
- [ ] Coach abilita pagamento in palestra solo al cliente scelto.
- [ ] Senza autorizzazione, RPC in_person respinta.
- [ ] Stripe test checkout: cancellazione sul checkout non cambia stato in `confirmed`.
- [ ] Webhook con firma falsa: HTTP 400, nessuna modifica DB.
- [ ] Webhook legittimo: confirmed e paid una volta soltanto; doppio evento non crea doppia confe∂ªßq´^