# Tracciabilità requisiti

Fonte: `Ale_Coach_Prenotazioni_Documento_Funzionale_Logico_Design.pdf` (3 novembre 2026, 18 pagine) e successive correzioni del committente.

| Specifica | Stato nel codice | Note |
| --- | --- | --- |
| Aree cliente e coach separate | Implementato | Ruolo protetto da RLS; nessun selettore pubblico in produzione |
| Colloquio conoscitivo 15 min gratis | Implementato | Richiede approvazione |
| Singola 60m 50 €, coppia 60m 80 € | Implementato | Discipline e nome partner |
| Check scheda 30m 30 € | Implementato | Bucket Storage privato per PDF/JPG/PNG |
| Avvio programmazione 45m 45 € | Implementato parzialmente | Informazioni sanitarie omesse finché manca privacy specifica |
| Altro su preventivo | Implementato | Coach stabilisce importo, Stripe dopo accettazione |
| Virgin Active, sedi Talenti e Nuovo Salario | Implementato | Blocca prenotazione se non iscritto |
| Orari lun–ven 9–14, sab 9–13 | Implementato | Modificabili dal coach, dom chiuso |
| Giorni 7 da domani | Implementato | RPC orari reali, nessun slot fittizio |
| Approvazione coach entro 24 h | Implementato | Richiede job cron in Supabase |
| Pagamento approvato dopo conferma | Implementato come checkout successivo | Ultima decisione concordata: online dopo approvazione, non pre-autorizzazione anticipata |
| Pagamento in presenza solo su permesso coach | Implementato | Default disabilitato per tutti |
| Disdetta almeno 24 h, rimborso online | Implementato con function Str���q�^