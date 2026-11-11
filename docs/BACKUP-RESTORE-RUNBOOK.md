# ALE COACH V1 | Backup cifrato e prova di ripristino

**Stato 11/11/2026:** il progetto Supabase Ale Coach usa l'organizzazione Free e PostgreSQL 17. I backup gestiti quotidiani **non sono inclusi** in questo piano. Questa procedura è pronta nel codice ma **non certifica un backup reale** finché un operatore non la esegue e non prova il ripristino su ambiente separato.

Documentazione ufficiale: [Backup Supabase](https://supabase.com/docs/guides/platform/backups) e [FAQ Free Plan](https://supabase.com/kb/faqs/platform/free-plan-backups).

## Strategia V1

1. **Dump PostgreSQL in formato custom cifrato con age**, senza passare dal disco in chiaro, prodotto fuori dal repository tramite scripts/backup-cloud-encrypted.sh.
2. Copie offsite a accesso limitato, versionate; frequenza, retention, RPO/RTO e custodia chiavi concordate con il cliente.
3. **Supabase Storage separato**: pg_dump salva metadati e tabelle, NON i file binari nei bucket. Esportare e cifrare i file a parte, se presenti.
4. **Ripristino completo su Supabase di prova**, senza mai sovrascrivere il progetto attivo. Validare Auth, tabelle, trigger, RPC, Storage, RLS, crons e servizi esterni disabilitati prima di considerarlo test riuscito.
5. Registrare data, luogo cifrato, verifica, tempo di recupero e responsabilità. Non caricare database, archivi o credenziali su GitHub o in chat.

## Preparazione lato operatore autorizzato

Installare client PostgreSQL **17** (server attuale PG 17), age, Node.js e Bash. Generare una coppia di chiavi age localmente e custodire quella privata separatamente dall'archivio. Configurare una sezione privata **[alecoach]** in ~/.pg_service.conf con host, port, dbname, user, SSL secondo la Dashboard Supabase. Usare il collegamento diretto o il pooler in modalità session, non transaction. La password deve stare esclusivamente in un file privato con permessi 0600, referenziato da PGPASSFILE, non negli argomenti del processo.

Esempio da eseguire nella root della repo, **sostituendo i percorsi con quelli privati del titolare**:

~~~bash
export PGSERVICE=alecoach
export PGPASSFILE=/percorso/privato/.pgpass
export AGE_RECIPIENT=age1CHIAVE_PUBBLICA_DEL_TITOLARE
export BACKUP_DIR=/percorso/esterno/backup-cifrati
bash scripts/backup-cloud-encrypted.sh
~~~

La procedura non accetta destinazioni dentro il repository. Conserva soltanto file .dump.age cifrati e fallisce se il backup non riesce, se mancano strumenti/variabili o se l'output esiste già.

## Verifica completa dello stream, senza file temporanei in chiaro

~~~bash
export AGE_IDENTITY_FILE=/percorso/privato/age-identity
bash scripts/verify-encrypted-backup.sh /percorso/backup/ale-coach-DATA.dump.age
~~~

La verifica autentica l'intero stream con age e verifica la firma **PGDMP** del formato custom, calcolando un SHA-256 in memoria. **Non equivale a un restore riuscito**.

## Restore drill P0, soltanto su database di prova

1. Preparare un progetto Supabase **isolato**, con PostgreSQL e estensioni compatibili, senza webhook Stripe live, email inviate o servizi esterni attivi.
2. Configurare una connessione distinta **[alecoach_restore]**. Verificare la destinazione prima di ogni comando, senza usare la connessione commerciale [alecoach].
3. Un amministratore autorizzato può decrittare in streaming con age verso pg_restore. Il dump logico di schemi gestiti Supabase può richiedere privilegi o ripristino specifico; **non lanciare automaticamente DROP o --clean**.
4. Verificare numero delle prenotazioni, wallet, account Auth, RLS, calendari, cron, Storage e ripristino di un flusso prenotazione in Sandbox. Registrare il risultato.
5. Solo dopo backup reale, copia offsite e ripristino riuscito segnare il gate come completato.

**Limiti:** non è stato ancora eseguito il backup dei dati commerciali, né un ripristino completo. Free può non garantire l'RPO necessario al cliente; valutare Supabase Pro con backup gestiti, o backup offsite automatici correttamente supervisionati. Le chiavi private devono rimanere in custodia del titolare.
