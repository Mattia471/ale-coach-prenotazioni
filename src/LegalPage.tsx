import { legal, legalPaths } from './legal';

type DocumentType = 'privacy' | 'termini' | 'cookie' | 'recesso';

export default function LegalPage({kind}: {kind: DocumentType}) {
  const title = kind === 'privacy' ? 'Informativa privacy'
    : kind === 'termini' ? 'Condizioni di prenotazione e acquisto'
    : kind === 'recesso' ? 'Modulo tipo di recesso'
    : 'Informativa cookie e tecnologie locali';
  const controller = legal.controllerName;
  const address = legal.controllerAddress;
  const email = legal.contactEmail;
  const phone = '+39 339 699 8893';

  return <div className="legal-site">
    <header className="legal-header"><span className="legal-logo">ALE COACH</span></header>
    <main className="legal-document">
      <span className="legal-eyebrow">TRASPARENZA &amp; TUTELA</span>
      <h1>{title}</h1>
      {kind === 'privacy' && <>
        <section><h2>1. Titolare del trattamento</h2>
          <p>Il titolare è {controller}, con sede in {address}, P.IVA {legal.taxId}.
            Per informazioni e richieste sulla protezione dei dati: <a href={'mailto:'+email}>{email}</a>,
            tel. <a href="tel:+393396998893">{phone}</a>.</p>
        </section>
        <section><h2>2. Dati personali, finalità e conferimento</h2>
          <p>Per registrazione, accesso e gestione del servizio trattiamo i dati identificativi e di contatto
            forniti dall'utente, la dichiarazione di iscrizione alla palestra, le preferenze e richieste di allenamento,
            gli appuntamenti, la sede scelta, lo storico delle prenotazioni, delle disdette e delle comunicazioni di servizio.</p>
          <p>Per pacchetti e pagamenti trattiamo prezzi, crediti, stato degli ordini e delle autorizzazioni,
            identificativi delle transazioni e dati amministrativi necessari. Le informazioni complete della carta
            sono inserite nel checkout gestito da Stripe e non sono conservate dall'app ALE COACH.</p>
          <p>Per funzionamento e sicurezza possono essere trattati indirizzi IP, informazioni di accesso,
            dispositivi, eventi tecnici e registrazioni di errore. Le notifiche push sono facoltative e si attivano
            solo su richiesta dell'utente e con il permesso del dispositivo; possono richiedere un identificativo
            tecnico del browser. La provenienza di una richiesta (ad esempio QR code o collegamento)
            può essere registrata per la gestione operativa del servizio.</p>
          <p>I dati indispensabili per identificarsi, accedere, gestire l'appuntamento e concludere un acquisto
            sono necessari per il servizio richiesto. I campi espressamente facoltativi e le notifiche push
            possono essere omessi.</p>
        </section>
        <section><h2>3. Basi giuridiche</h2>
          <p>La gestione dell'account, delle prenotazioni e dei pacchetti si fonda sull'esecuzione del contratto
            o di misure precontrattuali richieste dall'interessato (art. 6, par. 1, lett. b GDPR).
            Gli adempimenti contabili, fiscali e le richieste delle autorità si fondano sull'obbligo legale
            (art. 6, par. 1, lett. c GDPR). La protezione del servizio, il contrasto agli abusi e la tutela
            dei diritti si fondano sul legittimo interesse del titolare (art. 6, par. 1, lett. f GDPR).
            Le notifiche push si fondano sul consenso dell'utente (art. 6, par. 1, lett. a GDPR),
            revocabile disattivandole dalle impostazioni del dispositivo o del browser.</p>
          <p>Non utilizziamo i dati per profilazione pubblicitaria né per comunicazioni promozionali automatiche.
            Non adottiamo decisioni esclusivamente automatizzate con effetti giuridici o analogamente
            significativi ai sensi dell'art. 22 GDPR.</p>
        </section>
        <section><h2>4. Dati particolari e salute</h2>
          <p>L'app non richiede referti, diagnosi, certificati o cartelle cliniche e non offre il caricamento
            di documentazione sanitaria. Si invita a non inserire dati sulla salute nei campi di testo libero:
            eventuali informazioni sanitarie comunicate spontaneamente non sono necessarie alla prenotazione.
            Un futuro trattamento di dati particolari richiederebbe presupposti e informative dedicati
            ai sensi dell'art. 9 GDPR.</p>
        </section>
        <section><h2>5. Destinatari e trasferimenti</h2>
          <p>I dati possono essere accessibili al titolare, ai soggetti autorizzati che collaborano alla gestione
            delle lezioni e, nei limiti necessari, ai fornitori tecnici: Cloudflare (hosting e sicurezza),
            Supabase (autenticazione e database), Stripe (pagamenti), al fornitore di servizi email per le
            comunicazioni di servizio e al consulente fiscale per gli adempimenti contabili.
            I fornitori operano come responsabili del trattamento (art. 28 GDPR) oppure, per alcune attività
            come la prevenzione delle frodi nei pagamenti, come titolari autonomi.
            Dettagli aggiornati disponibili presso <a href={'mailto:'+email}>{email}</a>.</p>
          <p>Il database è ospitato nell'Unione europea. Alcuni fornitori, tra cui Cloudflare, Supabase e Stripe,
            possono trattare dati anche fuori dallo Spazio economico europeo. Quando applicabile,
            i trasferimenti si fondano sulla decisione di adeguatezza UE-USA (Data Privacy Framework)
            per i soggetti certificati, oppure sulle clausole contrattuali tipo approvate dalla Commissione europea.
            I dettagli sulle garanzie applicate possono essere richiesti a {email}.</p>
        </section>
        <section><h2>6. Criteri di conservazione</h2>
          <p>I dati del profilo e dell'account sono trattati finché il servizio è utilizzato. In caso di chiusura
            o richiesta di cancellazione, i dati non più necessari sono eliminati o resi anonimi,
            nei limiti degli obblighi di conservazione e delle contestazioni pendenti.
            Lo storico di prenotazioni, disdette, comunicazioni e utilizzo dei crediti è conservato per
            il tempo necessario all'esecuzione del servizio e, successivamente, nella misura necessaria
            a documentare obbligazioni, reclami ed eventuali diritti secondo i termini di prescrizione
            applicabili (in generale fino a 10 anni ove necessario).</p>
          <p>Documenti e dati soggetti a obblighi contabili o fiscali sono conservati per il periodo imposto
            dalla normativa, generalmente 10 anni per le scritture contabili (art. 2220 c.c.),
            salvi maggiori termini di legge o contenziosi. Log di sicurezza, sessioni, notifiche e dati
            tecnici sono conservati per periodi limitati in base alla finalità, alle impostazioni dei
            fornitori e alle necessità di indagine. I backup seguono cicli di rotazione e sicurezza.</p>
          <p>La richiesta di chiusura o cancellazione può essere inviata a <a href={'mailto:'+email}>{email}</a>:
            il titolare valuta quali dati eliminare e quali conservare per obbligo di legge o tutela di un diritto.</p>
        </section>
        <section><h2>7. Diritti degli interessati e reclami</h2>
          <p>L'interessato può richiedere accesso, rettifica, cancellazione nei casi previsti, limitazione,
            portabilità ove applicabile e opposizione ai trattamenti basati sul legittimo interesse;
            può revocare eventuali consensi senza pregiudicare i trattamenti già leciti.
            Le richieste possono essere inviate a <a href={'mailto:'+email}>{email}</a>.
            La risposta è fornita di regola entro un mese, salve le proroghe dell'art. 12 GDPR.
            Resta il diritto di proporre reclamo al
            <a href="https://www.garanteprivacy.it/" target="_blank" rel="noopener noreferrer"> Garante per la protezione dei dati personali</a>.</p>
          <p>L'area personale permette di esportare una copia dei principali dati visibili all'utente.
            Questo strumento non sostituisce l'esercizio completo dei diritti GDPR.</p>
        </section>
      </>}
      {kind === 'termini' && <>
        <section><h2>1. Fornitore e contatti</h2>
          <p>I servizi ALE COACH sono offerti da {controller} (di seguito «il titolare» o «il coach»),
            {address}, P.IVA {legal.taxId}. Per informazioni precontrattuali, prenotazioni,
            pagamenti e reclami: <a href={'mailto:'+email}>{email}</a>,
            tel. <a href="tel:+393396998893">{phone}</a>.
            Le caratteristiche e i prezzi dei servizi sono mostrati nell'app prima della conferma.</p>
        </section>
        <section><h2>2. Accesso e prenotazioni</h2>
          <p>Le lezioni in presenza presso Virgin Active Talenti e Nuovo Salario sono riservate
            alle persone che dispongono dell'accesso alla struttura. L'iscrizione alla palestra,
            quando richiesta, è distinta dal costo delle lezioni ALE COACH.
            Una richiesta inviata dall'app non costituisce conferma automatica:
            il coach deve accettarla entro <strong>48 ore</strong>, comunque prima dell'orario della lezione
            e della scadenza dell'eventuale preautorizzazione della carta.
            In assenza di risposta la richiesta decade senza alcun addebito.
            Disponibilità, orario, luogo, durata e prezzo sono quelli mostrati durante la prenotazione.
            In caso di ritardo del cliente, il tempo perso non viene recuperato:
            la lezione termina all'orario previsto e il prezzo resta invariato.</p>
        </section>
        <section><h2>3. Prezzi, preautorizzazione e pagamenti</h2>
          <p>Prima della richiesta vengono indicati il servizio, il prezzo e gli eventuali sconti.
            Per le lezioni con pagamento online, il cliente inserisce la carta nel checkout Stripe
            e autorizza l'importo prima che la richiesta arrivi al coach.
            La preautorizzazione non è ancora un incasso. Se il coach approva entro i termini
            indicati all'art. 2, l'importo viene acquisito e la lezione confermata.
            Se il coach rifiuta, la preautorizzazione è annullata e il rilascio della somma
            eventualmente bloccata dipende dall'emittente. Se l'autorizzazione scade
            prima della decisione, la richiesta decade senza incasso.</p>
          <p>Il pagamento in presenza è riservato ai clienti autorizzati dal coach e avviene
            direttamente al coach, <strong>in contanti al termine della lezione</strong>.
            I pacchetti Flex si acquistano invece con pagamento immediato tramite Stripe:
            ogni credito vale per una lezione individuale, entro la scadenza e negli orari disponibili.
            Alla scadenza del pacchetto, i crediti non utilizzati decadono senza rimborso,
            fatti salvi i diritti inderogabili del consumatore.
            Prezzo, numero dei crediti e durata sono mostrati prima dell'acquisto.
            Non sono previsti rinnovi automatici. Per ogni pagamento online il cliente
            riceve automaticamente via email una ricevuta di pagamento.</p>
        </section>
        <section><h2>4. Disdette, crediti e rimborsi</h2>
          <p>Il cliente può richiedere la disdetta dall'app. Le conseguenze economiche
            dipendono dal preavviso rispetto all'orario di inizio.</p>
          <h3>Almeno 24 ore prima</h3>
          <p>Per una lezione già pagata online, il cliente riceve il rimborso integrale
            sul metodo di pagamento originario; i tempi di riaccredito dipendono
            dall'emittente. Per una prenotazione con credito Flex, il credito è
            restituito nello stesso pacchetto, con la scadenza originaria.
            Prima dell'approvazione del coach, l'eventuale preautorizzazione della carta
            può essere annullata senza rimborso di somme non incassate.
            Per le lezioni con pagamento in presenza la disdetta non comporta costi.</p>
          <h3>Meno di 24 ore prima</h3>
          <p>Per una lezione pagata online, il cliente riceve il <strong>rimborso del 50%</strong>
            dell'importo effettivamente pagato. Per le lezioni con pagamento in presenza,
            la disdetta non comporta costi. Per una lezione prenotata con credito Flex,
            il credito viene riaccreditato nel pacchetto con la scadenza originaria.</p>
          <p>Se il cliente non si presenta senza aver disdetto la lezione,
            non è previsto alcun rimborso e il credito Flex non viene riaccreditato.
            Se il coach annulla la lezione, il cliente ha diritto al rimborso integrale
            o alla restituzione del credito Flex. Eventuali incassi in presenza già registrati
            devono essere riconciliati dal titolare prima dell'eventuale rimborso:
            non vengono automaticamente azzerati dall'app.</p>
          <p>Impedimenti, contestazioni, diritti inderogabili e richieste eccezionali
            possono essere sottoposti a <a href={'mailto:'+email}>{email}</a>.</p>
        </section>
        <section><h2>5. Diritto di recesso</h2>
          <p><strong>Lezioni singole.</strong> Per le lezioni relative ad attività del tempo libero
            prenotate per una data e un orario specifici, non si applica il diritto ordinario
            di recesso, nei casi previsti dall'art. 59, comma 1, lett. n, del Codice del Consumo.
            Per la cancellazione valgono le regole di disdetta dell'art. 4,
            fatti salvi i diritti inderogabili previsti dalla legge.</p>
          <p><strong>Pacchetti Flex.</strong> Il cliente può recedere entro 14 giorni dall'acquisto,
            senza motivazione e senza penali. Se ha già utilizzato crediti,
            il rimborso è ridotto del valore proporzionale delle lezioni svolte,
            nel rispetto delle condizioni previste dalla normativa per le prestazioni
            iniziate durante il periodo di recesso.</p>
          <p><strong>Come recedere.</strong> Il cliente invia una dichiarazione esplicita a
            <a href={'mailto:'+email}> {email}</a> identificando l'acquisto.
            Può utilizzare il <a href={legalPaths.withdrawal}>modulo tipo di recesso</a>,
            ma non è obbligatorio utilizzare tale modulo.</p>
          <p><strong>Rimborso.</strong> Il rimborso è disposto entro 14 giorni dalla comunicazione
            di recesso, sullo stesso mezzo di pagamento usato per l'acquisto.
            Restano salvi gli altri diritti del consumatore.</p>
        </section>
        <section><h2>6. Assistenza, reclami e controversie</h2>
          <p>Per problemi di accesso, esecuzione della lezione, addebiti, crediti
            o richieste di rimborso: <a href={'mailto:'+email}>{email}</a>,
            indicando se possibile il riferimento di prenotazione o ordine.
            Il titolare fornisce riscontro ai reclami entro <strong>15 giorni</strong> dalla ricezione.
            Le condizioni sono regolate dalla legge italiana. Per le controversie
            si applicano le norme inderogabili a tutela del consumatore,
            incluso il foro del luogo di residenza o domicilio del consumatore.
            Le condizioni non escludono gli altri rimedi di legge.</p>
        </section>
      </>}
      {kind === 'cookie' && <>
        <section><h2>1. Tecnologie tecniche e strettamente necessarie</h2>
          <p>Il titolare è {controller} (contatti all'art. 1 dell'<a href={legalPaths.privacy}>Informativa privacy</a>).
            L'app usa strumenti tecnici del browser, incluso l'archivio locale, per l'accesso con
            Supabase Auth, la sessione, alcune preferenze e l'installabilità della web app.
            Il service worker supporta la cache dell'app e, se attivate, le notifiche push.
            Gli strumenti utilizzati e le loro durate indicative sono riportati nella tabella.
            I cookie di fornitori esterni sono presenti solo quando tali fornitori li impostano.</p>
          <div className="legal-table-wrap"><table className="legal-tools-table">
            <thead><tr><th>Strumento</th><th>Fornitore</th><th>Finalità</th><th>Durata</th></tr></thead>
            <tbody>
              <tr><td>Token di accesso (archivio locale, sb-…-auth-token)</td><td>Supabase</td><td>Mantenere l'accesso all'account</td><td>Fino all'uscita o alla scadenza della sessione</td></tr>
              <tr><td>Preferenze di funzionamento (archivio locale)</td><td>ALE COACH</td><td>Ricordare alcune impostazioni dell'app</td><td>Fino alla cancellazione dal browser</td></tr>
              <tr><td>Service worker e cache</td><td>ALE COACH</td><td>Installabilità, prestazioni e notifiche push</td><td>Fino alla disinstallazione o cancellazione dal browser</td></tr>
              <tr><td>__cf_bm, ove presente</td><td>Cloudflare</td><td>Sicurezza e distinzione persone/bot</td><td>30 minuti circa</td></tr>
              <tr><td>__stripe_mid, ove presente</td><td>Stripe</td><td>Prevenzione frodi nei pagamenti</td><td>1 anno circa</td></tr>
              <tr><td>__stripe_sid, ove presente</td><td>Stripe</td><td>Prevenzione frodi nei pagamenti</td><td>30 minuti circa</td></tr>
            </tbody>
          </table></div>
        </section>
        <section><h2>2. Consenso e strumenti non tecnici</h2>
          <p>Non sono integrati pixel pubblicitari Meta, Google Analytics o sistemi di profilazione
            comportamentale. Gli strumenti strettamente tecnici descritti al punto 1
            non richiedono consenso preventivo ai sensi dell'art. 122 del Codice privacy:
            per questo l'app non mostra un banner cookie. Se saranno introdotti
            strumenti di tracciamento non necessari, questa informativa sarà aggiornata
            e verrà acquisito il consenso quando richiesto.</p>
        </section>
        <section><h2>3. Servizi esterni e controllo dell'utente</h2>
          <p>Durante l'uso dell'app il browser si collega a Cloudflare (hosting e sicurezza),
            Supabase (accesso e database) e, durante il pagamento, a Stripe.
            Cloudflare e Stripe possono impostare cookie tecnici di sicurezza
            e antifrode nei casi riportati nella tabella al punto 1.
            Per i dettagli si veda l'<a href={legalPaths.privacy}>informativa privacy</a>.</p>
          <p>I font dell'interfaccia sono caricati tramite Google Fonts, servizio di Google,
            che riceve le richieste tecniche per le risorse tipografiche. È possibile
            cancellare dati locali e cookie dalle impostazioni del browser,
            disattivare le notifiche nelle preferenze del dispositivo
            e interrompere la sessione usando il pulsante «Esci» dell'app.
            Disattivare i meccanismi tecnici necessari può impedire l'accesso
            e altre funzionalità.</p>
        </section>
      </>}
      {kind === 'recesso' && <>
        <section><p>Modulo tipo ai sensi dell'art. 49, comma 1, lett. h e dell'Allegato I,
          parte B, del Codice del Consumo (D.Lgs. 206/2005).
          Compilare e inviare soltanto se si desidera recedere dal contratto.
          È possibile recedere anche con qualsiasi altra dichiarazione esplicita.</p>
          <p><strong>Destinatario:</strong> {controller} – ALE COACH, {address},
            <a href={'mailto:'+email}> {email}</a>.</p>
          <p>Con la presente io/noi (*) notifico/notifichiamo (*) il recesso dal mio/nostro (*)
            contratto di acquisto dei seguenti beni/servizi:</p>
          <p>Servizio: _________________________________________________________</p>
          <p>Riferimento ordine / prenotazione: ___________________________________</p>
          <p>Ordinato il (*) / ricevuto il (*): _____________________________________</p>
          <p>Nome del/dei consumatore/i: _______________________________________</p>
          <p>Indirizzo del/dei consumatore/i: ____________________________________</p>
          <p>Firma del/dei consumatore/i (solo per il cartaceo): _____________________</p>
          <p>Data: ____________________________________________________________</p>
          <p>(*) Cancellare la dicitura inutile.</p>
          <p>Il modulo può essere inviato via email a <a href={'mailto:'+email}>{email}</a>.
            Per condizioni e casi applicabili, consultare l'<a href={legalPaths.terms}>articolo 5 delle Condizioni</a>.</p>
          <button type="button" className="legal-print" onClick={()=>window.print()}>Stampa il modulo</button>
        </section>
      </>}
    </main>
    <footer className="legal-footer">
      <a href={legalPaths.privacy}>Privacy</a>
      <a href={legalPaths.terms}>Condizioni</a>
      <a href={legalPaths.cookies}>Cookie</a>
      <a href={legalPaths.withdrawal}>Recesso</a>
    </footer>
  </div>;
}
