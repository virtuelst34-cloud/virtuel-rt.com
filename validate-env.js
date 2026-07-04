#!/usr/bin/env node

/**
 * Script de validation des variables d'environnement Supabase
 * Exécutez avec: node validate-env.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Validation des variables d\'environnement Supabase...\n');

const requiredVars = [
  { name: 'VITE_SUPABASE_URL', description: 'URL du projet Supabase' },
  { name: 'VITE_SUPABASE_ANON_KEY', description: 'Clé anonyme (anon key) Supabase' },
];

const optionalVars = [
  { name: 'VITE_SENTRY_DSN', description: 'DSN Sentry pour le monitoring (optionnel)' },
];

const envFiles = ['.env', '.env.local', '.env.development', '.env.production'];
let foundEnvFile = null;
let envContent = '';

for (const envFile of envFiles) {
  const envPath = path.join(__dirname, envFile);
  if (fs.existsSync(envPath)) {
    foundEnvFile = envFile;
    envContent = fs.readFileSync(envPath, 'utf-8');
    break;
  }
}

if (foundEnvFile) {
  console.log(`✅ Fichier .env trouvé: ${foundEnvFile}\n`);
} else {
  console.log('⚠️  Aucun fichier .env trouvé (.env, .env.local, .env.development, .env.production)\n');
  console.log('Créez un fichier .env.local avec les variables suivantes:\n');
  requiredVars.forEach(v => {
    console.log(`  ${v.name}=your_value_here`);
  });
  console.log('\n');
}

const envVars = {};
if (envContent) {
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && !key.startsWith('#') && valueParts.length > 0) {
      envVars[key.trim()] = valueParts.join('=').trim();
    }
  });
}

let allValid = true;

requiredVars.forEach(({ name, description }) => {
  const value = envVars[name] || process.env[name];

  if (value && value !== '' && !value.includes('your_')) {
    console.log(`✅ ${name}`);
    console.log(`   Description: ${description}`);
    console.log(`   Valeur: ${value.substring(0, 30)}${value.length > 30 ? '...' : ''}\n`);
  } else {
    console.log(`❌ ${name}`);
    console.log(`   Description: ${description}`);
    console.log(`   Statut: Non défini ou valeur par défaut\n`);
    allValid = false;
  }
});

optionalVars.forEach(({ name, description }) => {
  const value = envVars[name] || process.env[name];
  if (value && value !== '') {
    console.log(`ℹ️  ${name} (optionnel)`);
    console.log(`   Description: ${description}\n`);
  }
});

console.log('─'.repeat(50));
if (allValid) {
  console.log('✅ Toutes les variables d\'environnement requises sont configurées.');
  process.exit(0);
} else {
  console.log('❌ Certaines variables d\'environnement sont manquantes ou incorrectes.');
  console.log('\nPour configurer votre projet:');
  console.log('1. Créez un fichier .env.local dans le répertoire racine');
  console.log('2. Ajoutez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY depuis votre dashboard Supabase');
  console.log('3. Relancez ce script: node validate-env.js\n');
  process.exit(1);
}
