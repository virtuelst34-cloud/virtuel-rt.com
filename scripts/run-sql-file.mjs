/**
 * Exécute un fichier SQL sur Supabase (DATABASE_URL dans .env.local).
 * Usage: node scripts/run-sql-file.mjs supabase/migrations/RUN_IN_SUPABASE.sql
 */

import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  for (const line of readFileSync(filePath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
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

loadEnvFile(join(root, ".env.local"));

const fileArg = process.argv[2];
if (!fileArg) {
  console.error("Usage: node scripts/run-sql-file.mjs <path-to.sql>");
  process.exit(1);
}

const sqlPath = join(root, fileArg);
const DATABASE_URL = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

if (!DATABASE_URL) {
  console.error("DATABASE_URL manquant dans .env.local");
  process.exit(1);
}

const sql = readFileSync(sqlPath, "utf8");
const pg = await import("pg");
const client = new pg.default.Client({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

await client.connect();
console.log(`✅ Connecté — exécution de ${fileArg}\n`);

try {
  const result = await client.query(sql);
  const results = Array.isArray(result) ? result : [result];
  for (const r of results) {
    if (r.rows?.length) {
      console.log("Résultat:", JSON.stringify(r.rows, null, 2));
    }
  }
  console.log("\n✅ SQL exécuté avec succès.");
} catch (err) {
  console.error("\n❌ Erreur:", err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
