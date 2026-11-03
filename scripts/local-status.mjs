/** Read credentials from the Supabase CLI, never from a cloud project. */
import { execSync } from 'node:child_process';

export function parseEnv(raw) {
  const vars = {};
  for (const line of raw.replace(/\x1b\[[0-9;]*m/g, '').split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Z][A-Z0-9_]*)=(.*)\s*$/);
    if (!match) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    vars[match[1]] = value;
  }
  return vars;
}

export function assertLoopback(urlString) {
  let url;
  try { url = new URL(urlString); } catch { throw new Error('API URL Supabase non valida.'); }
  if (!['localhost','127.0.0.1','[::1]'].includes(url.hostname) || url.protocol !== 'http:') {
    throw new Error('Operazione bloccata: è consentita soltanto una istanza Supabase su localhost.');
  }
  return url.origin;
}

export function readLocalStatus() {
  const commands = [
    'supabase status --env --output-format text',
    'supabase status -o env',
  ];
  for (const command of commands) {
    try {
      const raw = execSync(command, {encoding:'utf8', stdio:['ignore','pipe','pipe'], maxBuffer:4*1024*1024});
      const parsed = parseEnv(raw);
      if (parsed.API_URL && (parsed.PUBLISHABLE_KEY || parsed.ANON_KEY)) {
        assertLoopback(parsed.API_URL);
        return parsed;
      }
    } catch { /* Differenze fra versioni CLI: prova il formato alternativo. */ }
  }
  throw new Error('Stack Supabase locale non attivo o CLI non compatibile. Esegui `npm run local:status` e verifica Docker Desktop.');
}
