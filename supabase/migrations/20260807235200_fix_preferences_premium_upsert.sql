-- Fix: Accorder Premium → « there is no unique or exclusion constraint matching the ON CONFLICT specification »
-- preferences.user_name n'a pas de UNIQUE en prod → ON CONFLICT (user_name) échoue.

-- Dédupliquer user_name (garde la ligne la plus récente)
DELETE FROM public.preferences p
USING public.preferences d
WHERE p.user_name = d.user_name
  AND p.ctid < d.ctid;

-- Ajouter UNIQUE(user_name) si absent
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'preferences'
      AND c.contype IN ('u', 'p')
      AND pg_get_constraintdef(c.oid) ILIKE '%(user_name)%'
  ) THEN
    ALTER TABLE public.preferences
      ADD CONSTRAINT preferences_user_name_key UNIQUE (user_name);
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN unique_violation THEN
    RAISE NOTICE 'preferences.user_name unique non ajoutée (collision restante)';
END;
$$;

-- Upsert sans dépendre de ON CONFLICT
CREATE OR REPLACE FUNCTION public.upsert_preferences_premium(
  p_user_name TEXT,
  p_is_premium BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_user_name IS NULL OR trim(p_user_name) = '' THEN
    RETURN;
  END IF;

  UPDATE public.preferences
  SET is_premium = COALESCE(p_is_premium, false)
  WHERE user_name = p_user_name;

  IF FOUND THEN
    RETURN;
  END IF;

  BEGIN
    INSERT INTO public.preferences (user_name, is_premium)
    VALUES (p_user_name, COALESCE(p_is_premium, false));
  EXCEPTION
    WHEN unique_violation THEN
      UPDATE public.preferences
      SET is_premium = COALESCE(p_is_premium, false)
      WHERE user_name = p_user_name;
  END;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_preferences_premium(TEXT, BOOLEAN) TO authenticated;

-- admin_set_premium : utilise l’upsert sûr
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

  PERFORM public.upsert_preferences_premium(v_name, COALESCE(p_premium, false));

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_premium(TEXT, BOOLEAN, TIMESTAMPTZ) TO authenticated;

-- redeem : même correction (corps aligné sur 20260806220000, seul l’upsert change)
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

  PERFORM set_config('app.allow_premium_write', 'true', true);

  UPDATE public.profiles
  SET is_premium = TRUE, premium_until = v_until
  WHERE id = auth.uid();

  SELECT COALESCE(is_premium, false) INTO v_ok
  FROM public.profiles WHERE id = auth.uid();

  IF NOT v_ok THEN
    RAISE EXCEPTION 'Impossible d’activer Premium — contactez le staff';
  END IF;

  PERFORM public.upsert_preferences_premium(v_name, TRUE);

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

COMMENT ON FUNCTION public.upsert_preferences_premium(TEXT, BOOLEAN) IS
  'Upsert preferences.is_premium sans ON CONFLICT (tolère absence de UNIQUE user_name)';
