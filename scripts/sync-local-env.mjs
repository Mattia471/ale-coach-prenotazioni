import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readLocalStatus } from './local-status.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const envPath = path.join(root,'.env.local');
const env = readLocalStatus();
const publishable = env.PUBLISHABLE_KEY || env.ANON_KEY;
const old = fs.existsSync(envPath) ? fs.readFileSync(envPath,'utf8') : '';
const extra = (key) => old.match(new RegExp(`^${key}=(.*)$`,'m'))?.[1] || '';

const output = [
  '# Generato dal Supabase CLI locale. NON pubblicare questo file.',
  `VITE_SUPABASE_URL=${env.API_URL}`,
  `VITE_SUPABASE_PUBLISHABLE_KEY=${publishable}`,
  `VITE_VAPID_PUBLIC_KEY=${extra('VITE_VAPID_PUBLIC_KEY')}`,
  `VITE_COACH_WHATSAPP=${extra('VITE_COACH_WHATSAPP')}`,
  '',
].join('\n');
fs.writeFileSync(envPath, output, {encoding:'utf8',mode:0o600});
console.log('✓ .env.local configurato con le chiavi PUBBLICHE del Supabase locale.');
console.log(`  API: ${env.API_URL}`);
console.log('  Riavvia Vite se era già aperto.');
