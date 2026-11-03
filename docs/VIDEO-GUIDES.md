# Ale Coach: storyboard per 2 video-guide

**Destinazione:** due MP4 separati, da condividere privatamente al cliente dopo approvazione della UI e dei flussi. Gli script sono pronti; **il video non è ancora registrato**. Registrare a 1080p, audio italiano, sottotitoli leggibili, nascondendo password e dati reali. Fare clic sui pulsanti nel sito con account demo e Stripe test.

## Video 1: guida CLIENTE (circa 2 minuti)

| Tempo | Registrazione schermo | Voce narrante |
| --- | --- | --- |
| 00:00–00:12 | Home su smartphone, logo e servizi | "Benvenuto su Ale Coach. Da qui prenoti in pochi passaggi le tue lezioni." |
| 00:12–00:30 | Registrazione email/password o Google solo se attivo | "Crea il tuo profilo ed effettua l'accesso. Per prenotare devi essere iscritto a Virgin Active." |
| 00:30–00:55 | Selezione servizio, disciplina, sede, orario | "Scegli il servizio e la sede. L'agenda mostra soltanto gli orari prenotabili." |
| 00:55–01:15 | Codice ALECOACH10 e invio richiesta | "Se previsto, inserisci il codice promozionale e invia la richiesta al coach." |
| 01:15–01:37 | Stato richiesta, coach approva nell'account demo, cliente vede invito a pagare | "La richiesta resta in attesa dell'approvazione. Dopo la conferma del coach, completa il pagamento online in sicurezza con Stripe." |
| 01:37–01:55 | Appuntamenti e notifiche | "Controlla lo stato e le notifiche nella tua area personale. Disdette e rimborsi seguono le condizioni indicate." |
| 01:55–02:05 | Supporto e contatti | "Per dubbi o modifiche contatta Ale tramite i canali ufficiali." |

**Da non mostrare nel video:** carte vere, dati di altri clienti, password o indirizzi tecnici `localhost`; la procedura Google solo dopo configurazione reale, gli abbonamenti ricorrenti solo dopo effettiva attivazione.

## Video 2: guida COACH (circa 3 minuti)

| Tempo | Registrazione schermo | Voce narrante |
| --- | --- | --- |
| 00:00–00:15 | Login coach e dashboard | "Questa è la tua area riservata: richieste, appuntamenti e attività." |
| 00:15–00:45 | Richieste → approva o rifiuta | "Ogni prenotazione arriva in attesa. Puoi accettarla o rifiutarla: per i pagamenti online il cliente riceverà poi il checkout." |
| 00:45–01:05 | Agenda e scelta sedi | "In agenda vedi gli orari occupati. Il sistema impedisce che due clienti blocchino lo stesso orario." |
| 01:05–01:25 | Clienti e autorizzazione pagamento in palestra | "Il pagamento in presenza è disattivato per impostazione predefinita e si abilita per il singolo cliente." |
| 01:25–01:45 | Contrassegna incasso in palestra | "Dopo aver ricevuto davvero il pagamento, registralo dalla prenotazione." |
| 01:45–02:05 | Listino, servizi e orari | "Puoi aggiornare prezzi, servizi e disponibilità. Le modifiche al listino non devono alterare pagamenti già avviati." |
| 02:05–02:25 | Marketing: QR, link e codice | "Da Marketing trovi solo il QR da mostrare, il link e il codice promozionale da copiare." |
| 02:25–02:50 | Pagamenti online e pacchetti | "Stripe gestisce la carta; l'app conferma una lezione soltanto dopo il webhook di pagamento. I pacchetti assegnano crediti dopo l'incasso." |
| 02:50–03:10 | Cancellazioni, notifiche, supporto | "Controlla notifiche ed eventuali anomalie. Se un rimborso non è riconciliato, verifica Stripe prima di assicurare al cliente che è concluso." |

## Formato consigliato alla consegna

- `AleCoach_Guida_Cliente.mp4`, orientamento verticale 1080 × 1920 per WhatsApp e smartphone.
- `AleCoach_Guida_Coach.mp4`, orizzontale 1920 × 1080 per amministrazione desktop; includere anche una versione smartphone se il coach usa il telefono.
- Sottotitoli .srt in italiano, schermata iniziale e finale con logo, nessun dato reale in video.
- Rivedere script dopo il collaudo: non presentare come disponibili Google OAuth, abbonamenti, push o rimborsi se non sono stati realmente attivati e verificati.
