# Ale Coach | PWA e notifiche push

## Stato: cloud QA, 4 novembre 2026

- PWA: manifest `display:standalone`, `id:/`, `scope:/`, service worker `/sw.js`.
- UX: banner non bloccante all'apertura dell'app per l'account autenticato,
  con azione esplicita **ATTIVA NOTIFICHE**, dismiss per la sessione e nessuna
  ripetizione quando la sottoscrizione di questo dispositivo risulta registrata.
- iOS: le notifiche Web Push richiedono iOS/iPadOS 16.4+, installazione della
  web app nella schermata Home e un tap dell'utente; il banner spiega il percorso.
- Input mobile minimo 16px: elimina lo zoom iOS automatico sul focus; viewport
  bloccato per prevenire pinch/double-tap indesiderati, come richiesto nel QA.
  **Nota accessibilità:** il blocco dello zoom manuale va riesaminato con il
  coach e testato con VoiceOver/ingrandimento di sistema prima della release.
- VAPID: chiave pubblica nel progetto Vercel (`VITE_VAPID_PUBLIC_KEY`);
  chiavi private e segreto webhook cifrati in Supabase Vault, mai nel repository.
- Alla sottoscrizione client, l'endpoint e le chiavi del dispositivo sono
  memorizzati in `public.push_subscriptions` con RLS per proprietario.
- Ogni insert in `public.notifications` emette, dopo commit, un webhook
  autenticato tramite `pg_net` verso la Edge Function `push-notify`.
  La Edge Function legge le chiavi da una RPC riservata al service_role,
  invia ai dispositivi dell'utente e rimuove le sottoscrizioni scadute.
- Un errore esterno alle push non impedisce la conferma della prenotazione.

## Test manuale su un dispositivo reale

1. Installa Ale Coach su iPhone da Safari → Condividi → Aggiungi alla schermata Home,
   oppure aprilo su Chrome/Android.
2. Accedi con uno degli account autorizzati del collaudo.
3. Verifica che il banner compaia all'avvio, senza apertura automatica del prompt.
4. Tocca **ATTIVA NOTIFICHE**, consenti il permesso e verifica che compaia
   "Notifiche push abilitate su questo dispositivo".
5. Riapri l'app: il banner non deve comparire quando la sottoscrizione e'
   ancora registrata.
6. Quando esiste un vero evento di prenotazione/notifica autorizzato,
   verifica la push a schermo bloccato e in background.
7. Nega il permesso su un secondo dispositivo: l'app non deve ripetere
   automaticamente il prompt di sistema, ma deve spiegare le impostazioni.
8. Testa rotazione, ingrandimento di sistema, zoom involontario degli input e
   layout responsive su iPhone e Android.

## Release gate

Una push end-to-end su dispositivo reale **non e' ancora stata collaudata**.
Fino al completamento, lo stato e' "implementato e distribuito per QA", non
"rilasciato". La convalida GDPR, il consenso alle notifiche e il testo
dell'informativa devono essere approvati dal titolare.
