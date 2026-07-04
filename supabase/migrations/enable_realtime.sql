-- Activer Supabase Realtime (idempotent, compatible toutes versions Supabase)
-- Exécuter dans : Supabase Dashboard → SQL Editor → Run

-- 1. Ajouter les tables à la publication (seule étape obligatoire)
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['messages', 'user_presence', 'direct_messages']
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
      RAISE NOTICE 'Realtime activé pour : %', t;
    ELSE
      RAISE NOTICE 'Déjà activé (ignoré) : %', t;
    END IF;
  END LOOP;
END $$;

-- 2. GRANT optionnel — uniquement si le rôle interne existe (sinon ignoré)
DO $$
DECLARE
  t TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_realtime') THEN
    FOREACH t IN ARRAY ARRAY['messages', 'user_presence', 'direct_messages']
    LOOP
      EXECUTE format('GRANT SELECT ON public.%I TO supabase_realtime', t);
    END LOOP;
    RAISE NOTICE 'Permissions GRANT appliquées pour supabase_realtime';
  ELSE
    RAISE NOTICE 'Rôle supabase_realtime absent — GRANT ignoré (normal sur certaines instances)';
  END IF;
END $$;

-- 3. (Optionnel) Anciennes valeurs sur UPDATE/DELETE
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.user_presence REPLICA IDENTITY FULL;
ALTER TABLE public.direct_messages REPLICA IDENTITY FULL;

-- 4. Vérification finale
SELECT tablename AS "Tables Realtime actives"
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND tablename IN ('messages', 'user_presence', 'direct_messages')
ORDER BY tablename;
