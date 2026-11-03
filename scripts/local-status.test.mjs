import test from 'node:test';
import assert from 'node:assert/strict';
import { assertLoopback, parseEnv } from './local-status.mjs';

test('legge i campi dinamici di supabase status --env',()=>{
  const e=parseEnv('API_URL=http://127.0.0.1:26412\nPUBLISHABLE_KEY=sb_publishable_test\nSECRET_KEY=sb_secret_test\n');
  assert.equal(e.API_URL,'http://127.0.0.1:26412');
  assert.equal(e.PUBLISHABLE_KEY,'sb_publishable_test');
});
test('legge anche variabili legacy e quotate',()=>{
  const e=parseEnv('export API_URL="http://localhost:54321"\r\nANON_KEY="ey.fake"\r\n');
  assert.equal(e.ANON_KEY,'ey.fake');
});
test('impedisce che lo script di seed raggiunga cloud o LAN',()=>{
  assert.equal(assertLoopback('http://127.0.0.1:54321'), 'http://127.0.0.1:54321');
  assert.throws(()=>assertLoopback('https://someproject.supabase.co'));
  assert.throws(()=>assertLoopback('http://192.168.1.5:54321'));
});
