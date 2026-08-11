import fs from 'fs';

const dbPath = 'src/lib/supabaseDb.ts';
let db = fs.readFileSync(dbPath, 'utf8');

const oldUpdatePrefs = `  async updatePreferences(userName: string, updates: Partial<Preferences>): Promise<void> {
    try {
      const { data: existing } = await supabase
        .from('preferences')
        .select('id')
        .eq('user_name', userName)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('preferences')
          .update(updates)
          .eq('id', existing.id);
      } else {
        await supabase.from('preferences').insert({
          user_name: userName,
          ...updates,
        });
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour des préférences:', error);
    }
  },`;

const newUpdatePrefs = `  async updatePreferences(userName: string, updates: Partial<Preferences>): Promise<void> {
    const { error } = await supabase
      .from('preferences')
      .upsert(
        { user_name: userName, ...updates },
        { onConflict: 'user_name' },
      );

    if (error) throw error;
  },`;

if (db.includes(oldUpdatePrefs)) {
  db = db.replace(oldUpdatePrefs, newUpdatePrefs);
  fs.writeFileSync(dbPath, db);
  console.log('supabaseDb preferences upsert OK');
} else {
  console.log('supabaseDb already patched or pattern not found');
}
