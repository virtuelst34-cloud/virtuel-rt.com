import { readFileSync } from 'fs';

const env = readFileSync('.env.local', 'utf8');
const url = env.match(/VITE_SUPABASE_URL=(.+)/)?.[1]?.trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.+)/)?.[1]?.trim();

const rpcUrl = `${url}/rest/v1/rpc/update_message_reaction`;
const res = await fetch(rpcUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    apikey: key,
    Authorization: `Bearer ${key}`,
  },
  body: JSON.stringify({
    message_id: '00000000-0000-0000-0000-000000000001',
    new_reactions: { '👍': ['TestUser'] },
  }),
});

console.log('Status:', res.status);
console.log('Body:', await res.text());

const regUrl = `${url}/rest/v1/rpc/register_guest_session`;
const res2 = await fetch(regUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    apikey: key,
    Authorization: `Bearer ${key}`,
  },
  body: JSON.stringify({
    p_name: 'testguest123',
    p_avatar: 'av1',
    p_initials: 'TE',
    p_session_token: null,
  }),
});
console.log('register_guest_session Status:', res2.status);
console.log('register_guest_session Body:', await res2.text());
