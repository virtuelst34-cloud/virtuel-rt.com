import { readFileSync } from 'fs';
import pg from 'pg';

const env = readFileSync('.env.local', 'utf8');
const url = env.match(/DATABASE_URL=(.+)/)?.[1]?.trim();
if (!url) {
  console.error('DATABASE_URL missing');
  process.exit(1);
}

const client = new pg.Client({ connectionString: url });
await client.connect();

const fns = await client.query(`
  SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE p.proname IN ('update_message_reaction', 'register_guest_session', 'set_guest_session')
`);

console.log('Functions:', JSON.stringify(fns.rows, null, 2));

const tbl = await client.query(`
  SELECT to_regclass('public.guest_sessions') AS guest,
         to_regclass('public.preferences') AS prefs
`);
console.log('Tables:', tbl.rows[0]);

const rls = await client.query(`
  SELECT relname, relrowsecurity
  FROM pg_class
  WHERE relname IN ('preferences', 'guest_sessions')
`);
console.log('RLS:', rls.rows);

await client.end();
