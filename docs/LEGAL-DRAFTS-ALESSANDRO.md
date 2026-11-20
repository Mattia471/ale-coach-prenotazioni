# ALE COACH APP | Bozze legali per revisione

**Stato: BOZZA, NON APPROVATA, NON PUBBLICARE COME INFORMATIVA DEFINITIVA.**

Titolare: **Alessandro Cola**, P. IVA **16688071006**, Via Augusto Camerini 91, **00139 Roma (RM)**, **info@alecoach.online**.

Queste bozze non sostituiscono la verifica del titolare e, se necessario, di un consulente legale/privacy. Non impostare `VITE_LEGAL_APPROVED=true` né aprire la registrazione pubblica finché non sono risolti tutti i punti di verifica. L'app contiene già un gate per le informative non approvate.

## 1. Informativa privacy (bozza, art. 13 GDPR)

**Titolare e contatti.** Alessandro Cola, dati sopra indicati. Per richieste sui dati personali: info@alecoach.online.

**Dati trattati.** Identificativi e contatti (nome, cognome, email, telefono); credenziali gestite dal servizio di autenticazione (non password in chiaro); dati di profilo, preferenze e prenotazioni; dettagli delle lezioni e dello stato dei pagamenti; informazioni tecniche necessarie a sicurezza e funzionamento; identificativi delle sottoscrizioni push quando attivate. I dati della carta sono inseriti nell'ambiente del fornitore di pagamento, non nel modulo dell'app. **Da verificare:** se campi liberi e richieste del cliente possano contenere dati relativi alla salute, limitare e disciplinare esplicitamente tale trattamento prima dell'uso.

**Finalità e basi giuridiche da confermare.** Creazione e gestione account, prenotazioni, gestione del rapporto professionale e assistenza: esecuzione del contratto o misure precontrattuali (art. 6(1)(b)); adempimenti fiscali e legali: obbligo di legge (art. 6(1)(c)); protezione dell'app e prevenzione abusi: legittimo interesse, dopo valutazione e bilanciamento (art. 6(1)(f)); notifiche push opzionali: verificare base giuridica appropriata e scelta dell'utente. Eventuale marketing richiede finalità, base giuridica e scelta separata; non è incluso automaticamente.

**Destinatari e fornitori.** Servizi tecnici utilizzati dall'app, inclusi Supabase (autenticazione e database), Vercel (hosting) e Stripe (pagamenti), secondo ruoli privacy, configurazioni e contratti effettivi da verificare. Identificare ulteriori fornitori (push, monitoraggio, analytics) prima del lancio.

**Trasferimenti internazionali.** Da verificare localizzazione dei dati, eventuali trasferimenti extra SEE e relative garanzie per ciascun fornitore.

**Conservazione.** Stabilire e documentare periodi distinti per account, prenotazioni, documenti fiscali, log, notifiche e dati push. Evitare indicazioni numeriche inventate; applicare cancellazione o anonimizzazione quando non più necessari, salvi obblighi legali.

**Diritti.** L'interessato può richiedere accesso, rettifica, cancellazione, limitazione, portabilità ove applicabile e opposizione nei casi previsti, contattando il titolare. Può proporre reclamo al Garante per la protezione dei dati personali. Indicare modalità di risposta e gestione richieste.

**Obbligatorietà.** Dati essenziali necessari alla registrazione e prenotazione; specificare nel modulo quali sono facoltativi. Le notifiche push sono facoltative.

**Decisioni automatizzate.** Verificare se esistono processi rilevanti ai sensi dell'art. 22 GDPR; non dichiararne l'assenza senza verifica.

**Data e versione:** da definire alla revisione finale.

## 2. Termini e condizioni (bozza)

**Fornitore.** Alessandro Cola, P. IVA 16688071006, Via Augusto Camerini 91, 00139 Roma (RM), info@alecoach.online.

**Oggetto.** La piattaforma permette di richiedere e gestire lezioni con il professionista. Le disponibilità sono soggette a conferma del coach. Descrizioni, durata, luogo e prezzo sono indicati nell'interfaccia prima della richiesta; verificare che siano sempre coerenti con l'offerta effettiva.

**Account.** Il cliente fornisce informazioni corrette, mantiene riservate le credenziali e segnala accessi non autorizzati.

**Prenotazione e conclusione del contratto.** Definire in modo univoco quando la prenotazione diventa vincolante e cosa accade in caso di rifiuto del coach; allineare testi al flusso reale di autorizzazione carta Stripe, conferma e incasso.

**Pagamenti.** L'app prevede pagamento anticipato online come regola e pagamento in presenza soltanto per clienti abilitati dal coach. Specificare se l'importo viene autorizzato prima della conferma e acquisito dopo, e quando l'autorizzazione viene annullata. Indicare metodi, valuta, imposte e documentazione fiscale.

**Cancellazioni, spostamenti e rimborsi.** DA DEFINIRE: anticipo minimo di disdetta, assenza del cliente, ritardo, annullamento del coach, condizioni dei pacchetti, scadenze e rimborso. Verificare le norme applicabili al recesso nei contratti a distanza e le eventuali eccezioni: non inserire una rinuncia generalizzata ai diritti del consumatore.

**Idoneità e sicurezza.** Descrivere eventuali requisiti di accesso alle strutture e modalità di verifica; non chiedere documentazione sanitaria in campi generici senza adeguata base e informativa. Non usare esoneri generici di responsabilità per negligenza o obblighi inderogabili.

**Contatti e reclami.** info@alecoach.online. Definire canale e tempi di gestione.

**Legge applicabile e controversie.** Normativa italiana, senza pregiudizio delle tutele inderogabili del consumatore e del foro competente.

**Data e versione:** da definire alla revisione finale.

## 3. Cookie e tecnologie analoghe (bozza)

**Titolare.** Alessandro Cola, contatti sopra indicati.

**Tecnologie tecniche.** L'app può usare memoria locale, cookie o altri identificatori necessari per sessione, sicurezza e preferenze; inventariarli concretamente indicando nome, fornitore, scopo e durata.

**Terze parti.** Verificare l'effettiva presenza di strumenti di analisi, marketing, embed o tracciamento e la loro attivazione; non dichiarare che non ci siano senza audit del sito e dei domini caricati.

**Scelte.** Per strumenti non tecnici, valutare se sia richiesto consenso preventivo e implementare un meccanismo di scelta e revoca conforme alle regole applicabili. Nessun banner superfluo per soli strumenti tecnici.

**Aggiornamenti.** Data e versione da definire.

## Checklist bloccante prima di abilitare registrazioni e prenotazioni pubbliche

- [ ] Alessandro conferma esattezza della sede e titolarità dei dati aziendali.
- [ ] Definite modalità di prenotazione, cancellazione, recesso, rimborsi e pagamento.
- [ ] Inventario reale di cookie, analytics, log e push; fornitori e trasferimenti verificati.
- [ ] Definiti tempi di conservazione, cancellazione e gestione richieste GDPR.
- [ ] Valutato trattamento di dati sanitari nei campi liberi e adeguate misure.
- [ ] Verificati DPA e ruoli privacy dei fornitori, inclusi Stripe/Supabase/Vercel.
- [ ] Testate pagine /privacy, /termini, /cookie e link nei form.
- [ ] Approvazione documentata del titolare; data e versione.
- [ ] Verificata configurazione server di registrazione (allowlist `private.on_signup`) oltre al gate frontend.
- [ ] Test registrazione, conferma email, ruolo client, RLS e accesso coach.

**Nota:** Queste bozze sono materiale di lavoro, non un parere legale o una dichiarazione di conformità.
