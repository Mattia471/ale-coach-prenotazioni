-- Prima release GDPR: non acquisire documenti potenzialmente sanitari.
-- La policy di upload viene rimossa: nessun cliente può caricare file
-- nel bucket riservato tramite Storage API, neppure bypassando React.
-- I dati già presenti non vengono cancellati automaticamente: devono essere
-- gestiti secondo retention e richieste degli interessati.
drop policy if exists documents_client_upload on storage.objects;

-- L'accesso in lettura del cliente al proprio materiale eventualmente presente
-- resta invariato. Una futura riattivazione richiede base giuridica art. 9,
-- minimizzazione, retention, audit, avvisi e test RLS per i dati sanitari.
