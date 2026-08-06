/**
 * Applique un fichier SQL unique via DATABASE_URL.
 * Usage: node scripts/apply-one-sql.mjs path/to/file.sql
 */
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  for (const line of readFileSync(filePath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile(join(root, '.env.local'));
loadEnvFile(join(root, '.env'));

const DATABASE_URL = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
const file = process.argv[2];
if (!DATABASE_URL) {
  console.error('DATABASE_URL manquant');
  process.exit(1);
}
if (!file || !existsSync(file)) {
  console.error('Fichier SQL manquant:', file);
  process.exit(1);
}

const pg = await import('pg');
const client = new pg.default.Client({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
await client.connect();
console.log('Connecté — application de', file);
await client.query(readFileSync(file, 'utf8'));
await client.query(`
  INSERT INTO public.schema_migrations (filename)
  VALUES ($1)
  ON CONFLICT (filename) DO NOTHING
`, [file.split('/').pop()]);
console.log('OK');
await client.end();
