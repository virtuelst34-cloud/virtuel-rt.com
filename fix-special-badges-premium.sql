-- Auto: badges spéciaux ⇒ Premium. Appliqué via merge/Supabase Preview.

-- Badges spéciaux (VIP, staff, iridescent…) ⇒ Premium permanent en base.
-- Backfill + sync à chaque UPDATE/INSERT profil.

CREATE OR REPLACE FUNCTION public.profile_qualifies_for_badge_premium(
  p_is_founder BOOLEAN,
  p_is_admin BOOLEAN,
  p_is_direction BOOLEAN,
  p_is_master_op BOOLEAN,
  p_is_iridescent BOOLEAN,
  p_special_badges TEXT[]
)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT
    COALESCE(p_is_founder, false)
    OR COALESCE(p_is_admin, false)
    OR COALESCE(p_is_direction, false)
    OR COALESCE(p_is_master_op, false)
    OR COALESCE(p_is_iridescent, false)
    OR COALESCE(p_special_badges, ARRAY[]::TEXT[]) && ARRAY[
      'vip', 'founder', 'direction', 'master_op', 'moderator', 'iridescent'
    ]::TEXT[];
$$;

-- Intégré dans protect_* : après garde-fous, force Premium si badge spécial
CREATE OR REPLACE FUNCTION public.protect_profile_admin_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.allow_premium_write() THEN
    -- RPC trusted : laisser passer, puis sync badge→premium ci-dessous
    NULL;
  ELSIF NOT public.is_site_admin() THEN
    NEW.is_founder := OLD.is_founder;
    NEW.is_admin := OLD.is_admin;
    NEW.is_direction := OLD.is_direction;
    NEW.is_master_op := OLD.is_master_op;
    NEW.is_iridescent := OLD.is_iridescent;
    NEW.special_badges := OLD.special_badges;
    NEW.is_premium := OLD.is_premium;
    NEW.premium_until := OLD.premium_until;
  END IF;

  -- Badge spécial / staff ⇒ Premium permanent (ne retire jamais Premium si badge enlevé)
  IF public.profile_qualifies_for_badge_premium(
    NEW.is_founder, NEW.is_admin, NEW.is_direction, NEW.is_master_op,
    NEW.is_iridescent, NEW.special_badges
  ) THEN
    NEW.is_premium := TRUE;
    NEW.premium_until := NULL;
  END IF;

  RETURN NEW;
END;
$$;

-- Après écriture : miroir preferences
CREATE OR REPLACE FUNCTION public.sync_preferences_premium_from_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.is_premium IS NOT DISTINCT FROM OLD.is_premium THEN
    RETURN NEW;
  END IF;

  PERFORM set_config('app.allow_premium_write', 'true', true);
  PERFORM public.upsert_preferences_premium(NEW.name, COALESCE(NEW.is_premium, false));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_preferences_premium_from_profile_trigger ON public.profiles;
CREATE TRIGGER sync_preferences_premium_from_profile_trigger
  AFTER INSERT OR UPDATE OF is_premium, name ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_preferences_premium_from_profile();

-- is_premium_user : Premium flag OU badge spécial / staff
CREATE OR REPLACE FUNCTION public.is_premium_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_site_admin()
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND (
          (
            COALESCE(p.is_premium, false) = TRUE
            AND (p.premium_until IS NULL OR p.premium_until > NOW())
          )
          OR public.profile_qualifies_for_badge_premium(
            p.is_founder, p.is_admin, p.is_direction, p.is_master_op,
            p.is_iridescent, p.special_badges
          )
        )
    );
$$;

GRANT EXECUTE ON FUNCTION public.is_premium_user() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.profile_qualifies_for_badge_premium(BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, TEXT[]) TO authenticated;

-- Backfill immédiat
UPDATE public.profiles p
SET
  is_premium = TRUE,
  premium_until = NULL
WHERE public.profile_qualifies_for_badge_premium(
  p.is_founder, p.is_admin, p.is_direction, p.is_master_op,
  p.is_iridescent, p.special_badges
)
AND (
  COALESCE(p.is_premium, false) = FALSE
  OR p.premium_until IS NOT NULL
);

-- Miroir preferences pour les profils concernés
DO $$
DECLARE
  r RECORD;
BEGIN
  PERFORM set_config('app.allow_premium_write', 'true', true);
  FOR r IN
    SELECT name FROM public.profiles
    WHERE COALESCE(is_premium, false) = TRUE
  LOOP
    PERFORM public.upsert_preferences_premium(r.name, TRUE);
  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.profile_qualifies_for_badge_premium(BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, TEXT[]) IS
  'True si le profil a un badge spécial / staff ⇒ doit être Premium';
