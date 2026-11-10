# Ale Coach: checklist GDPR, privacy e conformità del servizio

**Stato al 03/11/2026: adeguamento tecnico IN CORSO. Nessuna certificazione di conformità.**
Questa è documentazione tecnica e operativa, **non sostituisce** l'esame delle informative e dei
contratti da parte di un professionista privacy/fiscale. Il lancio con dati reali è soggetto
a verifica e approvazione del **titolare del trattamento**, il coach.

## 1. Ruoli e responsabilità

- **Titolare del trattamento:** il professionista che offre le lezioni (dati, decisioni su
  finalità e basi giuridiche, informative, diritti, conservazione).
  Dati fiscali, indirizzo, ragione sociale e contatto privacy da ottenere e approvare.
- **Sviluppatore/manutentore:** valutare l'eventuale nomina a responsabile del trattamento
  ex art. 28 GDPR quando tratta dati reali per conto del titolare. Limitare privilegi, accessi,
  durata dell'incarico e obblighi di riservatezza; vietato riutilizzare dati del cliente.
- **Fornitori:** Supabase, Cloudflare, Stripe, Resend e, solo se attivato, Google OAuth.
  Verificare ruolo giuridico di ciascuno per le specifiche attività, termini, DPA, subfornitori,
  localizzazione, basi per trasferimenti e misure di sicurezza. Non attribuire automaticamente
  a tutti lo stesso ruolo di "responsabile".

## 2. Mappa dei dati della piattaforma

| Dato | Provenienza / funzione | Protezione / rischio |
| --- | --- | --- |
| Nome, email, telefono opzionale | Registrazione e assistenza | Auth Supabase, RLS profili; email transazionali |
| Iscrizione Virgin Active (dichiarata) | Condizione di prenotabilità | Dato nel profilo, non prova documentale |
| Sede, orari, lezioni, disciplina, preferenze | Gestione di appuntamenti | Bookings/RLS; minimizzare testo libero |
| Codice promo, source QR e referral | Attribuzione e sconti | Non attivare profilazione o marketing senza specifica verifica |
| Importi, stato, Stripe Session/PaymentIntent ID | Pagamenti e contabilità operativa | Carta trattata da Stripe; non registrare PAN/CVV |
| Pacchetti, crediti e notifiche | Esecuzione servizio | Limitare dati e retention al necessario |
| Push endpoint e chiavi cifratura web push | Notifiche facoltative | Permesso esplicito browser, revoca/rimozione endpoint |
| Sessioni Auth, log di rete e diagnostica | Sicurezza, login e prevenzione abusi | Limiti accessi, durata e informative |
| Schede PDF/JPG/PNG, possibili dati sanitari | Upload **DISATTIVATO** dalla prima release | Migrazione RLS rimuove policy upload; valutare art. 9 prima di riattivare |

I campi liberi possono ricevere involontariamente informazioni sulla salute: inserire in UI avvisi
di minimizzazione e valutare un controllo umano delle richieste; **un semplice avviso non impedisce**
che un utente invii dati sanitari di propria iniziativa.

## 3. Base giuridica, informative e termini

- Il trattamento necessario a registrazione, prenotazione ed esecuzione del servizio può
  fondarsi sull'**art. 6(1)(b) GDPR**; obblighi fiscali sull'**art. 6(1)(c)**; eventuale
  sicurezza/antifrode sul **legittimo interesse**, previa valutazione appropriata.
- La **presa visione dell'informativa** è distinta dal **consenso**: non si deve chiedere un
  consenso obbligatorio al marketing per offrire il servizio, né raccogliere consensi fittizi.
- Il trattamento di dati sulla salute richiede analisi specifica, una condizione dell'art. 9
  oltre a quella dell'art. 6 e misure adeguate. Nella prima release non si ricevono schede online.
- Nessun invio di marketing diretto automatico è attivo per default. Le push transazionali
  non autorizzano push promozionali.
- L'informativa (art. 13 GDPR) deve essere **accessibile PRIMA della raccolta** e descrivere:
  identità/contatti titolare, finalità/basi, dati, destinatari, trasferimenti, tempi o criteri
  di conservazione, diritti, reclami al Garante, necessità conferimento e conseguenze,
  eventuale profilazione e DPO se previsto.
