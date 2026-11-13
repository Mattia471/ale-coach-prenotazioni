import { legal, legalPaths, legalReady } from './legal';

type DocumentType = 'privacy' | 'termini' | 'cookie';

export default function LegalPage({kind}: {kind: DocumentType}) {
  const title = kind === 'privacy' ? 'Informativa privacy'
    : kind === 'termini' ? 'Condizioni di prenotazione e acquisto'
    : 'Informativa cookie e tecnologie locali';
  const controller=legal.controllerName;
  const address=legal.controllerAddress;
  const email=legal.contactEmail;
  const version=legal.version || 'Bozza V1 del 13 novembre 2026';

  return <div className="legal-site">
    <header className="legal-header"><a href="/" className="legal-logo">ALE COACH</a><a href="/">Torna all'app</a></header>
    <main className="legal-document">
      <span className="legal-eyebrow">TRASPARENZA &amp; TUTELA</span>
      <h1>{title}</h1>
      <p className="legal-updated">Versione: {version}</p>
      {!legalReady && <div className="legal-draft" role="alert">
        <strong>Informativa in verifica prima dell'apertura commerciale.</strong>
        <p>Il contenuto descrive la V1 attuale. Prima dell'avvio al pubblico il titolare deve verificare
          i trattamenti effettivi, i fornitori e i termini contrattuali e confermare la versione finale.</p>
      </div>}
      {kind === 'privacy' && <>
        <section><h2>1. Titolare del trattamento</h2>
          <p>Il titolare è {controller}, con sede/recapito in {address}, identificativo fiscale/P.IVA {legal.taxId}.
            Per informazioni e richieste sulla protezione dei dati: <a href={'mailto:'+email}>{email}</a>.</p>
        </section>
        <section><h2>2. Dati personali, finalità e conferimento</h2>
          <p>Per registrazione, accesso e gestione del servizio trattiamo i dati identificativi e di contatto
            forniti dall'utente, la dichiarazione di iscrizione alla palestra, le preferenze e richieste di allenamento,
            gli appuntamenti, la sede scelta, lo storico delle prenotazioni, delle disdette e delle comunicazioni di servizio.</p>
          <p>Per pacchetti e pagamenti trattiamo prezzi, crediti, stato degli ordini e delle autorizzazioni,
            identificativi delle transazioni e dati amministrativi necessari. Le informazioni complete della carta
            sono inserite nel checkout gestito da Stripe e non sono conservate dall'app Ale Coach.</p>
          <p>Per funzionamento e sicurezza possono essere trattati indirizzi IP, informazioni di accesso,
            dispositivi, eventi tecnici e registrazioni di errore. Le notifiche push sono facoltative e si attivano
            solo su richiesta dell'utente e con il permesso del dispositivo; possono richiedere un identificativo
            tecnico del browser. La provenienza di una richiesta (ad esempio QR code o collegamento) può essere
            registrata per la gestione operativa del servizio.</p>
          <p>I dati indispensabili per identificarsi, accedere, gestire l'appuntamento e concludere un acquisto
            sono necessari per il servizio richiesto: senza tali informazioni non è possibile completare le relative
            operazioni. I campi espressamente facoltativi e le notifiche push possono essere omessi.</p>
        </section>
        <section><h2>3. Basi giuridiche</h2>
          <p>La gestione dell'account, delle prenotazioni e dei pacchetti si fonda sull'esecuzione del contratto
            o di misure precontrattuali richieste dall'interessato (art. 6, par. 1, lett. b GDPR).
            Gli adempimenti contabili, fiscali e le richieste delle autorità si fondano sull'obbligo legale
            (art. 6, par. 1, lett. c GDPR). La protezione del servizio, il contrasto ad abusi e la tutela
            dei diritti possono fondarsi sul legittimo interesse del titolare, previo bilanciamento
            (art. 6, par. 1, lett. f GDPR). Le notifiche del browser richiedono inoltre l'autorizzazione
            tecnica dell'utente; gli eventuali trattamenti subordinati a consenso saranno attivati
            soltanto dopo un consenso valido e revocabile.</p>
          <p>La V1 non utilizza i dati per profilazione pubblicitaria né per comunicazioni promozionali
            automatiche. Non vengono adottate decisioni esclusivamente automatizzate che producano effetti
            giuridici o analogamente significativi ai sensi dell'art. 22 GDPR.</p>
        </section>
        <section><h2>4. Dati particolari e salute</h2>
          <p>Il sito non richiede referti, diagnosi, certificati o cartelle cliniche e non offre il caricamento
            di documentazione sanitaria. Non inserire dati sulla salute nei campi di testo libero:
            eventuali informazioni sanitarie comunicate spontaneamente non sono necessarie alla prenotazione.
            Un futuro trattamento di dati particolari richiederebbe presupposti e informative dedicati
            ai sensi dell'art. 9 GDPR.</p>
        </section>
        <section><h2>5. Destinatari e trasferimenti</h2>
          <p>I dati possono essere accessibili al titolare, ai soggetti autorizzati che collaborano alla
            gestione delle lezioni e, nei limiti necessari, ai fornitori tecnici: Cloudflare (hosting e sicurezza),
            Supabase (autenticazione e database), Stripe (pagamenti) e al provider di invio email effettivamente
            configurato per le comunicazioni transazionali. I fornitori operano nei ruoli previsti dai rispettivi
            accordi e informative; i dettagli aggiornati sono richiedibili a {email}.</p>
          <p>In caso di trattamenti o trasferimenti di dati fuori dallo Spazio economico europeo,
            il titolare verifica il meccanismo applicabile, per esempio decisioni di adeguatezza o
            clausole contrattuali tipo e garanzie supplementari quando necessarie.
            I dettagli sui trasferimenti effettivi e sulle garanzie possono essere richiesti
            al recapito sopra indicato. La regione europea del database non implica che tutti
            i fornitori trattino dati esclusivamente nell'UE.</p>
        </section>
        <section><h2>6. Criteri di conservazione</h2>
          <p>I dati del profilo e dell'account sono trattati finché il servizio è utilizzato.
            In caso di chiusura o richiesta di cancellazione, i dati non più necessari sono eliminati
            o resi anonimi compatibilmente con gli obblighi di conservazione e con eventuali contestazioni pendenti.
            Lo storico di prenotazioni, disdette, comunicazioni e utilizzo dei crediti è conservato per il tempo
            necessario all'esecuzione del servizio e, successivamente, nella misura necessaria a documentare
            obbligazioni, reclami ed eventuali diritti, secondo i termini di prescrizione applicabili.</p>
          <p>Documenti e dati che devono essere conservati per obblighi contabili o fiscali sono mantenuti
            per il periodo imposto dalla normativa pertinente, generalmente dieci anni per le scritture
            contabili soggette a tale obbligo, salvo maggiori termini di legge o contenziosi.
            Log di sicurezza, sessioni, notifiche e dati tecnici sono conservati per periodi limitati
            in funzione della finalità, delle impostazioni dei fornitori e delle necessità di indagine,
            senza essere destinati a conservazione indefinita. Copie di backup seguono i cicli
            di rotazione e sicurezza del servizio e gli obblighi eventualmente applicabili.</p>
          <p>La richiesta di chiusura o cancellazione può essere inviata a {email}: il titolare
            valuta le parti da eliminare e quelle da conservare per obbligo di legge o tutela di un diritto.
            L'informativa non implica che sia già attiva una cancellazione automatica allo scadere
            di ogni periodo.</p>
        </section>
        <section><h2>7. Diritti degli interessati e reclami</h2>
          <p>L'interessato può richiedere accesso, rettifica, cancellazione nei casi previsti,
            limitazione, portabilità ove applicabile e opposizione ai trattamenti basati su legittimo
            interesse; può revocare eventuali consensi senza pregiudicare i trattamenti già leciti.
            Le richieste possono essere inviate a <a href={'mailto:'+email}>{email}</a>.
            La risposta è fornita di regola entro un mese, salvo proroghe previste dall'art. 12 GDPR.
            Resta il diritto di proporre reclamo al
            <a href="https://www.garanteprivacy.it/" target="_blank" rel="noopener noreferrer"> Garante per la protezione dei dati personali</a>.</p>
          <p>L'area personale permette di esportare una copia dei principali dati visibili
            all'utente. Questo strumento non sostituisce l'esercizio completo dei diritti GDPR.</p>
        </section>
      </>}
      {kind === 'termini' && <>
        <section><h2>1. Fornitore e contatti</h2>
          <p>I servizi ALE COACH sono offerti da {controller}, {address}, P.IVA/identificativo fiscale
            {legal.taxId}. Per informazioni precontrattuali, prenotazioni, pagamenti, richieste e reclami
            è disponibile <a href={'mailto:'+email}>{email}</a>.
            Le caratteristiche e i prezzi dei servizi sono mostrati nell'app prima della conferma.</p>
        </section>
        <section><h2>2. Accesso e prenotazioni</h2>
          <p>Le lezioni in presenza presso Virgin Active Talenti e Nuovo Salario sono riservate
            alle persone che dispongono dell'accesso alla struttura. L'iscrizione alla palestra,
            quando richiesta, è distinta dal costo delle lezioni ALE COACH.
            Una richiesta inviata dall'app non costituisce conferma automatica:
            il coach deve accettarla. Disponibilità, orario, luogo, durata e prezzo
            sono quelli mostrati durante la prenotazione; l'app impedisce le sovrapposizioni
            degli slot gestiti dall'agenda interna.</p>
        </section>
        <section><h2>3. Prezzi, preautorizzazione e pagamenti</h2>
          <p>Prima della richiesta vengono indicati il servizio, il prezzo e gli eventuali sconti.
            Per le lezioni con pagamento online, il cliente inserisce la carta nel checkout Stripe
            e autorizza l'importo <strong>prima</strong> che la richiesta arrivi al coach.
            Questa operazione è una <strong>preautorizzazione</strong>: non è ancora un incasso.
            Se il coach approva entro i termini, l'importo autorizzato viene acquisito e
            la lezione è confermata. Se il coach rifiuta, la preautorizzazione viene annullata;
            i tempi di rilascio della somma eventualmente bloccata dipendono dall'emittente della carta.
            Se l'autorizzazione scade prima della decisione, la richiesta può scadere
            senza che venga effettuato un incasso.</p>
          <p>Il pagamento in presenza è disponibile solo ai clienti ai quali il coach
            ha abilitato questa modalità. I pacchetti Flex, invece, si acquistano con
            <strong> pagamento immediato</strong> tramite Stripe e danno diritto al numero
            di crediti indicato nell'offerta: un credito vale per una lezione individuale,
            nel rispetto della scadenza e degli orari disponibili. Prezzo, quantità
            di crediti e durata del pacchetto sono mostrati prima dell'acquisto.
            La V1 non attiva abbonamenti con rinnovo automatico.</p>
        </section>
        <section><h2>4. Disdette, crediti e rimborsi</h2>
          <p>La policy ordinaria della V1 consente di disdire autonomamente una lezione
            <strong> fino a 24 ore prima dell'inizio</strong>. In caso di lezione online
            già pagata e disdetta nei termini, viene avviato il rimborso sul metodo
            di pagamento originario; i tempi di riaccredito dipendono dal circuito
            e dall'istituto emittente. Se la lezione è stata prenotata con credito Flex,
            la disdetta nei termini riaccredita un credito nel relativo pacchetto,
            che rimane soggetto alla scadenza originaria.
            Prima dell'approvazione, una richiesta con carta soltanto preautorizzata
            può essere annullata con il rilascio dell'autorizzazione, senza un rimborso
            di somme non ancora incassate.</p>
          <p>Nelle ultime 24 ore il flusso ordinario di disdetta/rimborso automatico
            non è disponibile. Eventuali impedimenti, contestazioni, diritti
            inderogabili previsti dalla legge o richieste eccezionali possono essere
            sottoposti al titolare tramite {email}. Non è previsto nella V1
            un rimborso automatico del 50% nelle ultime 24 ore.</p>
        </section>
        <section><h2>5. Diritto di recesso</h2>
          <p>Restano salvi i diritti inderogabili del consumatore e, ove applicabile,
            il diritto di recesso previsto per i contratti conclusi a distanza,
            generalmente entro 14 giorni. L'eventuale eccezione relativa ai servizi
            connessi ad attività del tempo libero forniti in una data o in un periodo
            specifico opera soltanto quando ricorrono i presupposti di legge.
            L'acquisto di un pacchetto Flex privo di una data di esecuzione
            predeterminata va considerato distintamente dalla prenotazione
            di una singola lezione in calendario.</p>
          <p>Per comunicare il recesso o chiedere informazioni sui presupposti e
            sulle conseguenze economiche, il cliente può scrivere a {email}
            indicando l'acquisto o la prenotazione interessati. Per le prestazioni
            già iniziate su richiesta del consumatore possono applicarsi gli
            obblighi economici consentiti dalla legge. La policy di disdetta
            delle 24 ore non limita gli eventuali diritti di recesso spettanti per legge.</p>
        </section>
        <section><h2>6. Assistenza, reclami e controversie</h2>
          <p>Per problemi di accesso, esecuzione della lezione, addebiti, crediti
            o richieste di rimborso, scrivere a
            <a href={'mailto:'+email}> {email}</a> riportando, ove disponibile,
            il riferimento della prenotazione o dell'ordine. Il titolare esamina
            il reclamo e fornisce riscontro con tempi ragionevoli, compatibili
            con la complessità della richiesta. Per le controversie si applicano
            le norme inderogabili a tutela del consumatore, incluso l'eventuale
            foro del luogo di residenza o domicilio del consumatore quando
            previsto. Le condizioni non escludono gli altri rimedi di legge.</p>
        </section>
      </>}
      {kind === 'cookie' && <>
        <section><h2>1. Tecnologie tecniche e strettamente necessarie</h2>
          <p>Il sito usa strumenti tecnici del browser, incluso l'archivio locale,
            per l'accesso con Supabase Auth, la gestione della sessione,
            alcune preferenze di funzionamento e l'installabilità della web app.
            Il service worker supporta risorse PWA e, se richieste dall'utente,
            notifiche push. Durata e cancellazione delle informazioni tecniche
            dipendono dalla sessione, dal browser e dai fornitori interessati.</p>
        </section>
        <section><h2>2. Consenso e strumenti non tecnici</h2>
          <p>Nella configurazione base della V1 non sono integrati pixel pubblicitari
            Meta, Google Analytics o sistemi di profilazione comportamentale.
            Per cookie e identificatori strettamente tecnici è prevista un'informativa,
            senza necessità di un consenso preventivo specifico. Se saranno attivati
            strumenti di tracciamento non necessari, il titolare aggiornerà
            questa pagina e, ove richiesto, acquisirà preventivamente il consenso
            dell'utente prima del loro utilizzo.</p>
        </section>
        <section><h2>3. Servizi esterni e controllo dell'utente</h2>
          <p>Il browser può contattare Cloudflare, Supabase, Stripe durante
            il checkout e i fornitori delle risorse caricate dal sito, inclusi
            eventuali font esterni. Per dettagli sul trattamento dei dati
            consultare anche l'informativa privacy.
            È possibile cancellare dati locali e cookie dalle impostazioni
            del browser, disattivare le notifiche dalle preferenze del dispositivo
            e interrompere la sessione usando il comando di uscita dell'app.
            La disattivazione dei meccanismi tecnici indispensabili può impedire
            l'accesso e altre funzionalità.</p>
        </section>
      </>}
    </main>
    <footer className="legal-footer">
      <a href={legalPaths.privacy}>Privacy</a>
      <a href={legalPaths.terms}>Condizioni</a>
      <a href={legalPaths.cookies}>Cookie</a>
      <a href="/">Ale Coach</a>
    </footer>
  </div>;
}
