# ALE COACH | Cookie e strumenti locali: verifica tecnica per il primo GO

**17 novembre 2026 | Audit del sorgente, non certificazione GDPR.**
La decisione attuale è **non mostrare un banner di consenso finché il sito utilizza soltanto
strumenti tecnici o comunque esenti da consenso**. La presenza di una tabella nell'informativa
Cookie non prova da sola che ogni strumento nel browser sia necessario. L'audit browser è un
controllo P0 indipendente prima del GO commerciale.

## Interventi verificati nel codice

- **Font locali**: le famiglie originali Barlow, Barlow Condensed (inclusi i pesi corsivi)
  e Caveat sono caricate da `/fonts/` dello stesso dominio Cloudflare Pages.
  Eliminati i tre `<link>` a `fonts.googleapis.com` / `fonts.gstatic.com` da `index.html`.
  Aggiunte le licenze SIL OFL 1.1 in ciascuna directory. Il CSS conserva **gli stessi nomi,
  stili e pesi** della UI Minimal Focus. La CSP *Report-Only* non autorizza più i CDN Google;
  ricordare che Report-Only è informativa, **non un blocco effettivo**.
- **Nessun SDK pubblicitario nel sorgente V1**: i test verificano assenza di Google Analytics,
  Tag Manager, Meta Pixel, Hotjar, Clarity, Segment e riferimenti al Google Fonts CDN nei
  file dell'app pubblica. Un cambio di libreria, CDN, Workers o configurazione esterna può
  introdurre nuovi strumenti: il controllo statico non vede tutto.
- **Persistenza identificata**: Supabase Auth conserva il token con storage del browser;
  `ale-push-prompt-dismissed-v2:<id>` conserva il momento in cui si è chiuso il prompt di
  notifiche. La registrazione Service Worker è legata a PWA e notifiche.
- **Servizi terzi condizionati**: Cloudflare può impostare `__cf_bm` per la sicurezza; Stripe
  Checkout ospitato da Stripe può impostare `__stripe_mid` e `__stripe_sid` a fini
  antifrode. La tabella dell'informativa mostra le durate indicative **ove presenti**.
- **Foto del coach**: il sito utilizza una fotografia esterna ospitata su
  `www.virginactive.it`, con richiesta al dominio del fornitore. Per limitarne i metadati,
  l'elemento immagine ora usa `referrerPolicy="no-referrer"`. La richiesta espone
  comunque al servizio remoto almeno i dati tecnici necessari alla connessione. La
  fotografia è già annotata nel codice come soggetta a conferma del diritto d'uso prima del GO.

## Verifica browser P0 da fare prima del GO

Effettuare la prova su desktop e mobile, preferibilmente in sessione pulita o in incognito,
**senza caricare dati veri dei clienti**:

1. Aprire `/cookie` e Home in modalità non autenticata. DevTools → Application → Cookies /
   Local Storage / Service Workers, e Network con `Preserve log`. Annotare per ogni cookie
   dominio, nome, finalità, `SameSite`, durata e momento di comparsa, e distinguere cookie
   della pagina da quelli di altri siti.
2. Aprire registrazione/login e una pagina cliente con un account QA. Controllare la
   persistenza Auth e il prompt notifiche, e verificare che nessun cookie pubblicitario
   compaia prima di un eventuale consenso.
3. Accedere a un checkout **Stripe Sandbox** con utente QA, verificare strumenti antifrode
   e ricevute solo nell'ambiente Sandbox. Distinguere chiaramente il dominio
   `checkout.stripe.com` e l'eventuale storage sul sito ALE COACH.
4. Nel pannello Network verificare che **nessuna richiesta esca verso Google Fonts**,
   e che CSS + file `/fonts/` siano serviti da `alecoach.online` con risposta 200,
   incluse le varianti corsive nei titoli e nel testo manoscritto.
5. Per l'immagine Virgin Active verificare eventuali cookie e richieste collaterali.
   Il titolare deve confermarne il diritto di utilizzo; ove possibile in futuro è
   preferibile una fotografia autorizzata ospitata sul proprio dominio.
6. Se appare un cookie di profilazione o un tracciamento non necessario, **non aprire
   il sito senza correggerlo**: disabilitare l'integrazione oppure implementare un consenso
   preventivo valido, che consenta accettazione, rifiuto e personalizzazione equivalenti,
   con blocco effettivo dei tracker prima del consenso.

## Esito e decisione banner

- **Audit codice:** niente SDK di marketing rilevati; Google Fonts CDN rimosso nel codice.
- **Audit runtime browser:** APERTO, non dichiarare completato finché non sono eseguiti
  i controlli sui domini e sui cookie realmente emessi da Cloudflare / Stripe / Virgin.
- **Banner oggi:** non introdotto perché gli strumenti dichiarati sono tecnici o esenti,
  **condizionatamente alla verifica runtime** e alla valutazione del titolare. Un banner
  fittizio «Accetta / Rifiuta» per strumenti non rifiutabili non è una soluzione.
