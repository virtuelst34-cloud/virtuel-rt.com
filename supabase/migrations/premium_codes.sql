-- Codes Premium + expiry optionnelle (sans paiement / Stripe)
-- Compatible avec gate_premium_coquin.sql (is_premium_user, admin_set_premium, RLS coquin)

-- ── Colonnes ─────────────────────────────────────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS premium_until TIMESTAMPTZ;

COMMENT ON COLUMN public.profiles.premium_until IS
  'Fin d’abonnement Premium ; NULL = permanent tant que is_premium = true';

-- ── Table codes ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.premium_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  duration_days INTEGER, -- NULL = permanent
  max_uses INTEGER NOT NULL DEFAULT 1,
  use_count INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  expires_at TIMESTAMPTZ, -- expiration du code lui-même
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT premium_codes_code_unique UNIQUE (code),
  CONSTRAINT premium_codes_max_uses_pos CHECK (max_uses > 0),
  CONSTRAINT premium_codes_use_count_nonneg CHECK (use_count >= 0)
);

CREATE INDEX IF NOT EXISTS idx_premium_codes_active ON public.premium_codes (active) WHERE active = TRUE;

ALTER TABLE public.premium_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage premium codes" ON public.premium_codes;
CREATE POLICY "Admins manage premium codes"
ON public.premium_codes
FOR ALL
TO authenticated
USING (public.is_site_admin())
WITH CHECK (public.is_site_admin());

-- Lecture limitée : personne ne liste les codes hors admin (redeem via RPC)

-- ── is_premium_user : respect premium_until ──────────────────────────────

CREATE OR REPLACE FUNCTION public.is_premium_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND COALESCE(is_premium, false) = TRUE
      AND (premium_until IS NULL OR premium_until > NOW())
  )
  OR public.is_site_admin();
$$;

GRANT EXECUTE ON FUNCTION public.is_premium_user() TO anon, authenticated;

-- ── admin_set_premium : + premium_until optionnel ────────────────────────

DROP FUNCTION IF EXISTS public.admin_set_premium(TEXT, BOOLEAN);
DROP FUNCTION IF EXISTS public.admin_set_premium(TEXT, BOOLEAN, TIMESTAMPTZ);

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
BEGIN
  IF NOT public.is_site_admin() THEN
    RAISE EXCEPTION 'Accès refusé : admin requis';
  END IF;

  UPDATE public.profiles
  SET
    is_premium = COALESCE(p_premium, false),
    premium_until = CASE
      WHEN COALESCE(p_premium, false) = FALSE THEN NULL
      ELSE p_premium_until
    END
  WHERE name = p_user_name;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  INSERT INTO public.preferences (user_name, is_premium)
  VALUES (p_user_name, COALESCE(p_premium, false))
  ON CONFLICT (user_name) DO UPDATE
  SET is_premium = EXCLUDED.is_premium;

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_premium(TEXT, BOOLEAN, TIMESTAMPTZ) TO authenticated;

-- Empêcher auto-écriture de premium_until
CREATE OR REPLACE FUNCTION public.protect_profile_admin_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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

-- ── Création de code (admin) ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.admin_create_premium_code(
  p_code TEXT,
  p_duration_days INTEGER DEFAULT NULL,
  p_max_uses INTEGER DEFAULT 1,
  p_expires_at TIMESTAMPTZ DEFAULT NULL,
  p_note TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_code TEXT;
BEGIN
  IF NOT public.is_site_admin() THEN
    RAISE EXCEPTION 'Accès refusé : admin requis';
  END IF;

  v_code := upper(trim(p_code));
  IF v_code IS NULL OR length(v_code) < 4 THEN
    RAISE EXCEPTION 'Code trop court (min. 4 caractères)';
  END IF;

  INSERT INTO public.premium_codes (code, duration_days, max_uses, expires_at, note, created_by)
  VALUES (
    v_code,
    p_duration_days,
    GREATEST(COALESCE(p_max_uses, 1), 1),
    p_expires_at,
    NULLIF(trim(COALESCE(p_note, '')), ''),
    auth.uid()
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_create_premium_code(TEXT, INTEGER, INTEGER, TIMESTAMPTZ, TEXT) TO authenticated;

-- ── Liste codes (admin) ──────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.admin_list_premium_codes()
RETURNS TABLE (
  id UUID,
  code TEXT,
  duration_days INTEGER,
  max_uses INTEGER,
  use_count INTEGER,
  active BOOLEAN,
  expires_at TIMESTAMPTZ,
  note TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_site_admin() THEN
    RAISE EXCEPTION 'Accès refusé : admin requis';
  END IF;

  RETURN QUERY
  SELECT
    c.id, c.code, c.duration_days, c.max_uses, c.use_count,
    c.active, c.expires_at, c.note, c.created_at
  FROM public.premium_codes c
  ORDER BY c.created_at DESC
  LIMIT 100;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_premium_codes() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_deactivate_premium_code(p_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_site_admin() THEN
    RAISE EXCEPTION 'Accès refusé : admin requis';
  END IF;

  UPDATE public.premium_codes SET active = FALSE WHERE id = p_id;
  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_deactivate_premium_code(UUID) TO authenticated;

-- ── Redeem (utilisateur authentifié) ─────────────────────────────────────

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
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Connexion requise pour utiliser un code Premium';
  END IF;

  v_code := upper(trim(p_code));
  IF v_code IS NULL OR length(v_code) < 4 THEN
    RAISE EXCEPTION 'Code invalide';
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
    v_until := NULL; -- permanent
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

  UPDATE public.profiles
  SET is_premium = TRUE, premium_until = v_until
  WHERE id = auth.uid();

  INSERT INTO public.preferences (user_name, is_premium)
  VALUES (v_name, TRUE)
  ON CONFLICT (user_name) DO UPDATE
  SET is_premium = TRUE;

  UPDATE public.premium_codes
  SET
    use_count = use_count + 1,
    active = CASE WHEN use_count + 1 >= max_uses THEN FALSE ELSE active END
  WHERE id = v_row.id;

  RETURN jsonb_build_object(
    'ok', TRUE,
    'premium_until', v_until,
    'permanent', v_until IS NULL
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.redeem_premium_code(TEXT) TO authenticated;

COMMENT ON FUNCTION public.redeem_premium_code(TEXT) IS 'Utilisateur : échange un code contre Premium (durée ou permanent)';
COMMENT ON FUNCTION public.admin_create_premium_code IS 'Staff : génère un code Premium';

-- ── Salon du moment (épingle staff, sync tous clients) ───────────────────

ALTER TABLE public.global_settings
  ADD COLUMN IF NOT EXISTS featured_salon_id TEXT;

COMMENT ON COLUMN public.global_settings.featured_salon_id IS 'Salon du moment épinglé par le staff (null = auto)';
