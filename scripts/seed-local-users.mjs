/** Seed DEV: solo Supabase su loopback, senza WebSocket e compatibile con Node 20+. */
import { assertLoopback, readLocalStatus } from './local-status.mjs';

const env = readLocalStatus();
const base = assertLoopback(env.API_URL);
const secret = env.SERVICE_ROLE_KEY || env.SECRET_KEY;
if (!secret) throw new Error('Chiave amministrativa locale assente nello stato CLI.');

async function request(path, { method = 'GET', body, prefer } = {}) {
  const response = await fetch(base + path, {
    method,
    headers: {
      apikey: secret,
      Authorization: `Bearer ${secret}`,
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(prefer ? { Prefer: prefer } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const raw = await response.text();
  let data;
  try { data = raw ? JSON.parse(raw) : null; } catch { data = raw; }
  if (!response.ok) {
    throw new Error(`Supabase locale ${method} ${path}: HTTP ${response.status} - ${JSON.stringify(data)}`);
  }
  return data;
}

const users = [
  {email:'ale.dev@example.test',password:'AleCoachLocal2026!',full_name:'Alessandro Cola · DEV',role:'coach',virgin_member:true},
  {email:'cliente.dev@example.test',password:'ClienteLocal2026!',full_name:'Cliente Demo',role:'client',virgin_member:true},
];

for (const account of users) {
  const query = new URLSearchParams({
    select:'id',
    email:`eq.${account.email}`,
    limit:'1',
  });
  const existing = await request(`/rest/v1/profiles?${query}`);
  let id = existing?.[0]?.id;
  if (!id) {
    const created = await request('/auth/v1/admin/users', {
      method:'POST',
      body:{
        email:account.email,
        password:account.password,
        email_confirm:true,
        user_metadata:{full_name:account.full_name},
      },
    });
    id = created.id;
    if (!id) throw new Error(`Creazione account ${account.email}: ID mancante.`);
  }
  const updated = await request(`/rest/v1/profiles?id=eq.${encodeURIComponent(id)}&select=id,role,virgin_member`, {
    method:'PATCH',
    body:{role:account.role,virgin_member:account.virgin_member},
    prefer:'return=representation',
  });
  if (updated?.[0]?.role !== account.role) {
    throw new Error(`Non è stato possibile configurare il ruolo ${account.role}.`);
  }
  console.log(`✓ ${account.role}: ${account.email} (solo locale)`);
}
console.log('Password DEV (solo localhost): AleCoachLocal2026! / ClienteLocal2026!');
console.log('Non riutilizzare queste credenziali in produzione.');
