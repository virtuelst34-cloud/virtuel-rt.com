#!/usr/bin/env node

/**
 * Script de validation des variables d'environnement Base44
 * Exécutez avec: node validate-env.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Validation des variables d\'environnement Base44...\n');

// Variables requises
const requiredVars = [
  { name: 'VITE_BASE44_APP_ID', description: 'ID de votre application Base44' },
  { name: 'VITE_BASE44_APP_BASE_URL', description: 'URL de votre backend Base44' },
  { name: 'VITE_BASE44_API_KEY', description: 'Clé API pour l\'authentification Base44' }
];

// Chercher les fichiers .env possibles
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

// Parser les variables d'environnement
const envVars = {};
if (envContent) {
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && !key.startsWith('#') && valueParts.length > 0) {
      envVars[key.trim()] = valueParts.join('=').trim();
    }
  });
}

// Vérifier chaque variable requise
let allValid = true;
requiredVars.forEach(({ name, description }) => {
  const value = envVars[name] || process.env[name];
  
  if (value && value !== '' && value !== 'your_' + name.toLowerCase() + '_value') {
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

// Résumé
console.log('─'.repeat(50));
if (allValid) {
  console.log('✅ Toutes les variables d\'environnement sont correctement configurées.');
  process.exit(0);
} else {
  console.log('❌ Certaines variables d\'environnement sont manquantes ou incorrectes.');
  console.log('\nPour configurer votre projet:');
  console.log('1. Créez un fichier .env.local dans le répertoire racine');
  console.log('2. Ajoutez les variables manquantes avec vos valeurs réelles');
  console.log('3. Relancez ce script pour vérifier: node validate-env.js\n');
  process.exit(1);
}
