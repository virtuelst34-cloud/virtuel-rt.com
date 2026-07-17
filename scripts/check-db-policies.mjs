import { readFileSync } from 'fs';
import pg from 'pg';

const env = readFileSync('.env.local', 'utf8');
const url = env.match(/DATABASE_URL=(.+)/)?.[1]?.trim();
const client = new pg.Client({ connectionString: url });
await client.connect();

const policies = await client.query(`
  SELECT schemaname, tablename, policyname, roles, cmd
  FROM pg_policies
  WHERE tablename IN ('preferences', 'notifications')
  ORDER BY tablename, policyname
`);
console.log('Policies:', JSON.stringify(policies.rows, null, 2));

const grants = await client.query(`
  SELECT grantee, privilege_type
  FROM information_schema.routine_privileges
  WHERE routine_name = 'update_message_reaction'
`);
console.log('Grants update_message_reaction:', grants.rows);

await client.end();
