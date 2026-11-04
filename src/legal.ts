/**
 * Informative in bozza fino all'approvazione formale del titolare.
 * Non usare un flag frontend come controllo di autorizzazione: il gate blocca
 * l'interfaccia commerciale, mentre Supabase RLS garantisce gli accessi ai dati.
 */
export const legal = {
  controllerName: String(import.meta.env.VITE_LEGAL_CONTROLLER_NAME || '').trim(),
  controllerAddress: String(import.meta.env.VITE_LEGAL_CONTROLLER_ADDRESS || '').trim(),
  contactEmail: String(import.meta.env.VITE_LEGAL_CONTACT_EMAIL || '').trim(),
  taxId: String(import.meta.env.VITE_LEGAL_TAX_ID || '').trim(),
  version: String(import.meta.env.VITE_LEGAL_POLICY_VERSION || '').trim(),
  reviewed: import.meta.env.VITE_LEGAL_APPROVED === 'true',
};
export const legalReady = Boolean(
  legal.reviewed && legal.controllerName && legal.controllerAddress &&
  legal.contactEmail && legal.version
);
// Le iscrizioni commerciali restano disabilitate fino all'approvazione delle informative.
export const blockUnreviewedLegal = import.meta.env.PROD && !legalReady;
export const legalPaths = {
  privacy: '/privacy',
  terms: '/termini',
  cookies: '/cookie',
};
