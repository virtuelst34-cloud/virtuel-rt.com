# Appliquer la migration salons (ordre / droits)

## Fichier

`supabase/migrations/add_salons_sort_order_and_meta.sql`

## Méthode recommandée

```bash
npm run supabase:apply
```

Ce script applique les migrations présentes sous `supabase/migrations/` (voir `scripts/apply-supabase.mjs`).

## Méthode manuelle

1. Ouvrir le SQL Editor du projet Supabase
2. Coller le contenu de `add_salons_sort_order_and_meta.sql`
3. Exécuter

## Vérification

```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'salons' AND column_name IN ('sort_order', 'description', 'created_by');

SELECT * FROM salon_display_order ORDER BY sort_order;
```
