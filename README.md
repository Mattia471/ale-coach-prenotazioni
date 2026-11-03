# Ale Coach Prenotazioni

Web app **mobile first** per Alessandro Cola, personal trainer a **Roma Talenti** e **Nuovo Salario**. Due aree separate: **cliente** e **coach**, con permessi verificati nel database.

> **Stato del rilascio:** interfaccia e logica realizzate; fino al collegamento di un progetto Supabase dedicato il deploy Ã¨ una **anteprima interattiva**, con dati locali e due account demo. Nessun pagamento reale e nessuna push automatica vengono dichiarati completati senza chiavi e servizi configurati.

## Stack

- React 19, TypeScript, Vite 7, Tailwind CSS 4 e CSS custom per il brand Ale Coach
- Supabase: Auth, PostgreSQL/RLS, Storage privato, Realtime, Edge Functions
- Stripe Checkout: pagamento dopo l'approvazione, webhook firmati, rimborsi, pacchetti una tantum
- Web Push + PWA: service worker, push subscription con VAPID, trigger dal database
- Hosting statico Vercel (oppure Cloudflare Pages per produzione commerciale con piano gratuito compatibile)

## FunzionalitÃ  implementate

| Area | Flusso |
| --- | --- |
| Pubblica | Servizi, prezzi, pacchetti, sedi, promo `ALECOACH10`, entrata da link bio/DM/Meta/QR/referral |
| Auth | Registrazione e login email/password; Google OAuth opzionale. Il coach viene autorizzato solo dal database |
| Cliente | Prenotazione a passi, controllo iscrizione Virgin Active, orari realmente liberi, conferma, stato, disdetta e notifiche interne |
| Coach | Richieste da approvare/rifiutare, preventivi, agenda, segna incasso in pales¶»§q«^