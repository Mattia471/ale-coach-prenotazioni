# ALE COACH | Recesso Flex e ricevute: procedura minima prima del GO

**Fonte:** revisioni del cliente del 17/11/2026. Il recesso viene comunicato dal cliente al titolare via email e gestito da un operatore, come indicato nei Termini. **Non esiste un rimborso automatico di un pacchetto dal browser.** Le normali disdette di *singole lezioni* usano invece il servizio Stripe / RPC dedicato.

## Recesso dei pacchetti Flex: gestione assistita

1. Ricevere l'email a `info@alecoach.online`, anche usando il modulo tipo `https://alecoach.online/recesso`. Conservare data di arrivo, ordine e dichiarazione del cliente. Una dichiarazione esplicita è sufficiente.
2. Verificare la data di acquisto/contratto e il termine di **14 giorni**, la qualifica del servizio e gli eventuali presupposti di legge per pagare la prestazione iniziata nel termine di recesso. Non subordinare il diritto alla compilazione di un modulo particolare.
3. Consultare l'ordine `package_checkout_orders` **pagato**, il wallet `wallet_credits` legato al medesimo `stripe_session_id`, e la quantità di crediti prevista **al momento dell'acquisto**. Non fidarsi del catalogo se è cambiato dopo la vendita.
4. Verificare se i crediti siano stati realmente **utilizzati per lezioni svolte**, non soltanto prenotati per appuntamenti futuri. Le lezioni future associate al wallet devono essere risolte/cancellate correttamente prima di completare il recesso. Non togliere crediti a una persona mentre conserva una prenotazione pagata con quel credito.
5. Calcolare il rimborso proporzionale, in centesimi, a partire dall'importo **effettivamente incassato** e dal valore delle lezioni svolte. Esempio puramente matematico: pacchetto da 5 crediti pagato 250 €; 2 lezioni svolte → rimborso 150 €. Verificare l'arrotondamento in centesimi e eventuali condizioni di legge prima del pagamento.
6. Eseguire il rimborso **dal conto Stripe corretto**, sullo stesso metodo di pagamento, entro il termine previsto dal cliente (di norma **14 giorni dalla comunicazione del recesso**). Usare la transazione del Checkout originale, mai una transazione di un altro cliente. Tenere evidenza Stripe ID, importo, stato e data; non inviare ID/account privati in GitHub o chat.
7. Riconciliare il wallet **prima di chiudere il caso**: impedire nuovi utilizzi dei crediti rimborsati, salvando la verifica dell'operatore, gli importi e gli esiti della pratica. Il database non deve conservare crediti spendibili dopo il rimborso; serve un intervento amministrativo tracciato e verificato. **Non eseguire UPDATE generici o resettare l'intero database.**
8. Confermare al cliente in forma tracciabile l'esito del recesso, l'importo riconosciuto e i tempi previsti dal gestore della carta. Gestire eccezioni o controversie separatamente.

**Gap operativo da non nascondere:** non è ancora disponibile un pannello self-service di recesso pacchetti né un'unica RPC di congelamento wallet + Stripe refund. È una procedura **manuale del titolare**, sostenibile come prima release a bassi volumi, ma una pratica reale non può essere chiusa solo tramite l'email senza correggere il wallet. Se il cliente richiede automazione, serve una change request separata e un test finanziario ad hoc.

## Email ricevuta di pagamento tramite Stripe

Stripe genera una ricevuta per i pagamenti riusciti e può inviarla automaticamente via email. Nel conto Live del cliente, aprire [Stripe Dashboard → Settings → Business → Customer emails](https://dashboard.stripe.com/settings/emails) e abilitare almeno **Successful payments**; valutare anche **Refunds**. Verificare l'indirizzo di supporto e i dettagli aziendali nel profilo Stripe. [Documentazione ufficiale Stripe](https://docs.stripe.com/receipts).

- L'integrazione Checkout usa già `customer_email` dall'utente verificato, sia per Flex sia per le lezioni. Per le lezioni online, la ricevuta segue la **cattura riuscita**, non la sola preautorizzazione.
- In **Stripe test mode**, non confondere l'assenza di email automatica con un errore dell'app: Stripe indica di inviare manualmente le ricevute dei pagamenti di prova. Il test funzionale principale rimane la corretta cattura/ordine/wallet.
- La **ricevuta di pagamento Stripe** non sostituisce gli eventuali documenti fiscali richiesti dalla normativa italiana. Eventuale fattura automatica o integrazione fiscale non è inclusa nel perimetro web.
- Prima del GO commerciale verificare dal Dashboard la configurazione `Successful payments`; non promettere il recapito automatico senza questa impostazione.

## Regole rapide per l'operatore

- Disdetta del cliente prima dell'inizio: online >=24 ore restituisce 100%; sotto 24 ore 50%; Flex restituisce 1 credito con la stessa scadenza; in presenza non pagata nessuna penale; in presenza già incassata richiede verifica e rimborso fisico.
- No-show senza disdetta: nessun rimborso online e nessun credito restituito.
- Annullamento del coach: rimborso integrale online e credito Flex restituito. Rimborso in contanti già incassati soltanto **dopo la restituzione reale**, con conferma esplicita nell'app.
- Per problemi di rimborso, non ripetere manualmente una transazione senza verificare prima il suo stato in Stripe e il valore già registrato nel database.
