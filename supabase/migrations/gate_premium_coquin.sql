-- Premium serveur + garde-fous salons/messages coquin (is_coquin)
-- Source de vérité : profiles.is_premium (staff/fondateur uniquement via is_site_admin)

-- ── Colonnes (idempotent) ──────────────────────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_premium BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.preferences
  ADD COLUMN IF NOT EXISTS is_premium BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.salons
  ADD COLUMN IF NOT EXISTS is_coquin BOOLEAN NOT NULL DEFAULT false;

-- ── Helpers ──────────────────────────────────────────────────────────────

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
  )
  OR public.is_site_admin();
$$;

CREATE OR REPLACE FUNCTION public.can_access_coquin_salon(p_salon_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    CASE
      WHEN p_salon_id IS NULL OR length(trim(p_salon_id)) = 0 THEN TRUE
      WHEN NOT EXISTS (
        SELECT 1 FROM public.salons s
        WHERE s.id = p_salon_id AND COALESCE(s.is_coquin, false) = TRUE
      ) THEN TRUE
      ELSE public.is_premium_user()
    END;
$$;

GRANT EXECUTE ON FUNCTION public.is_premium_user() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_coquin_salon(TEXT) TO anon, authenticated;

-- Empêche l’auto-attribution de is_premium (comme les badges admin)
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
  END IF;
  RETURN NEW;
END;
$$;

-- preferences.is_premium : non-admin ne peut pas s’auto-promouvoir
CREATE OR REPLACE FUNCTION public.protect_preferences_premium()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  profile_premium BOOLEAN;
BEGIN
  IF public.is_site_admin() THEN
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

  -- Aligner sur le profil ; ignorer toute demande client de true sans profil premium
  NEW.is_premium := profile_premium;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_preferences_premium_trigger ON public.preferences;
CREATE TRIGGER protect_preferences_premium_trigger
  BEFORE INSERT OR UPDATE ON public.preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_preferences_premium();

-- RPC admin : accorder / retirer Premium
CREATE OR REPLACE FUNCTION public.admin_set_premium(p_user_name TEXT, p_premium BOOLEAN)
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
  SET is_premium = COALESCE(p_premium, false)
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

GRANT EXECUTE ON FUNCTION public.admin_set_premium(TEXT, BOOLEAN) TO authenticated;

-- ── Salons : lecture coquin réservée Premium ───────────────────────────

DROP POLICY IF EXISTS "Anyone can read salons" ON public.salons;
DROP POLICY IF EXISTS "Read non-coquin or premium salons" ON public.salons;

CREATE POLICY "Read non-coquin or premium salons"
ON public.salons
FOR SELECT
TO public
USING (
  COALESCE(is_coquin, false) = FALSE
  OR public.is_premium_user()
);

-- Catégories coquin : visibles (upsell) ; le contenu salon reste filtré ci-dessus
-- (pas de changement salon_categories)

-- ── Messages : pas de lecture / écriture dans un salon coquin sans Premium ─

DROP POLICY IF EXISTS "Anyone can read messages" ON public.messages;
DROP POLICY IF EXISTS "Read messages with coquin gate" ON public.messages;
CREATE POLICY "Read messages with coquin gate"
ON public.messages
FOR SELECT
TO public
USING (public.can_access_coquin_salon(salon_id));

DROP POLICY IF EXISTS "Authenticated can insert messages" ON public.messages;
DROP POLICY IF EXISTS "Insert messages with coquin gate" ON public.messages;
CREATE POLICY "Insert messages with coquin gate"
ON public.messages
FOR INSERT
TO authenticated, anon
WITH CHECK (public.can_access_coquin_salon(salon_id));

DROP POLICY IF EXISTS "Authenticated can update messages" ON public.messages;
DROP POLICY IF EXISTS "Update messages with coquin gate" ON public.messages;
CREATE POLICY "Update messages with coquin gate"
ON public.messages
FOR UPDATE
TO authenticated, anon
USING (public.can_access_coquin_salon(salon_id))
WITH CHECK (public.can_access_coquin_salon(salon_id));

COMMENT ON FUNCTION public.is_premium_user() IS 'True si profiles.is_premium ou admin site';
COMMENT ON FUNCTION public.admin_set_premium(TEXT, BOOLEAN) IS 'Staff only: grant/revoke Premium by profile name';
