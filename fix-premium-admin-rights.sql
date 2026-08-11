-- ═══════════════════════════════════════════════════════════════════════════
-- Coller tout ce fichier dans Supabase → SQL Editor → Run
-- Corrige : « Impossible de modifier Premium (droits admin requis) »
-- Puis : déconnexion / reconnexion sur virtuel-rt.com
-- ═══════════════════════════════════════════════════════════════════════════

-- Corrige Accorder Premium : is_site_admin + Createur + permissions grant_premium
-- + messages d'erreur clairs. Ré-exécutable (CREATE OR REPLACE).

-- ── Helper : droit d'accorder Premium (admin site OU permission badge) ──

CREATE OR REPLACE FUNCTION public.can_grant_premium()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_badges TEXT[];
BEGIN
  IF v_uid IS NULL THEN
    RETURN FALSE;
  END IF;

  IF public.is_site_admin() THEN
    RETURN TRUE;
  END IF;

  SELECT COALESCE(special_badges, ARRAY[]::TEXT[])
    || CASE WHEN COALESCE(is_founder, false) THEN ARRAY['founder'] ELSE ARRAY[]::TEXT[] END
    || CASE WHEN COALESCE(is_direction, false) THEN ARRAY['direction'] ELSE ARRAY[]::TEXT[] END
    || CASE WHEN COALESCE(is_master_op, false) THEN ARRAY['master_op'] ELSE ARRAY[]::TEXT[] END
  INTO v_badges
  FROM public.profiles
  WHERE id = v_uid;

  IF v_badges IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.permissions p
    WHERE p.section = 'premium'
      AND p.action = 'grant_premium'
      AND p.identifier_type = 'badge'
      AND p.allowed = TRUE
      AND p.user_identifier = ANY(v_badges)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_grant_premium() TO authenticated;

-- ── is_site_admin : + email fondateur (filet de sécurité) ───────────────

CREATE OR REPLACE FUNCTION public.is_site_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    auth.uid() IS NOT NULL
    AND (
      EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid()
          AND (
            COALESCE(is_founder, false) = TRUE
            OR COALESCE(is_admin, false) = TRUE
            OR COALESCE(is_direction, false) = TRUE
            OR COALESCE(is_master_op, false) = TRUE
            OR 'founder' = ANY(COALESCE(special_badges, ARRAY[]::TEXT[]))
            OR 'direction' = ANY(COALESCE(special_badges, ARRAY[]::TEXT[]))
            OR 'master_op' = ANY(COALESCE(special_badges, ARRAY[]::TEXT[]))
          )
      )
      OR lower(coalesce(auth.jwt() ->> 'email', '')) = 'virtuelst34@gmail.com'
    );
$$;

-- ── Bypass écriture Premium (RPC trusted) ────────────────────────────────

CREATE OR REPLACE FUNCTION public.allow_premium_write()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT coalesce(nullif(current_setting('app.allow_premium_write', true), ''), '') = 'true';
$$;

CREATE OR REPLACE FUNCTION public.protect_profile_admin_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.allow_premium_write() THEN
    RETURN NEW;
  END IF;

  IF NOT public.is_site_admin() THEN
    NEW.is_founder := OLD.is_founder;
    NEW.is_admin := OLD.is_admin;
    NEW.is_direction := OLD.is_direction;
    NEW.is_master_op := OLD.is_master_op;
    NEW.is_iridescent := OLD.is_iridescent;
    NEW.special_badges := OLD.special_badges;
    NEW.is_premium := OLD.is_premium;
    NEW.premium_until := OLD.premium_until;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.protect_preferences_premium()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  profile_premium BOOLEAN;
BEGIN
  IF public.allow_premium_write() OR public.is_site_admin() THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(p.is_premium, false)
    INTO profile_premium
  FROM public.profiles p
  WHERE p.id = auth.uid()
     OR (auth.uid() IS NULL AND p.name = NEW.user_name)
  LIMIT 1;

  IF profile_premium IS NULL THEN
    profile_premium := FALSE;
  END IF;

  NEW.is_premium := profile_premium;
  RETURN NEW;
END;
$$;

-- ── admin_set_premium : can_grant_premium + message clair ────────────────

