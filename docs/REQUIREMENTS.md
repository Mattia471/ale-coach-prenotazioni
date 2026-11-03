# Tracciabilità requisiti

Fonte: `Ale_Coach_Prenotazioni_Documento_Funzionale_Logico_Design.pdf` (3 novembre 2026, 18 pagine) e successive correzioni del committente.

| Specifica | Stato nel codice | Note |
| --- | --- | --- |
| Aree cliente e coach separate | Implementato | Ruolo protetto da RLS; nessun selettore pubblico in produzione |
| Colloquio conoscitivo 15 min gratis | Implementato | Richiede approvazione |
| Singola 60m 50 €, coppia 60m 80 € | Implementato | Discipline e nome partner |
| Check scheda 30m 30 € | Implementato senza upload | Upload PDF/JPG/PNG disabilitato nella prima release per minimizzazione dati sanitari; RLS Storage nega l'inserimento |
| Avvio programmazione 45m 45 € | Implementato parzialmente | Informazioni sanitarie omesse finché manca privacy specifica |
| Altro su preventivo | Implementato | Coach stabilisce importo, Stripe dopo accettazione |
| Virgin Active, sedi Talenti e Nuovo Salario | Implementato | Blocca prenotazione se non iscritto |
| Orari lun–ven 9–14, sab 9–13 | Implementato | Modificabili dal coach, dom chiuso |
| Giorni 7 da domani | Implementato | RPC orari reali, nessun slot fittizio |
| Approvazione coach entro 24 h | Implementato | Richiede job cron in Supabase |
| Pagamento approvato dopo conferma | Implementato come checkout successivo | Ultima decisione concordata: online dopo approvazione, non pre-autorizzazione anticipata |
| Pagamento in presenza solo su permesso coach | Implementato | Default disabilitato per tutti |
| Disdetta almeno 24 h, rimborso online | Implementato con function Stripe | Da collaudare con account Stripe test |
| Promozione prima lezione | Implementato | **ALECOACH10 10% entro 7 giorni**, prevale sulla vecchia tabella CORSI/ONLINE |
| Pacchetto 5/10, crediti con scadenza | Predisposto | Acquisto Stripe singolo e wallet attivato con webhook |
| Mensili 4/8 lezioni | Catalogo | Billing ricorrente da integrare con Price ID reali |
| Notifiche in-app | Implementato | DB + Realtime quando configurato |
| Push iOS/Android | Predisposto | Da configurare VAPID e Database Webhook |
| DM Instagram `FORZA` | Link tracciato | Automazione DM da connettere a Meta |
| Codice amico personalizzato | Link generico | Generazione/verifica referral personalizzati non ancora sviluppata |
| Instagram bio/Meta/QR palestra | Implementato | QR usa **ALECOACH10** |
| Login e password | Implementato | Supabase Auth (necessita progetto dedicato) |
| Google/Apple Calendar | Non implementato | Estensione futura dopo lancio |
| Informative privacy e termini validati | Bozze presenti, approvazione obbligatoria | `/privacy`, `/termini`, `/cookie`, `npm run release:build` e [GDPR-COMPLIANCE.md](GDPR-COMPLIANCE.md) |

## Decisione di prodotto

Il PDF documenta il comportamento della **demo originale**: dove indica CORSI 15%, VIRGIN o autorizzazione carta anticipata, si applicano le decisioni successive: **ALECOACH10 10%** e **Checkout solo dopo approvazione**. Non si fingono pagamenti senza Stripe.
