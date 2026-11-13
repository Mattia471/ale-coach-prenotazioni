import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { validateRelease } from './release-check.mjs';

const valid={
  VITE_PUBLIC_SITE_URL:'https://ale-coach.example',
  VITE_SUPABASE_URL:'https://abc.supabase.co',
  VITE_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_dummy',
  VITE_LEGAL_CONTROLLER_NAME:'Titolare Test',
  VITE_LEGAL_CONTROLLER_ADDRESS:'Roma',
  VITE_LEGAL_CONTACT_EMAIL:'privacy@ale-coach.example',
  VITE_LEGAL_TAX_ID:'00000000000',
  VITE_LEGAL_POLICY_VERSION:'2026-11-03',
  VITE_LEGAL_APPROVED:'true',
};
test('impedisce il rilascio senza configurazione',()=>{
  const errors=validateRelease({},'[DA COMPILARE]');
  assert(errors.length>3);
});
test('rifiuta placeholder legali anche con ambiente completo',()=>{
  const errors=validateRelease(valid,'[DA COMPILARE: conservazione]');
  assert(errors.some(x=>x.includes('placeholder')));
});
test('rifiuta email su altro dominio, HTTP e URL Supabase locale',()=>{
  const errors=validateRelease({...valid,VITE_PUBLIC_SITE_URL:'http://ale-coach.example',VITE_SUPABASE_URL:'http://127.0.0.1:54321',VITE_LEGAL_CONTACT_EMAIL:'privacy@gmail.com'},'Informative approvate');
  assert(errors.some(x=>x.includes('HTTPS')));
  assert(errors.some(x=>x.includes('dominio')));
});
test('configurazione completa e testi finali possono superare il gate',()=>{
  assert.deepEqual(validateRelease(valid,'Informativa approvata, senza placeholder.'),[]);
});


// V1 legal copy must match payment flows in the deployed Edge Functions.
test('V1 legal copy uses current Stripe preauthorization and Flex instant payment',()=>{
  const legalText=readFileSync(new URL('../src/LegalPage.tsx',import.meta.url),'utf8');
  assert.match(legalText,/preautorizzazione/i);
  assert.match(legalText,/prima.*richiesta arrivi al coach/i);
  assert.match(legalText,/viene acquisito/i);
  assert.match(legalText,/pagamento immediato/i);
  assert.match(legalText,/24 ore prima/i);
  assert.match(legalText,/14 giorni/i);
  assert.match(legalText,/dieci anni/i);
  assert.match(legalText,/credito.*riaccredita|riaccredita un credito/i);
  assert.doesNotMatch(legalText,/\[DA COMPILARE|\[DA VALIDARE/i);
  assert.doesNotMatch(legalText,/checkout Stripe è disponibile dopo l'approvazione/i);
});

test('user approval of draft does not automatically enable commercial launch',()=>{
  const realText=readFileSync(new URL('../src/LegalPage.tsx',import.meta.url),'utf8');
  assert.deepEqual(validateRelease(valid,realText),[]);
  assert.ok(validateRelease({...valid,VITE_LEGAL_APPROVED:'false'},realText).some(
    error=>error.includes('VITE_LEGAL_APPROVED')));
  assert.ok(validateRelease({...valid,VITE_LEGAL_POLICY_VERSION:''},realText).some(
    error=>error.includes('VITE_LEGAL_POLICY_VERSION')));
  const flags=readFileSync(new URL('../src/legal.ts',import.meta.url),'utf8');
  assert.match(flags,/VITE_LEGAL_APPROVED === 'true'/);
  assert.match(flags,/legal\.taxId && legal\.version/);
  assert.match(flags,/blockUnreviewedLegal/);
});
