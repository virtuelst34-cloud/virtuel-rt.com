-- Fix redeem Premium (trigger bloquait is_premium) + Profils admin + permissions générateur
-- Exécutable plusieurs fois (CREATE OR REPLACE / ON CONFLICT)

-- ── Bypass écriture Premium pour RPC SECURITY DEFINER ───────────────────

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
  -- RPCs trusted (redeem / admin_set_premium) posent app.allow_premium_write=true
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

-- ── Redeem : bypass + vérif réelle + cleanup redemptions orphelines ────

-- Utilisateurs bloqués : redemption loguée mais is_premium jamais appliqué
DELETE FROM public.premium_code_redemptions r
USING public.profiles p
WHERE r.user_id = p.id
  AND COALESCE(p.is_premium, false) = FALSE;

CREATE OR REPLACE FUNCTION public.redeem_premium_code(p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code TEXT;
  v_row public.premium_codes%ROWTYPE;
  v_until TIMESTAMPTZ;
  v_name TEXT;
  v_ok BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Connexion requise pour utiliser un code Premium';
  END IF;

  v_code := upper(trim(p_code));
  IF v_code IS NULL OR length(v_code) < 4 THEN
    RAISE EXCEPTION 'Code invalide';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.premium_code_redemptions WHERE user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Vous avez déjà utilisé un code Premium sur ce compte';
  END IF;

  SELECT * INTO v_row
  FROM public.premium_codes
  WHERE code = v_code
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Code introuvable';
  END IF;

  IF NOT v_row.active THEN
    RAISE EXCEPTION 'Ce code n’est plus actif';
  END IF;

  IF v_row.expires_at IS NOT NULL AND v_row.expires_at < NOW() THEN
    RAISE EXCEPTION 'Ce code a expiré';
  END IF;

  IF v_row.use_count >= v_row.max_uses THEN
    RAISE EXCEPTION 'Ce code a déjà été utilisé le nombre maximum de fois';
  END IF;

  SELECT name INTO v_name FROM public.profiles WHERE id = auth.uid();
  IF v_name IS NULL THEN
    RAISE EXCEPTION 'Profil introuvable';
  END IF;

  IF v_row.duration_days IS NULL OR v_row.duration_days <= 0 THEN
    v_until := NULL;
  ELSE
    SELECT
      CASE
        WHEN COALESCE(is_premium, false) AND premium_until IS NOT NULL AND premium_until > NOW()
          THEN premium_until + (v_row.duration_days || ' days')::INTERVAL
        ELSE NOW() + (v_row.duration_days || ' days')::INTERVAL
      END
    INTO v_until
    FROM public.profiles
    WHERE id = auth.uid();
  END IF;

  -- Autoriser l’écriture Premium malgré le trigger protect_*
  PERFORM set_config('app.allow_premium_write', 'true', true);

  UPDATE public.profiles
  SET is_premium = TRUE, premium_until = v_until
  WHERE id = auth.uid();

  SELECT COALESCE(is_premium, false) INTO v_ok
  FROM public.profiles WHERE id = auth.uid();

  IF NOT v_ok THEN
    RAISE EXCEPTION 'Impossible d’activer Premium — contactez le staff';
  END IF;

  INSERT INTO public.preferences (user_name, is_premium)
  VALUES (v_name, TRUE)
  ON CONFLICT (user_name) DO UPDATE
  SET is_premium = TRUE;

  UPDATE public.premium_codes
  SET
    use_count = use_count + 1,
    active = CASE WHEN use_count + 1 >= max_uses THEN FALSE ELSE active END
  WHERE id = v_row.id;

  INSERT INTO public.premium_code_redemptions (code_id, user_id, user_name)
  VALUES (v_row.id, auth.uid(), v_name);

  RETURN jsonb_build_object(
    'ok', TRUE,
    'premium_until', v_until,
    'permanent', v_until IS NULL
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.redeem_premium_code(TEXT) TO authenticated;

-- ── admin_set_premium : case-insensitive + bypass trigger ───────────────

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
  IF NOT public.is_site_admin() THEN
    RAISE EXCEPTION 'Accès refusé : admin requis';
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

-- Recherche profils pour onglet Admin → Profils
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
  IF NOT public.is_site_admin() THEN
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

-- ── Permissions section « premium » ─────────────────────────────────────

INSERT INTO public.permissions (section, action, user_identifier, identifier_type, allowed)
VALUES
  -- view Codes Premium / Profils
  ('premium', 'view', 'guest', 'user_type', FALSE),
  ('premium', 'view', 'authenticated', 'user_type', FALSE),
  ('premium', 'view', 'founder', 'badge', TRUE),
  ('premium', 'view', 'direction', 'badge', TRUE),
  ('premium', 'view', 'master_op', 'badge', TRUE),
  ('premium', 'view', 'moderator', 'badge', FALSE),
  ('premium', 'view', 'vip', 'badge', FALSE),
  -- create_codes (générateur)
  ('premium', 'create_codes', 'guest', 'user_type', FALSE),
  ('premium', 'create_codes', 'authenticated', 'user_type', FALSE),
  ('premium', 'create_codes', 'founder', 'badge', TRUE),
  ('premium', 'create_codes', 'direction', 'badge', TRUE),
  ('premium', 'create_codes', 'master_op', 'badge', TRUE),
  ('premium', 'create_codes', 'moderator', 'badge', FALSE),
  ('premium', 'create_codes', 'vip', 'badge', FALSE),
  -- revoke_codes
  ('premium', 'revoke_codes', 'guest', 'user_type', FALSE),
  ('premium', 'revoke_codes', 'authenticated', 'user_type', FALSE),
  ('premium', 'revoke_codes', 'founder', 'badge', TRUE),
  ('premium', 'revoke_codes', 'direction', 'badge', TRUE),
  ('premium', 'revoke_codes', 'master_op', 'badge', TRUE),
  ('premium', 'revoke_codes', 'moderator', 'badge', FALSE),
  ('premium', 'revoke_codes', 'vip', 'badge', FALSE),
  -- grant_premium (Profils à la volée)
  ('premium', 'grant_premium', 'guest', 'user_type', FALSE),
  ('premium', 'grant_premium', 'authenticated', 'user_type', FALSE),
  ('premium', 'grant_premium', 'founder', 'badge', TRUE),
  ('premium', 'grant_premium', 'direction', 'badge', TRUE),
  ('premium', 'grant_premium', 'master_op', 'badge', TRUE),
  ('premium', 'grant_premium', 'moderator', 'badge', FALSE),
  ('premium', 'grant_premium', 'vip', 'badge', FALSE)
ON CONFLICT DO NOTHING;

-- Si une contrainte unique (section, action, user_identifier, identifier_type) n'existe pas,
-- tenter un upsert manuel pour les rôles clés (éviter doublons via NOT EXISTS)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      ('premium', 'view', 'founder', 'badge', TRUE),
      ('premium', 'view', 'direction', 'badge', TRUE),
      ('premium', 'view', 'master_op', 'badge', TRUE),
      ('premium', 'create_codes', 'founder', 'badge', TRUE),
      ('premium', 'create_codes', 'direction', 'badge', TRUE),
      ('premium', 'create_codes', 'master_op', 'badge', TRUE),
      ('premium', 'revoke_codes', 'founder', 'badge', TRUE),
      ('premium', 'revoke_codes', 'direction', 'badge', TRUE),
      ('premium', 'revoke_codes', 'master_op', 'badge', TRUE),
      ('premium', 'grant_premium', 'founder', 'badge', TRUE),
      ('premium', 'grant_premium', 'direction', 'badge', TRUE),
      ('premium', 'grant_premium', 'master_op', 'badge', TRUE)
    ) AS t(section, action, user_identifier, identifier_type, allowed)
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.permissions p
      WHERE p.section = r.section
        AND p.action = r.action
        AND p.user_identifier = r.user_identifier
        AND p.identifier_type = r.identifier_type
    ) THEN
      INSERT INTO public.permissions (section, action, user_identifier, identifier_type, allowed)
      VALUES (r.section, r.action, r.user_identifier, r.identifier_type, r.allowed);
    END IF;
  END LOOP;
END $$;

COMMENT ON FUNCTION public.redeem_premium_code(TEXT) IS
  'Utilisateur authentifié : échange un code contre Premium (bypass protect trigger)';
COMMENT ON FUNCTION public.admin_set_premium(TEXT, BOOLEAN, TIMESTAMPTZ) IS
  'Staff : accorde / retire Premium par pseudo (case-insensitive)';
COMMENT ON FUNCTION public.admin_search_profiles(TEXT, INTEGER) IS
  'Staff : recherche profils pour onglet Profils Premium';