CREATE OR REPLACE FUNCTION public.admin_set_premium(
  p_user_name TEXT,
  p_premium BOOLEAN,
  p_premium_until TIMESTAMPTZ DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Connexion compte requise (pas en invité)';
  END IF;

  IF NOT public.can_grant_premium() THEN
    RAISE EXCEPTION 'Accès refusé : droits admin / grant_premium requis (profil id=auth.uid sans flags fondateur/admin, ou permission Premium manquante)';
  END IF;

  IF p_user_name IS NULL OR trim(p_user_name) = '' THEN
    RETURN FALSE;
  END IF;

  SELECT name INTO v_name
  FROM public.profiles
  WHERE lower(name) = lower(trim(p_user_name))
  LIMIT 1;

  IF v_name IS NULL THEN
    RETURN FALSE;
  END IF;

  PERFORM set_config('app.allow_premium_write', 'true', true);

  UPDATE public.profiles
  SET
    is_premium = COALESCE(p_premium, false),
    premium_until = CASE
      WHEN COALESCE(p_premium, false) = FALSE THEN NULL
      ELSE p_premium_until
    END
  WHERE name = v_name;

  INSERT INTO public.preferences (user_name, is_premium)
  VALUES (v_name, COALESCE(p_premium, false))
  ON CONFLICT (user_name) DO UPDATE
  SET is_premium = EXCLUDED.is_premium;

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_premium(TEXT, BOOLEAN, TIMESTAMPTZ) TO authenticated;

-- Recherche Profils : même seuil (voir = grant ou admin)
CREATE OR REPLACE FUNCTION public.admin_search_profiles(p_query TEXT, p_limit INTEGER DEFAULT 20)
RETURNS TABLE (
  id UUID,
  name TEXT,
  avatar TEXT,
  initials TEXT,
  is_premium BOOLEAN,
  premium_until TIMESTAMPTZ,
  level INTEGER,
  xp INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_q TEXT := lower(trim(COALESCE(p_query, '')));
BEGIN
  IF NOT (public.is_site_admin() OR public.can_grant_premium()) THEN
    RAISE EXCEPTION 'Accès refusé : admin requis';
  END IF;

  IF length(v_q) < 1 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    p.id, p.name, p.avatar, p.initials,
    COALESCE(p.is_premium, false),
    p.premium_until,
    COALESCE(p.level, 1),
    COALESCE(p.xp, 0)
  FROM public.profiles p
  WHERE lower(p.name) LIKE '%' || v_q || '%'
  ORDER BY
    CASE WHEN lower(p.name) = v_q THEN 0 ELSE 1 END,
    p.name
  LIMIT GREATEST(LEAST(COALESCE(p_limit, 20), 50), 1);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_search_profiles(TEXT, INTEGER) TO authenticated;

-- ── Réattribuer Createur + email fondateur + sync badges → bools ─────────

UPDATE public.profiles
SET
  is_admin = TRUE,
  is_founder = TRUE,
  special_badges = (
    SELECT ARRAY(
      SELECT DISTINCT b
      FROM unnest(
        COALESCE(special_badges, ARRAY[]::TEXT[]) || ARRAY['founder']::TEXT[]
      ) AS b
    )
  )
WHERE
  lower(name) IN ('createur', 'créateur')
  OR lower(coalesce(email, '')) = 'virtuelst34@gmail.com';

UPDATE public.profiles
SET
  is_founder = COALESCE(is_founder, false) OR 'founder' = ANY(COALESCE(special_badges, ARRAY[]::TEXT[])),
  is_admin = COALESCE(is_admin, false)
    OR 'founder' = ANY(COALESCE(special_badges, ARRAY[]::TEXT[]))
    OR 'direction' = ANY(COALESCE(special_badges, ARRAY[]::TEXT[]))
    OR 'master_op' = ANY(COALESCE(special_badges, ARRAY[]::TEXT[])),
  is_direction = COALESCE(is_direction, false) OR 'direction' = ANY(COALESCE(special_badges, ARRAY[]::TEXT[])),
  is_master_op = COALESCE(is_master_op, false) OR 'master_op' = ANY(COALESCE(special_badges, ARRAY[]::TEXT[])),
  is_iridescent = COALESCE(is_iridescent, false) OR 'iridescent' = ANY(COALESCE(special_badges, ARRAY[]::TEXT[]));

-- Permissions premium grant (idempotent)
INSERT INTO public.permissions (section, action, user_identifier, identifier_type, allowed)
SELECT v.section, v.action, v.user_identifier, v.identifier_type, v.allowed
FROM (VALUES
  ('premium', 'grant_premium', 'founder', 'badge', TRUE),
  ('premium', 'grant_premium', 'direction', 'badge', TRUE),
  ('premium', 'grant_premium', 'master_op', 'badge', TRUE),
  ('premium', 'view', 'founder', 'badge', TRUE),
  ('premium', 'view', 'direction', 'badge', TRUE),
  ('premium', 'view', 'master_op', 'badge', TRUE)
) AS v(section, action, user_identifier, identifier_type, allowed)
WHERE NOT EXISTS (
  SELECT 1 FROM public.permissions p
  WHERE p.section = v.section
    AND p.action = v.action
    AND p.user_identifier = v.user_identifier
    AND p.identifier_type = v.identifier_type
);

UPDATE public.permissions
SET allowed = TRUE
WHERE section = 'premium'
  AND action IN ('view', 'grant_premium', 'create_codes', 'revoke_codes')
  AND identifier_type = 'badge'
  AND user_identifier IN ('founder', 'direction', 'master_op');

COMMENT ON FUNCTION public.can_grant_premium() IS
  'True si is_site_admin ou permission premium.grant_premium pour un badge du profil auth.uid()';
COMMENT ON FUNCTION public.admin_set_premium(TEXT, BOOLEAN, TIMESTAMPTZ) IS
  'Staff: grant/revoke Premium by profile name (can_grant_premium)';


-- Vérif flags fondateur / Createur
SELECT name, email, is_admin, is_founder, is_direction, is_master_op, special_badges
FROM public.profiles
WHERE lower(name) IN ('createur', 'créateur')
   OR lower(coalesce(email, '')) = 'virtuelst34@gmail.com';
