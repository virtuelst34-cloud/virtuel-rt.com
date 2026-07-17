/**
 * Applique schema.sql + migrations sur la base Supabase distante.
 * Charge automatiquement DATABASE_URL depuis .env.local si présent.
 * Ignore les migrations déjà enregistrées dans schema_migrations.
 *
 * Usage :
 *   npm run supabase:migrate
 *   APPLY_FROM=create_foo.sql npm run supabase:migrate
 */

import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  const content = readFileSync(filePath, "utf8");
  for (const line of content.split("\n")) {
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
loadEnvFile(join(root, ".env"));

const DATABASE_URL = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

const MIGRATION_ORDER = [
  "schema.sql",
  "add_profile_fields.sql",
  "add_is_iridescent_column.sql",
  "add_bio_status_text.sql",
  "add_bio_status_text_to_profiles.sql",
  "create_direct_messages_table.sql",
  "create_friends_table.sql",
  "create_blocked_users_table.sql",
  "create_muted_users_table.sql",
  "create_user_presence_table.sql",
  "create_notifications_table.sql",
  "ensure_profiles_core_columns.sql",
  "create_global_settings_table.sql",
  "create_security_settings_table.sql",
  "create_message_settings_table.sql",
  "create_notification_settings_table.sql",
  "create_content_moderation_settings_table.sql",
  "create_logs_audit_settings_table.sql",
  "enable_realtime.sql",
  "fix_rls_policies.sql",
  "fix_uuid_text_casts.sql",
  "add_message_editing.sql",
  "add_messages_update_policy.sql",
  "add_update_message_reaction_function.sql",
  "fix_reaction_anon_grant.sql",
  "fix_admin_access_rls.sql",
  "create_chat_uploads_storage.sql",
  "create_user_moderation_table.sql",
  "enable_pgcrypto_extension.sql",
  "create_guest_sessions_table.sql",
  "create_user_achievements_table.sql",
  "add_messages_text_search_index.sql",
  "guest_dms_2fa_quiz.sql",
  "fix_missing_rpc_and_policies.sql",
  "fix_reaction_rpc_text_id.sql",
  "fix_profiles_self_update_rls.sql",
  "add_quiz_answers_column.sql",
  "create_notify_user_rpc.sql",
  "enable_salons_realtime.sql",
  "enable_salons_rls.sql",
  "fix_friends_rls_and_realtime.sql",
  "enable_guest_friends_rls.sql",
];

const SKIP_ERROR_CODES = new Set([
  "42P07", // duplicate_table
  "42710", // duplicate_object
  "42701", // duplicate_column
  "42P06", // duplicate_schema
]);

const SKIP_ERROR_FRAGMENTS = [
  "already exists",
  "duplicate key",
];

function shouldSkipError(message) {
  const lower = (message || "").toLowerCase();
  return SKIP_ERROR_FRAGMENTS.some((f) => lower.includes(f));
}

async function ensureMigrationTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

async function isApplied(client, filename) {
  const { rows } = await client.query(
    "SELECT 1 FROM public.schema_migrations WHERE filename = $1 LIMIT 1",
    [filename],
  );
  return rows.length > 0;
}

async function markApplied(client, filename) {
  await client.query(
    "INSERT INTO public.schema_migrations (filename) VALUES ($1) ON CONFLICT (filename) DO NOTHING",
    [filename],
  );
}

async function main() {
  if (!DATABASE_URL) {
    console.error(`
❌ DATABASE_URL (ou SUPABASE_DB_URL) non défini.

Ajoutez dans .env.local :
  DATABASE_URL=postgresql://postgres:...@db.mqghveoldsidfxgvefts.supabase.co:5432/postgres

Puis : npm run supabase:migrate
`);
    process.exit(1);
  }

  let pg;
  try {
    pg = await import("pg");
  } catch {
    console.error("❌ Installez pg : npm install --save-dev pg");
    process.exit(1);
  }

  const client = new pg.default.Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log("✅ Connecté à Supabase PostgreSQL\n");
  await ensureMigrationTable(client);

  const startFrom = process.env.APPLY_FROM;
  let started = !startFrom;
  let applied = 0;
  let skipped = 0;

  for (const file of MIGRATION_ORDER) {
    if (!started) {
      if (file === startFrom) started = true;
      else continue;
    }

    if (await isApplied(client, file)) {
      console.log(`⏭  ${file} (déjà appliquée)`);
      skipped++;
      continue;
    }

    const isSchema = file === "schema.sql";
    const path = isSchema
      ? join(root, "supabase", file)
      : join(root, "supabase", "migrations", file);

    if (!existsSync(path)) {
      console.warn(`⚠️  Ignoré (absent) : ${file}`);
      continue;
    }

    const sql = readFileSync(path, "utf8");
    process.stdout.write(`▶ ${file} ... `);
    try {
      await client.query(sql);
      await markApplied(client, file);
      console.log("OK");
      applied++;
    } catch (err) {
      if (SKIP_ERROR_CODES.has(err.code) || shouldSkipError(err.message)) {
        await markApplied(client, file);
        console.log("OK (idempotent)");
        applied++;
        continue;
      }
      console.log("ERREUR");
      console.error(err.message);
      await client.end();
      process.exit(1);
    }
  }

  await client.end();
  console.log(`\n✅ Terminé : ${applied} appliquée(s), ${skipped} ignorée(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
