/** Solo sviluppo. NON usare con chiavi cloud. */
import { createClient } from '@supabase/supabase-js';
import { assertLoopback, readLocalStatus } from './local-status.mjs';

const env = readLocalStatus();
const url = assertLoopback(env.API_URL);
const secret = env.SECRET_KEY || env.SERVICE_ROLE_KEY;
if (!secret) throw new Error('Chiave amministrativa locale assente nello stato CLI.');
const admin = createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
const users = [
  {email:'ale.dev@example.test',password:'AleCoachLocal2026!',full_name:'Alessandro Cola · DEV',role:'coach',virgin_member:true},
  {email:'cliente.dev@example.test',password:'ClienteLocal2026!',full_name:'Cliente Demo',role:'client',virgin_member:true},
];

for (const account of users) {
  let {data:profile,error:lookupError} = await admin.from('profiles').select('id').eq('email',account.email).maybeSingle();
  if (lookupError) throw lookupError;
  if (!profile) {
    const created = await admin.auth.admin.createUser({
      email:account.email,
      password:account.password,
      email_confirm:true,
      user_metadata:{full_name:account.full_name},
    });
    if (created.error) throw created.error;
    profile = {id:created.data.user.id};
  }
  const updated = await admin.from('profiles')
    .update({role:account.role,virgin_member:account.virgin_member})
    .eq('id',profile.id).select('id,role,virgin_member').single();
  if (updated.error || updated.data?.role !== account.role) {
    throw updated.error || new Error(`Non è stato possibile configurare il ruolo ${account.role}.`);
  }
  console.log(`✓ ${account.role}: ${account.email} (solo locale)`);
}
console.log('Password DEV (solo localhost): AleCoachLocal2026! / ClienteLocal2026!');
console.log('Non riutilizzare queste credenziali in produzione.');
