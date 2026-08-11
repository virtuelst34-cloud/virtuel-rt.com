-- Synchronise is_founder / special_badges + corrige les profils désynchronisés
-- Ré-exécutable sans erreur — à lancer dans Supabase SQL Editor

-- 1) Aligner toutes les colonnes booléennes avec special_badges
UPDATE public.profiles
SET
  is_founder = 'founder' = ANY(COALESCE(special_badges, ARRAY[]::TEXT[])),
  is_direction = 'direction' = ANY(COALESCE(special_badges, ARRAY[]::TEXT[])),
  is_master_op = 'master_op' = ANY(COALESCE(special_badges, ARRAY[]::TEXT[])),
  is_iridescent = 'iridescent' = ANY(COALESCE(special_badges, ARRAY[]::TEXT[]))
WHERE
  COALESCE(is_founder, false) <> ('founder' = ANY(COALESCE(special_badges, ARRAY[]::TEXT[])))
  OR COALESCE(is_direction, false) <> ('direction' = ANY(COALESCE(special_badges, ARRAY[]::TEXT[])))
  OR COALESCE(is_master_op, false) <> ('master_op' = ANY(COALESCE(special_badges, ARRAY[]::TEXT[])))
  OR COALESCE(is_iridescent, false) <> ('iridescent' = ANY(COALESCE(special_badges, ARRAY[]::TEXT[])));

-- 2) Createur : droits fondateur complets
UPDATE public.profiles
SET
  is_admin = true,
  is_founder = true,
  special_badges = ARRAY['founder']::TEXT[]
WHERE name = 'Createur';

-- 3) Trigger : les booléens suivent toujours special_badges (même à la connexion/déconnexion)
CREATE OR REPLACE FUNCTION public.sync_profile_badge_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.is_founder := 'founder' = ANY(COALESCE(NEW.special_badges, ARRAY[]::TEXT[]));
  NEW.is_direction := 'direction' = ANY(COALESCE(NEW.special_badges, ARRAY[]::TEXT[]));
  NEW.is_master_op := 'master_op' = ANY(COALESCE(NEW.special_badges, ARRAY[]::TEXT[]));
  NEW.is_iridescent := 'iridescent' = ANY(COALESCE(NEW.special_badges, ARRAY[]::TEXT[]));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_profile_badge_columns_trigger ON public.profiles;
CREATE TRIGGER sync_profile_badge_columns_trigger
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_badge_columns();

-- 4) Protection : seuls les admins peuvent modifier special_badges / is_admin
CREATE OR REPLACE FUNCTION public.protect_profile_admin_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_site_admin() THEN
    NEW.special_badges := OLD.special_badges;
    NEW.is_admin := OLD.is_admin;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_admin_fields_trigger ON public.profiles;
CREATE TRIGGER protect_profile_admin_fields_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_admin_fields();

-- Vérification Createur
SELECT name, is_admin, is_founder, is_direction, is_master_op, special_badges
FROM public.profiles
WHERE name = 'Createur';
