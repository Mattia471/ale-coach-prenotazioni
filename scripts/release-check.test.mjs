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
