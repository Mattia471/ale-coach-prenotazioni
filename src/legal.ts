/**
 * Identità del titolare già comunicata per ALE COACH V1.
 * Le variabili Production sovrascrivono questi dati visibili nel frontend;
 * il gate di rilascio continua a richiedere la configurazione esplicita.
 * Una bozza completata non equivale a verifica legale o GO commerciale.
 */
const knownController={
  name:'Alessandro Cola',
  address:'Via Augusto Camerini 91, 00139 Roma (RM)',
  email:'info@alecoach.online',
  taxId:'16688071006',
};
export const legal = {
  controllerName: String(import.meta.env.VITE_LEGAL_CONTROLLER_NAME || knownController.name).trim(),
  controllerAddress: String(import.meta.env.VITE_LEGAL_CONTROLLER_ADDRESS || knownController.address).trim(),
  contactEmail: String(import.meta.env.VITE_LEGAL_CONTACT_EMAIL || knownController.email).trim(),
  taxId: String(import.meta.env.VITE_LEGAL_TAX_ID || knownController.taxId).trim(),
  version: String(import.meta.env.VITE_LEGAL_POLICY_VERSION || '').trim(),
  reviewed: import.meta.env.VITE_LEGAL_APPROVED === 'true',
};
export const legalReady = Boolean(
  legal.reviewed && legal.controllerName && legal.controllerAddress &&
  legal.contactEmail && legal.taxId && legal.version
);
// La QA interna NON equivale ad abilitazione commerciale.
export const internalQa = import.meta.env.VITE_PRELAUNCH_QA === 'true';
export const blockUnreviewedLegal = import.meta.env.PROD && !legalReady && !internalQa;
export const legalPaths = {
  privacy:'/privacy',
  terms:'/termini',
  cookies:'/cookie',
};
