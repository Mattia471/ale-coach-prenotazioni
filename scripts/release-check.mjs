import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/** Convalida il rilascio commerciale: fail-closed sulle informazioni legali. */
export function validateRelease(env, source) {
  const errors=[];
  const required=[
    'VITE_PUBLIC_SITE_URL','VITE_SUPABASE_URL','VITE_SUPABASE_PUBLISHABLE_KEY',
    'VITE_LEGAL_CONTROLLER_NAME','VITE_LEGAL_CONTROLLER_ADDRESS',
    'VITE_LEGAL_CONTACT_EMAIL','VITE_LEGAL_TAX_ID','VITE_LEGAL_POLICY_VERSION',
  ];
  for(const key of required) if(!String(env[key]||'').trim())errors.push(`Manca ${key}`);
  if(env.VITE_LEGAL_APPROVED!=='true')errors.push('VITE_LEGAL_APPROVED deve essere true solo dopo approvazione dei testi legali.');
  try {
    const url=new URL(env.VITE_PUBLIC_SITE_URL||'');
    if(url.protocol!=='https:'||['localhost','127.0.0.1'].includes(url.hostname))errors.push('VITE_PUBLIC_SITE_URL deve essere il dominio HTTPS reale.');
    const domain=url.hostname.replace(/^www\./,'');
    const email=String(env.VITE_LEGAL_CONTACT_EMAIL||'');
    if(!email.includes('@')||!email.toLowerCase().endsWith('@'+domain.toLowerCase())){
      errors.push('VITE_LEGAL_CONTACT_EMAIL deve appartenere al dominio del sito.');
    }
  } catch {errors.push('VITE_PUBLIC_SITE_URL non valido.');}
  try {
    const url=new URL(env.VITE_SUPABASE_URL||'');
    if(url.protocol!=='https:'||['localhost','127.0.0.1'].includes(url.hostname))errors.push('VITE_SUPABASE_URL deve essere HTTPS, non localhost.');
  } catch {errors.push('VITE_SUPABASE_URL non valido.');}
  if(source.includes('[DA COMPILARE')||source.includes('[DA VALIDARE')){
    errors.push('I testi di src/LegalPage.tsx contengono placeholder legali: completare e approvare prima del lancio.');
  }
  return errors;
}
const isMain=process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1];
if(isMain){
  const source=readFileSync(new URL('../src/LegalPage.tsx',import.meta.url),'utf8');
  const errors=validateRelease(process.env,source);
  if(errors.length){
    console.error('❌ STOP PUBBLICAZIONE:');
    for(const error of errors)console.error(' - '+error);
    process.exitCode=1;
  }else console.log('✓ Gate configurazione release: parametri HTTPS, Supabase, email dominio e testi legali presenti.');
}
