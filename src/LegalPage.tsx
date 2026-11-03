import { legal, legalPaths, legalReady } from './legal';

type DocumentType = 'privacy' | 'termini' | 'cookie';

const label = (value: string, fallback: string) => value || `[DA COMPILARE: ${fallback}]`;
const controller = label(legal.controllerName, 'nome o ragione sociale del titolare');
const address = label(legal.controllerAddress, 'recapito e indirizzo del titolare');
const email = label(legal.contactEmail, 'indirizzo email dedicato alla privacy');
const version = label(legal.version, 'data e versione approvata');

export default function LegalPage({kind}: {kind: DocumentType}) {
  const title = kind === 'privacy' ? 'Informativa privacy'
    : kind === 'termini' ? 'Condizioni di prenotazione e acquisto'
    : 'Informativa cookie e tecnologie locali';
  return <div className="legal-site">
    <header className="legal-header"><a href="/" className="legal-logo">ALE COACH</a><a href="/">Torna all'app</a></header>
    <main className="legal-document">
      <span className="legal-eyebrow">TRASPARENZA & TUTELA</span>
      <h1>{title}</h1>
      <p className="legal-updated">Versione: {version}</p>
      {!legalReady && <div className="legal-draft" role="alert">
        <strong>Documento in preparazione: non valido come informativa definitiva.</strong>
        <p>Il titolare deve completare i dati, i tempi di conservazione, la valutazione dei fornitori e approvare i testi prima di aprire il servizio a clienti reali.</p>
      </div>}
      {kind === 'privacy' && <>
        <section><h2>1. Titolare del trattamento</h2>
          <p>{controller}, {address}. Contatti per richieste privacy: {email}.</p></section>
        <section><h2>2. Dati utilizzati e finalità</h2>
          <p>Per creare l'account e gestire le prenotazioni: nome e cognome, email, telefono se fornito, dichiarazione di iscrizione a Virgin Active, servizi richiesti, sede, appuntamenti, eventuali informazioni tecniche sull'allenamento, storico delle richieste e delle disdette.</p>
          <p>Per i pagamenti: importi, riferimenti della transazione, stato di incasso e rimborso. I dati completi delle carte vengono raccolti da Stripe, non dalla web app Ale Coach. Per la sicurezza e il funzionamento del servizio possono essere trattati log tecnici e sessioni di autenticazione.</p>
          <p>Le notifiche push sono facoltative e richiedono un'azione esplicita dell'utente e il permesso del browser. La fonte di ingresso (ad esempio un QR code) è usata per capire da dove arriva la prenotazione; non sono previsti pixel di profilazione nella configurazione di base.</p>
        </section>
        <section><h2>3. Basi giuridiche</h2>
          <p>L'erogazione del servizio e l'esecuzione di richieste precontrattuali si basano generalmente sull'art. 6(1)(b) GDPR; gli obblighi amministrativi e fiscali sull'art. 6(1)(c), ove applicabili. I trattamenti di sicurezza e prevenzione abusi necessitano di una valutazione documentata del legittimo interesse, quando invocato. Le comunicazioni promozionali non sono attive per impostazione predefinita e richiederebbero una base giuridica separata.</p>
          <p>Queste basi devono essere confermate dal titolare con il proprio consulente, secondo i trattamenti effettivamente svolti.</p>
        </section>
        <section><h2>4. Dati sulla salute e documenti</h2>
          <p>La prima versione del servizio non consente l'upload di schede e documenti dal sito. Non inserire nei campi liberi diagnosi, referti, certificati, patologie o altre informazioni sanitarie. L'eventuale gestione futura di tali dati richiederà un'informativa e una valutazione specifica ai sensi dell'art. 9 GDPR.</p>
        </section>
        <section><h2>5. Fornitori e trasferimenti</h2>
          <p>Il servizio usa Cloudflare per l'hosting, Supabase per database e account, Stripe per i pagamenti e, se configurato, Resend per le email transazionali. Eventuali fornitori aggiuntivi, sub-responsabili, regioni di elaborazione e trasferimenti fuori SEE devono essere verificati e descritti dal titolare prima del lancio. La collocazione del database in UE non garantisce, da sola, che ogni trattamento resti in UE.</p>
        </section>
        <section><h2>6. Conservazione e sicurezza</h2>
          <p>La conservazione dei profili, delle prenotazioni, dei riferimenti di pagamento e dei log segue criteri da definire in relazione alle finalità, alle esigenze di difesa e agli obblighi legali e fiscali. <strong>[DA COMPILARE: periodi o criteri precisi per ogni categoria di dato.]</strong></p>
          <p>L'accesso alle informazioni del cliente è protetto tramite autenticazione, autorizzazioni a livello database e connessioni cifrate; nessun sistema informatico può garantire rischio nullo.</p>
        </section>
        <section><h2>7. Diritti delle persone</h2>
          <p>Puoi chiedere accesso, rettifica, cancellazione quando applicabile, limitazione, portabilità nei casi previsti e opposizione ai trattamenti pertinenti. Puoi rivolgerti a {email}. Il titolare risponde di regola entro un mese, fatte salve le proroghe e le eccezioni previste dal GDPR. Puoi presentare reclamo al Garante per la protezione dei dati personali.</p>
          <p>Dalla tua area personale puoi anche esportare una copia dei principali dati di account e prenotazioni. La funzione non sostituisce integralmente la gestione delle richieste di accesso ex art. 15 GDPR.</p>
        </section>
      </>}
      {kind === 'termini' && <>
        <section><h2>1. Fornitore</h2><p>I servizi sono offerti da {controller}, {address}. Contatto: {email}. {legal.taxId ? `Identificativo fiscale: ${legal.taxId}.` : '[DA COMPILARE: eventuale P.IVA o altro identificativo fiscale e dati obbligatori del prestatore].'}</p></section>
        <section><h2>2. Accesso e prenotazioni</h2><p>Le lezioni presso Virgin Active Talenti e Nuovo Salario sono riservate alle persone iscritte. Una richiesta non equivale a conferma immediata: il coach deve approvarla. Il database impedisce la prenotazione dello stesso orario da parte di più persone.</p></section>
        <section><h2>3. Prezzi e pagamenti</h2><p>I prezzi e gli eventuali sconti vengono mostrati prima della richiesta. Per le lezioni a pagamento il checkout Stripe è disponibile dopo l'approvazione; l'incasso online determina la conferma. Il pagamento in presenza è possibile soltanto per clienti autorizzati dal coach. I pacchetti hanno quantità di crediti e scadenze indicate al momento dell'acquisto; gli abbonamenti ricorrenti non sono attivi nella prima versione.</p></section>
        <section><h2>4. Modifica, cancellazione e rimborsi</h2><p>L'app propone la disdetta online fino a 24 ore prima della lezione, con richiesta di rimborso sullo stesso metodo di pagamento se applicabile. Oltre tale termine il flusso automatico non è disponibile. <strong>La disciplina del diritto di recesso, delle eccezioni legali e dei rimborsi va verificata caso per caso prima del lancio.</strong></p></section>
        <section><h2>5. Assistenza e controversie</h2><p>Per problemi tecnici, pagamenti, reclami o richieste contrattuali, contattare {email}. [DA COMPILARE: termini legali applicabili, gestione dei reclami e informazioni precontrattuali previste dalla normativa vigente.]</p></section>
      </>}
      {kind === 'cookie' && <>
        <section><h2>1. Tecnologie necessarie</h2><p>La web app usa memoria locale del browser per mantenere l'accesso Supabase e, nella sola anteprima, dati dimostrativi. Il service worker può essere usato per installabilità PWA e notifiche richieste dall'utente. Queste funzioni sono tecniche e non vengono usate, nella configurazione base, per pubblicità comportamentale.</p></section>
        <section><h2>2. Cookie non tecnici</h2><p>Non sono integrati pixel Meta, Google Analytics o altri sistemi pubblicitari nella configurazione attuale. Per i soli strumenti tecnici non serve un banner di consenso, ma è necessaria l'informativa. Qualora il titolare aggiunga strumenti non necessari, occorrerà verificare le condizioni di legge e bloccarli fino al consenso, quando richiesto.</p></section>
        <section><h2>3. Fornitori e verifiche</h2><p>Cloudflare, Supabase, eventuale Google OAuth e i provider dei contenuti esterni possono effettuare trattamenti tecnici. Prima della produzione è necessario verificare i cookie effettivamente rilasciati e le eventuali richieste a Google Fonts e ad altri domini terzi.</p></section>
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
