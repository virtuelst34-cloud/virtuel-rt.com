import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const file = join(dirname(fileURLToPath(import.meta.url)), '../src/lib/achievements.ts');
let content = readFileSync(file, 'utf8');

if (!content.includes("import { supabaseDbService }")) {
  if (!content.trimStart().startsWith('/**')) {
    content = `/**\n${content}`;
  }
  content = content.replace(
    /\*\/\s*\n\s*\nexport interface Achievement/,
    "*/\n\nimport { supabaseDbService } from './supabaseDb';\n\nexport interface Achievement",
  );
  writeFileSync(file, content);
  console.log('Import ajouté');
} else {
  console.log('Déjà OK');
}