- **Fonte normativa:** [FAQ Cookie del Garante](https://www.garanteprivacy.it/faq/cookie),
  inclusa la risposta sui siti con soli cookie tecnici.
- **Prossima verifica:** aggiornare il registro e la tabella Cookie soltanto se cambia
  l'insieme degli strumenti effettivi. L'approvazione del testo non sostituisce il test.

Nessuna modifica ai pagamenti Live, alle registrazioni pubbliche o ai record QA è richiesta
per questa attività.

## 18 novembre 2026 | Controllo pubblico automatico, senza dati personali

- `scripts/qa-cookie-runtime.mjs` verifica con sole richieste HTTPS **GET** le URL
  Home, Privacy, Termini, Cookie e Recesso; il JavaScript pubblicato deve includere
  la tabella cookie e il modulo tipo di recesso. Controlla inoltre il CSS, tre
  font locali rappresentativi e la presenza di URL verso font/tracker noti.
- Nei soli header delle risposte GET individua i **nomi** dei cookie, senza
  registrarne valori o identità. Rifiuta eventuali nomi tipici di profilazione
  come `_ga` e `_fbp`; i cookie di sicurezza come `__cf_bm` non provocano
  un falso allarme. Le prove sono ripetute ogni giorno e su richiesta per
  `pages.dev`, `alecoach.online` e `www.alecoach.online`, senza segreti
  o alcuna interazione con login, database o pagamenti.
- Il test usa anche fixture completamente isolate in `npm test`, per
  convalidare il blocco di tracker, redirect esterni e cookie marketing.
- **Limite importante:** una richiesta HTTP da Node non è un browser e non
  può accertare JavaScript storage o i cookie di terze parti nel checkout
  ospitato da Stripe. Restano necessari un controllo DevTools una tantum,
  la conferma del diritto d'uso della foto Virgin Active e l'eventuale
  valutazione giuridica della configurazione commerciale. Questo check
  automatizzato **non sostituisce** né una CMP quando necessaria né il
  consenso valido del titolare al GO.

## 20 novembre 2026 | Prima evidenza browser dai DevTools

Screenshot di un controllo manuale Chrome su `https://alecoach.online`, sezione Application > Cookies. **Non acquisire né riportare valori, token, ID o contenuti dello storage**; la schermata serve a identificare i soli nomi dei cookie e il relativo dominio.

- Tre cookie risultano nell'elenco: `ARRAffinitySameSite` (Session), `TiPMix`, `x-ms-routing-name`; la colonna **Domain** indica `.www.virginactive.it`, non `alecoach.online`. Hanno flag HttpOnly e Secure, SameSite=None. I nomi sono compatibili con l'infrastruttura tecnica Azure App Service (affinità e routing di slot), ma finalità e indispensabilità nel concreto devono essere confermate.
- Questo è coerente con il caricamento del ritratto del coach da `www.virginactive.it` già presente nel codice. `referrerPolicy=no-referrer` impedisce l'invio dell'URL della pagina come Referer ma **non** impedisce la connessione né gli eventuali Set-Cookie del fornitore.
- L'elenco laterale mostra anche un'origine `https://www.goog...` non ancora identificata. Non presumere che si tratti di analytics/tracciamento o del codice ALE COACH senza visionare nomi cookie, URL completo e rete di provenienza.
- Tra i **tre cookie visibili** non sono presenti nomi tipici di Google Analytics o Meta Pixel. Non è una certificazione dell'assenza di tracciamenti nel browser e **non chiude** l'audit né il gate Cookie/Legal.
- **Gap dell'informativa pubblicata:** la tabella `src/LegalPage.tsx` registra Supabase, ALE COACH, Cloudflare e Stripe, ma non esplicita ancora i tre cookie/il dominio Virgin Active osservati in browser. Prima del GO valutare con il titolare una descrizione puntuale del fornitore e un link alla sua informativa oppure eliminare il caricamento terzo sostituendo la foto con un'immagine di cui si abbia il diritto d'uso e servita dal dominio ALE COACH.
- **Controlli residui non distruttivi:** ispezionare l'origine Google visibile e soltanto i **nomi** delle chiavi in Local Storage; se possibile ricostruire con Network l'origine del Set-Cookie dell'immagine; verificare successivamente la sessione Auth di collaudo e il Checkout Stripe in Sandbox, mai denaro Live.
- **Banner:** la FAQ del Garante esenta i soli cookie strettamente tecnici dal consenso preventivo ma richiede un'informativa corretta e completa. Non aggiungere un banner fittizio; bloccare o richiedere consenso preventivo per eventuali strumenti non tecnici. Decisione finale rinviata a evidenza e verifica del titolare.

- **Follow-up Chrome (20/11/2026):** l'utente ha aperto l'origine Google visibile nel pannello Cookies e conferma che non contiene cookie. Questa osservazione chiude il controllo *dei cookie in tale voce*, non certifica l'assenza di richieste Network a Google o tracciamenti non basati su cookie. Rimangono aperti Local Storage (soli nomi delle chiavi), audit Network e checkout Stripe Sandbox.

- **Follow-up Local Storage anonimo (20/11/2026):** l'utente conferma che `Application > Local Storage > https://alecoach.online` è vuoto **prima di aver effettuato il login**. Risultato compatibile con una sessione anonima; non equivale a controllo dello storage dopo autenticazione. Necessario verificare soltanto le **chiavi**, non i valori, dopo accesso con account QA. Non acquisire token, refresh token o dati personali.

- **Follow-up Local Storage autenticato (20/11/2026):** screenshot Chrome `Application > Local Storage > https://alecoach.online` dopo login QA: è visibile esclusivamente il nome della chiave di sessione Supabase Auth (`sb-…-auth-token`). Il valore non è stato mostrato, acquisito né registrato. Risultato coerente con storage funzionale di autenticazione; non prova l'assenza di tracciamento su rete, sessionStorage o provider esterni. **Controllo del solo elenco chiavi Local Storage post-login: PASS**. Rimangono Network e Stripe Sandbox.

Riferimenti tecnici: Microsoft `https://learn.microsoft.com/it-it/power-pages/admin/cookies` (ARRAffinitySameSite), `https://learn.microsoft.com/en-us/azure/app-service/deploy-staging-slots` (x-ms-routing-name); FAQ Garante `https://www.garanteprivacy.it/faq/cookie`.
