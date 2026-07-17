import { readFileSync } from 'fs';
import pg from 'pg';

const env = readFileSync('.env.local', 'utf8');
const url = env.match(/DATABASE_URL=(.+)/)?.[1]?.trim();
const client = new pg.Client({ connectionString: url });
await client.connect();

const cols = await client.query(`
  SELECT column_name, data_type, udt_name
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'id'
`);
console.log('messages.id:', cols.rows);

const ext = await client.query(`SELECT extname, extnamespace::regnamespace AS schema FROM pg_extension WHERE extname = 'pgcrypto'`);
console.log('pgcrypto:', ext.rows);

await client.end();
