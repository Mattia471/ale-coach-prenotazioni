# ALE COACH V1 | Supabase Auth, SMTP e redirect per Cloudflare

**Stato 12/11/2026: DA VERIFICARE CON L'ACCOUNT DEL TITOLARE.** La logica di recupero password esiste nell'app, ma non si può dichiarare che le email siano recapitate senza un messaggio ricevuto e senza accesso alla configurazione SMTP. Non attivare la registrazione commerciale prima dell'approvazione legale.

## 1. Preparare la casella e il provider SMTP

- Il titolare conferma che `info@alecoach.online` può inviare e ricevere email, e identifica il **provider SMTP effettivo**. Non presumere che il provider della casella coincida con il DNS/hosting.
- Nel provider email, verificare mittente/dominio e registrare SPF, DKIM e DMARC secondo **i valori forniti dal provider**. Non copiare record inventati e non pubblicare due record SPF distinti per lo stesso host.
- Supabase Dashboard del progetto Ale Coach → **Authentication → SMTP Settings**: configurare SMTP dedicato con host, porta, utente, password/token e mittente verificato. I segreti restano nella Dashboard, non in GitHub, chat, frontend o ticket.
- Se si usa un provider transazionale, verificare anche le limitazioni di sandbox, le restrizioni sui destinatari e la reputazione del dominio. Supabase Free e SMTP predefinito non sostituiscono un servizio di consegna verificato.

## 2. Configurare URL senza anticipare il GO

In Supabase Dashboard → **Authentication → URL Configuration**:

| Campo | Durante QA protetta | Al GO commerciale |
| --- | --- | --- |
| Site URL | Conservare il valore esistente finché il passaggio non è approvato | `https://alecoach.online` |
| Redirect URLs | Consentire URL esatti necessari a QA, Vercel e Cloudflare, inclusi `https://ale-coach-qa-sandbox.pages.dev/**`, `https://ale-coach-prenotazioni.pages.dev/**`, `https://alecoach.online/**`, `https://www.alecoach.online/**` | Rimuovere gradualmente gli host tecnici non più necessari; mantenere i soli redirect autorizzati |

Il frontend usa `supabase.auth.resetPasswordForEmail(email,{redirectTo: location.origin + '/'})` e `signUp(...,{emailRedirectTo: location.origin + '/'})`. Pertanto l'origine della pagina di partenza **deve** essere consentita nell'allowlist Auth. Non serve modificare il codice per ogni host; verificare però la configurazione effettiva di Supabase.

**Importante:** l'allowlist Auth è distinta da `ADDITIONAL_APP_ORIGINS` per il CORS delle Edge Functions. Configurare entrambe separatamente, senza wildcard CORS.

## 3. Prova controllata di consegna

1. Accedere all'ambiente QA protetto e aprire il recupero password usando **solo un account di prova autorizzato**. Non creare account reali o modificare password di clienti.
2. Controllare che il messaggio arrivi realmente, compresa la cartella spam, e che il link punti all'origine QA corretta; non condividere token/link di recupero.
3. Aprire il link, impostare una password nuova dell'account di prova, uscire e rientrare. Verificare anche il login coach e cliente con i rispettivi permessi.
4. Controllare errori di recapito nel provider e nei log Auth senza riportare email personali o token nei ticket.
5. Ripetere il test sul dominio definitivo **solo dopo** DNS/HTTPS e allowlist confermati.

**Accettazione:** SMTP dedicato verificato; SPF/DKIM/DMARC coerenti; email di recupero ricevuta; link corretto; password cambiata; login riuscito; nessun token divulgato.

## 4. Blocco e rollback

Se la consegna fallisce, **non** impostare `PAGES_RELEASE_MODE=live`, `VITE_LEGAL_APPROVED=true` o Stripe Live. Conservare il precedente `Site URL` e ripristinare il provider SMTP precedente soltanto dopo verifica del titolare. Nessuna modifica a wallet, prenotazioni o pagamenti è necessaria.

Collegamenti: [Checklist V1](V1-FINAL-HANDOFF-CHECKLIST.md), [Cloudflare](CLOUDFLARE-PAGES-HANDOFF.md), [Supabase Auth](https://supabase.com/docs/guides/auth/auth-smtp).
