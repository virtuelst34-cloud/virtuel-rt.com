-- Cleanup Supabase (auto via Preview ou SQL Editor)

-- Nettoyage données / accès : prefs orphelines, miroir Premium, schema_migrations non public

-- 1) Lignes de test / orphelines
DELETE FROM public.preferences
WHERE user_name IN ('__probe__', '__probe_cleanup__')
   OR user_name IS NULL
   OR trim(user_name) = '';

-- 2) Miroir preferences pour chaque profil manquant
INSERT INTO public.preferences (user_name, is_premium)
SELECT p.name, COALESCE(p.is_premium, false)
FROM public.profiles p
WHERE p.name IS NOT NULL
  AND trim(p.name) <> ''
  AND NOT EXISTS (
    SELECT 1 FROM public.preferences pr WHERE pr.user_name = p.name
  );

-- 3) Aligner preferences.is_premium sur profiles
UPDATE public.preferences pr
SET is_premium = COALESCE(p.is_premium, false)
FROM public.profiles p
WHERE pr.user_name = p.name
  AND COALESCE(pr.is_premium, false) IS DISTINCT FROM COALESCE(p.is_premium, false);

-- 4) special_badges NULL → {}
UPDATE public.profiles
SET special_badges = ARRAY[]::TEXT[]
WHERE special_badges IS NULL;

-- 5) Contrainte unique permissions (évite le double-seed qui gonfle la table)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'permissions_section_action_identifier_key'
  ) THEN
    -- Dédupliquer avant contrainte (garde la ligne la plus récente)
    DELETE FROM public.permissions a
    USING public.permissions b
    WHERE a.ctid < b.ctid
      AND a.section = b.section
      AND a.action = b.action
      AND a.user_identifier = b.user_identifier
      AND a.identifier_type = b.identifier_type;

    ALTER TABLE public.permissions
      ADD CONSTRAINT permissions_section_action_identifier_key
      UNIQUE (section, action, user_identifier, identifier_type);
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN unique_violation THEN
    RAISE NOTICE 'permissions unique non ajoutée (doublons restants)';
END;
$$;

-- 6) schema_migrations : ne pas exposer via PostgREST anon/authenticated
DO $$
BEGIN
  IF to_regclass('public.schema_migrations') IS NOT NULL THEN
    REVOKE ALL ON TABLE public.schema_migrations FROM anon, authenticated;
    ALTER TABLE public.schema_migrations ENABLE ROW LEVEL SECURITY;
    -- Pas de policy → refus pour les rôles non-owner
  END IF;
END;
$$;

-- 7) Normaliser auteurs messages casse (tonton34 → TONTON34, etc.) si profil canonique existe
UPDATE public.messages m
SET author_name = p.name
FROM public.profiles p
WHERE lower(m.author_name) = lower(p.name)
  AND m.author_name IS DISTINCT FROM p.name
  AND m.author_name !~ '^(System|Quiz|User)$';

-- 8) Présence orpheline (user_id sans profil correspondant, hors guests actifs récents)
DELETE FROM public.user_presence up
WHERE up.last_seen < NOW() - INTERVAL '7 days'
  AND NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.name = up.name OR p.name = up.user_id
  );

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'permissions_section_action_identifier_key'
  ) THEN
    COMMENT ON CONSTRAINT permissions_section_action_identifier_key ON public.permissions IS
      'Empêche les doublons de règles de permission';
  END IF;
END;
$$;