- Per i contratti a distanza vanno verificati anche obblighi precontrattuali, informazioni
  del professionista, politiche di recesso e rimborsi, fiscalità e Codice del Consumo.
  **Non presumere automaticamente** che le lezioni siano escluse dal diritto di recesso.

**Stato codice:** `/privacy`, `/termini` e `/cookie` esistono come **BOZZE**;
il sito blocca dal frontend le nuove registrazioni/prenotazioni commerciali se
`VITE_LEGAL_APPROVED` è diverso da `true` o mancano i dati obbligatori.
La protezione frontend **non sostituisce** RLS o il controllo degli endpoint.
Non rendere `VITE_LEGAL_APPROVED=true` senza documenti finalizzati e verificati.

## 4. Gate tecnico di pubblicazione

Configurare su **Cloudflare Pages** le sole variabili PUBBLICHE indicate in `.env.example`.
Dopo il controllo del consulente, completare `src/LegalPage.tsx`: niente placeholder
`[DA COMPILARE]`; inserire periodi/criteri di conservazione effettivamente concordati
ed eventuali obblighi normativi applicabili.

Configurazione:
- `VITE_PUBLIC_SITE_URL=https://dominio.tld`
- `VITE_LEGAL_CONTROLLER_NAME` e `VITE_LEGAL_CONTROLLER_ADDRESS`
- `VITE_LEGAL_CONTACT_EMAIL=privacy@dominio.tld` (casella raggiungibile e monitorata)
- `VITE_LEGAL_TAX_ID` (identificativo fiscale/corrispondente secondo il caso reale)
- `VITE_LEGAL_POLICY_VERSION` (es. data revisione)
- `VITE_LEGAL_APPROVED=true` **solo dopo l'approvazione**
- `VITE_SUPABASE_URL` HTTPS cloud e `VITE_SUPABASE_PUBLISHABLE_KEY`

**Comando di build per Cloudflare Pages:** `npm run pages:build`.
In modalita `PAGES_RELEASE_MODE=prelaunch` mantiene `X-Robots-Tag: noindex` su tutti gli host.
In modalita `PAGES_RELEASE_MODE=live` applica i controlli `release:check` su ambiente e testi legali,
verifica il dominio `alecoach.online`, il QA disattivato e le funzioni extra V1 disabilitate.
In entrambi i casi costruisce gli asset e verifica SPA/PWA e gli header Cloudflare.
Durante lo sviluppo usare `npm run build` normalmente.

L'enforcement nel browser è difesa aggiuntiva e non una garanzia legale: prima di attivare
le API del cloud, completare informativa, RLS, contratto e test anche lato server.

## 5. Diritti degli interessati

- L'utente può richiedere **accesso, rettifica, cancellazione (quando spettante),
  limitazione, portabilità e opposizione**; il titolare verifica la richiesta e risponde
  normalmente entro **un mese**, con eventuale proroga motivata nei casi previsti.
- L'area personale espone **Esporta i miei dati (JSON)** dai principali record accessibili
  via RLS. È una copia parziale e **non chiude da sola** una richiesta art. 15:
  possono esistere altri sistemi, log, transazioni Stripe, email e backup.
- La richiesta di cancellazione/altre istanze passa tramite l'email privacy del dominio;
  il titolare verifica l'identità con modalità proporzionate, registra la richiesta
  senza diffondere dati e decide cosa cancellare, anonimizzare o conservare per obblighi legali.
- **Non effettuare cancellazioni automatiche indiscriminate** di fatture, pagamenti o record
  sottoposti a obblighi di conservazione. Preparare una procedura documentata e test di restore.
- Sottoscrizioni push, oggetti Storage storici e dati in sistemi terzi vanno compresi nella
  valutazione dei diritti. Quando è ricevuta una richiesta, mappare ogni fornitore coinvolto.

## 6. Conservazione e gestione di incidenti

Prima del go-live scegliere e documentare **criteri o periodi** per: account inattivi,
prenotazioni, dati economici, notifiche, log, documenti pregressi e push endpoint.
Configurare un job periodico di minimizzazione/cancellazione soltanto dopo aver approvato
i criteri ed escluso record soggetti a obblighi di conservazione.

- Backup SQL **cifrato fuori Supabase**, con custodia sicura, controllo accessi e test di restore.
  I file Storage richiedono backup separato. Supabase Free non include backup automatici giornalieri.
