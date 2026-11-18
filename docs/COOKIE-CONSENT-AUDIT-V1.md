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
