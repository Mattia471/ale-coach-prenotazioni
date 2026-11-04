# Ale Coach · Esercizio sul solo ambiente cloud

**Stato:** 4 novembre 2026. L'unico backend è **Supabase Ale Coach** nella regione `eu-west-1`.
Il frontend online è su **Vercel personale**: https://ale-coach-prenotazioni.vercel.app.
Al passaggio a Cloudflare Pages cambierà soltanto l'hosting del frontend.
**Non esistono più stack Docker, account di prova generati o dati fittizi nel frontend.**

## Accesso controllato durante il collaudo cloud

Il sito è visibile, ma **solo gli indirizzi approvati lato database possono registrarsi**.
La restrizione è nel trigger `private.on_signup()` e nella tabella privata
`private.prelaunch_allowed_emails`. L'unico indirizzo inizialmente abilitato è
`info@alecoach.online`. Il flag pubblico `VITE_PRELAUNCH_QA=true` informa gli utenti
che è un collaudo e permette alla UI di aprire la registrazione, **ma non concede accessi**:
senza record nella allowlist, la transazione Auth viene rifiutata dal server.

Le informative `/privacy`, `/termini` e `/cookie` sono ancora bozze. Usare soltanto
account autorizzati e dati minimi; non inserire dati sanitari o di terzi.
Non accettare pagamenti live prima del completamento dell'adeguamento GDPR
e dei controlli Stripe/Google.

Per aggiungere un collaudatore, un amministratore autorizzato può eseguire dal SQL Editor:
```sql
insert into private.prelaunch_allowed_emails(email)
values (lower('indirizzo-del-collaudatore@example.com'))
on conflict (email) do nothing;
```
Questo comando va eseguito solo per indirizzi effettivamente autorizzati a partecipare
al collaudo, non per liste marketing.

## Configurazione Auth: Dashboard Supabase del cliente

Aprire **Supabase Dashboard → progetto Ale Coach → Authentication → URL Configuration**.

- **Site URL:** `https://ale-coach-prenotazioni.vercel.app`
- **Redirect URLs:** `https://ale-coach-prenotazioni.vercel.app/**`
- Per il futuro inserire anche `https://alecoach.online/**` e
  `https://www.alecoach.online/**` (non cambiare ancora la Site URL).
- Conferma email: **attiva**, come verificato dalla API Auth.
- Google login: **non attivato** finché OAuth client, redirect e privacy sono configurati.
- Verificare l'invio delle email di conferma. Il fatto che esista
  `info@alecoach.online` non configura automaticamente lo SMTP di Supabase;
  per uso reale servirà un mittente del dominio autenticato (SPF/DKIM/DMARC
  secondo provider) e un servizio SMTP transazionale configurato nella Dashboard.

Il file `supabase/config.toml` documenta la destinazione del progetto, **non cambia
automaticamente la configurazione Auth del progetto cloud**.

## Primo accesso e abilitazione del coach

1. Da Vercel aprire **Crea un account**, usando `info@alecoach.online`
   soltanto se la casella è sotto il controllo del titolare.
2. Compilare nome e password privata, leggere le informative e confermare
   il link ricevuto per email. **Non condividere la password nella chat**.
3. L'account nasce sempre con ruolo `client`. Solo dopo che il titolare
   ha verificato a chi appartiene l'account e la conferma email, un amministratore
   del database può assegnare `coach` con un aggiornamento mirato per UUID.
4. Per esercitare il percorso cliente, autorizzare un secondo indirizzo
   nella allowlist, registrarlo e confermarlo. Utilizzare dati minimi.

Verifica prima della promozione, da SQL Editor:
```sql
select u.id, u.email, u.email_confirmed_at, p.role
from auth.users u
join public.profiles p on p.id=u.id
where lower(u.email)=lower('info@alecoach.online');
```
La promozione deve essere eseguita **solo dopo conferma dell'identità del vero coach**.

## Stato dei processi principali

| Funzionalità | Stato |
| --- | --- |
| Catalogo, sedi e orari su Supabase | API reali verificate |
| Autenticazione email/password | Auth pronto, conferma email attiva; SMTP e redirect da controllare |
| Account coach | **Non ancora assegnato**: nessun utente è stato creato automaticamente |
| Nuove prenotazioni | RPC live e anti-overbooking su DB, test E2E multiutente da eseguire |
| Promozione `ALECOACH15` | Verifica server; test su account cliente necessario |
| Google Calendar | Edge Function online, **OAuth e cron di sync non configurati** |
| Conferme coach | Bloccate se la sincronizzazione Google non è recente, per evitare overbooking |
| Stripe | Edge Functions online, **chiavi e preautorizzazione v2 non pronti** |
| Push e email transazionali | Predisposte, servizi esterni non ancora collegati |
| GDPR | Informative non finali; accesso ristretto, nessun uso commerciale |
| Cron scadenza prenotazioni | Configurato lato database; verificare periodicamente job e log |

## Controllo cloud non distruttivo

Con variabili **PUBBLICHE** nell'ambiente della shell:
```bash
VITE_SUPABASE_URL=https://mmtnzjdvvlouiwgrydlf.supabase.co \
VITE_SUPABASE_PUBLISHABLE_KEY="<chiave pubblica del progetto>" \
npm run cloud:check
```
`cloud:check` controlla catalogo, prezzi, sedi, visibilità anonima e Auth.
È **sola lettura**: non crea utenti, prenotazioni o pagamenti.
`npm test` e `npm run build` restano test locali del codice, non ambienti
di database. Le prove multiutente richiedono account autenticati veri.

## Passaggio futuro a Cloudflare Pages

1. Configurare repository, `npm run release:build` e output `dist`.
2. Impostare le variabili `VITE_SUPABASE_*` pubbliche nello stesso modo;
   le credenziali privilegiate rimangono solo su Supabase.
3. Completare informative e togliere `VITE_PRELAUNCH_QA` con approvazione formale.
4. Abilitare i redirect di Auth, HTTPS `alecoach.online`, OAuth e la mail.
5. Eseguire GO/NO-GO GDPR, sicurezza, calendari e pagamenti prima del traffico reale.

Documenti correlati: [V2-DELTA.md](V2-DELTA.md),
[TEST-PLAN.md](TEST-PLAN.md), [GDPR-COMPLIANCE.md](GDPR-COMPLIANCE.md).