- Procedure per incidenti: revoca credenziali, isolamento, investigazione, log e valutazione
  di eventuale notifica al Garante entro **72 ore** nei casi previsti dall'art. 33,
  oltre alla comunicazione agli interessati quando richiesta dall'art. 34.
- Limitare accesso ai log, evitare IP e dati sanitari nel debug; non mettere chiavi private
  in GitHub, nella build Vite, negli screenshot o nei video-guide.

## 7. Cookie, font e tracciamento

**Situazione iniziale:** nessun Meta Pixel o analytics pubblicitario nel codice; sono presenti
sessioni e memorie tecniche. L'app carica Google Fonts da domini esterni nella versione
iniziale: valutare **self-hosting dei font** o attivazione di Cloudflare Fonts verificando
che non vi siano fallback a Google.

La normativa italiana non impone un banner cookie quando ci sono soltanto cookie o strumenti
strettamente tecnici, ma richiede l'informativa. Per strumenti non tecnici deve essere
implementato un sistema di consenso granulare e revocabile, con **blocco preventivo**
e registrazione delle scelte. Eseguire controllo tecnico reale di cookie, LocalStorage,
script, richieste HTTP e log dei servizi terzi prima della firma del GO.

## 8. DPA, subfornitori, dati extra SEE

- Supabase: scegliere una **regione specifica UE** (ad esempio `eu-central-1`,
  `eu-west-1`) e non presumere che "Europe" assicuri il solo territorio UE;
  verificare Edge Functions, backup, log e sub-responsabili.
- Cloudflare Pages: valutare termini privacy, DPA e località dei trattamenti
  per i servizi utilizzati, inclusi eventuali log CDN.
- Stripe: stabilire ruoli e documenti contrattuali, account del coach, retention e
  meccanismi applicabili ai trasferimenti.
- Resend SMTP: verificare DPA, subfornitori e durata di log/email, utilizzo
  esclusivamente transazionale; non inserire dati sanitari nelle email.
- Se Google OAuth viene attivato, aggiornare informative/registro e verificare
  le regole del provider. Altrimenti mantenere il pulsante disabilitato.
- Lo sviluppatore non deve aprire un proprio account personale per trattare i dati
  produttivi del cliente senza un incarico e un perimetro di accesso formalizzati.

## 9. Verifiche finali per il GO

- [ ] Informativa, termini, cookie e dati titolare completi e approvati (nessun placeholder).
- [ ] `npm run release:build` supera il gate con variabili Cloudflare di produzione.
- [ ] Privacy visibile prima del form; presa visione distinta da consenso marketing.
- [ ] Due clienti reali di test: nessun accesso incrociato ai dati; permessi RLS verificati.
- [ ] Upload di documenti sanitari negato anche via API Storage.
- [ ] Esercizio diritti: export, contatto privacy, richiesta cancellazione ed eccezioni documentate.
- [ ] Cookie/script/font verificati su dominio HTTPS, senza tracker non autorizzati.
- [ ] DPA e condizioni fornitori verificati e archiviati; trasferimenti internazionali valutati.
- [ ] Backup, recupero e risposta a incidente testati; retention decisa.
- [ ] Utenti minorenni, foto o dati sanitari: se il servizio li prevede, analisi specifica
  **prima** di abilitarli, non dopo.
- [ ] Consulente privacy/fiscale e titolare del trattamento hanno approvato i testi.
- [ ] Servizio pagamenti ha superato anche i gate Stripe e sicurezza separati.

## Fonti ufficiali

- GDPR (Regolamento UE 2016/679): https://eur-lex.europa.eu/eli/reg/2016/679/oj
- Garante, cookie: https://www.garanteprivacy.it/faq/cookie
- Garante, diritti: https://www.garanteprivacy.it/Regolamentoue/diritti-degli-interessati
- Garante, principi e consenso: https://garanteprivacy.it/web/guest/home/principi-fondamentali-del-trattamento
- Supabase GDPR: https://supabase.com/docs/guides/security/gdpr-compliance
- Supabase DPA: https://supabase.com/legal/customer-resources/data-processing-addendum
- Resend DPA: https://resend.com/legal/dpa
- Cloudflare custom HTTP headers: https://developers.cloudflare.com/pages/configuration/headers/
