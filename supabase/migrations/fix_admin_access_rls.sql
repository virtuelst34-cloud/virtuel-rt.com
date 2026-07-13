-- Corrige les politiques RLS admin (ré-exécutable sans erreur)
-- + colonnes admin manquantes + protection des badges + droits Createur

-- Colonnes admin sur profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_founder BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_direction BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_master_op BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_iridescent BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS special_badges TEXT[] DEFAULT '{}';

CREATE OR REPLACE FUNCTION public.is_site_admin()
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
      AND (
        COALESCE(is_founder, false) = TRUE
        OR COALESCE(is_admin, false) = TRUE
        OR COALESCE(is_direction, false) = TRUE
        OR COALESCE(is_master_op, false) = TRUE
        OR 'founder' = ANY(COALESCE(special_badges, ARRAY[]::TEXT[]))
        OR 'direction' = ANY(COALESCE(special_badges, ARRAY[]::TEXT[]))
        OR 'master_op' = ANY(COALESCE(special_badges, ARRAY[]::TEXT[]))
      )
  );
$$;

-- Empêche les utilisateurs de s'auto-attribuer des badges admin
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
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_admin_fields_trigger ON public.profiles;
CREATE TRIGGER protect_profile_admin_fields_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_admin_fields();

DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.is_site_admin())
  WITH CHECK (public.is_site_admin());

-- global_settings
DROP POLICY IF EXISTS "Founders can update global settings" ON public.global_settings;
DROP POLICY IF EXISTS "Founders can insert global settings" ON public.global_settings;
DROP POLICY IF EXISTS "Admins can update global settings" ON public.global_settings;
DROP POLICY IF EXISTS "Admins can insert global settings" ON public.global_settings;
CREATE POLICY "Admins can update global settings" ON public.global_settings
  FOR UPDATE TO authenticated USING (public.is_site_admin());
CREATE POLICY "Admins can insert global settings" ON public.global_settings
  FOR INSERT TO authenticated WITH CHECK (public.is_site_admin());

-- security_settings
DROP POLICY IF EXISTS "Founders can update security settings" ON public.security_settings;
DROP POLICY IF EXISTS "Founders can insert security settings" ON public.security_settings;
DROP POLICY IF EXISTS "Admins can update security settings" ON public.security_settings;
DROP POLICY IF EXISTS "Admins can insert security settings" ON public.security_settings;
CREATE POLICY "Admins can update security settings" ON public.security_settings
  FOR UPDATE TO authenticated USING (public.is_site_admin());
CREATE POLICY "Admins can insert security settings" ON public.security_settings
  FOR INSERT TO authenticated WITH CHECK (public.is_site_admin());

-- message_settings
DROP POLICY IF EXISTS "Founders can update message settings" ON public.message_settings;
DROP POLICY IF EXISTS "Founders can insert message settings" ON public.message_settings;
DROP POLICY IF EXISTS "Admins can update message settings" ON public.message_settings;
DROP POLICY IF EXISTS "Admins can insert message settings" ON public.message_settings;
CREATE POLICY "Admins can update message settings" ON public.message_settings
  FOR UPDATE TO authenticated USING (public.is_site_admin());
CREATE POLICY "Admins can insert message settings" ON public.message_settings
  FOR INSERT TO authenticated WITH CHECK (public.is_site_admin());

-- notification_settings
DROP POLICY IF EXISTS "Founders can update notification settings" ON public.notification_settings;
DROP POLICY IF EXISTS "Founders can insert notification settings" ON public.notification_settings;
DROP POLICY IF EXISTS "Admins can update notification settings" ON public.notification_settings;
DROP POLICY IF EXISTS "Admins can insert notification settings" ON public.notification_settings;
CREATE POLICY "Admins can update notification settings" ON public.notification_settings
  FOR UPDATE TO authenticated USING (public.is_site_admin());
CREATE POLICY "Admins can insert notification settings" ON public.notification_settings
  FOR INSERT TO authenticated WITH CHECK (public.is_site_admin());

-- content_moderation_settings
DROP POLICY IF EXISTS "Founders can update content moderation settings" ON public.content_moderation_settings;
DROP POLICY IF EXISTS "Founders can insert content moderation settings" ON public.content_moderation_settings;
DROP POLICY IF EXISTS "Admins can update content moderation settings" ON public.content_moderation_settings;
DROP POLICY IF EXISTS "Admins can insert content moderation settings" ON public.content_moderation_settings;
CREATE POLICY "Admins can update content moderation settings" ON public.content_moderation_settings
  FOR UPDATE TO authenticated USING (public.is_site_admin());
CREATE POLICY "Admins can insert content moderation settings" ON public.content_moderation_settings
  FOR INSERT TO authenticated WITH CHECK (public.is_site_admin());

-- logs_audit_settings
DROP POLICY IF EXISTS "Founders can update logs audit settings" ON public.logs_audit_settings;
DROP POLICY IF EXISTS "Founders can insert logs audit settings" ON public.logs_audit_settings;
DROP POLICY IF EXISTS "Admins can update logs audit settings" ON public.logs_audit_settings;
DROP POLICY IF EXISTS "Admins can insert logs audit settings" ON public.logs_audit_settings;
CREATE POLICY "Admins can update logs audit settings" ON public.logs_audit_settings
  FOR UPDATE TO authenticated USING (public.is_site_admin());
CREATE POLICY "Admins can insert logs audit settings" ON public.logs_audit_settings
  FOR INSERT TO authenticated WITH CHECK (public.is_site_admin());

-- permissions
DROP POLICY IF EXISTS "Founders can manage permissions" ON public.permissions;
DROP POLICY IF EXISTS "Admins can manage permissions" ON public.permissions;
CREATE POLICY "Admins can manage permissions" ON public.permissions
  FOR ALL TO authenticated
  USING (public.is_site_admin())
  WITH CHECK (public.is_site_admin());

-- Permissions manquantes pour sections messages, sécurité, contenu, logs
INSERT INTO public.permissions (section, action, user_identifier, identifier_type, allowed)
SELECT v.section, v.action, v.user_identifier, v.identifier_type, v.allowed
FROM (VALUES
  ('messages', 'view_settings', 'guest', 'user_type', false),
  ('messages', 'view_settings', 'authenticated', 'user_type', false),
  ('messages', 'edit_settings', 'founder', 'badge', true),
  ('messages', 'edit_settings', 'direction', 'badge', true),
  ('messages', 'edit_settings', 'master_op', 'badge', true),
  ('messages', 'edit_limits', 'founder', 'badge', true),
  ('messages', 'edit_limits', 'direction', 'badge', true),
  ('security', 'view_settings', 'founder', 'badge', true),
  ('security', 'view_settings', 'direction', 'badge', true),
  ('security', 'edit_settings', 'founder', 'badge', true),
  ('security', 'edit_settings', 'direction', 'badge', true),
  ('security', 'manage_bans', 'founder', 'badge', true),
  ('security', 'manage_bans', 'direction', 'badge', true),
  ('security', 'view_logs', 'founder', 'badge', true),
  ('security', 'view_logs', 'direction', 'badge', true),
  ('content', 'view_settings', 'founder', 'badge', true),
  ('content', 'view_settings', 'direction', 'badge', true),
  ('content', 'edit_settings', 'founder', 'badge', true),
  ('content', 'edit_settings', 'direction', 'badge', true),
  ('content', 'manage_filters', 'founder', 'badge', true),
  ('content', 'manage_filters', 'direction', 'badge', true),
  ('content', 'review_queue', 'founder', 'badge', true),
  ('content', 'review_queue', 'moderator', 'badge', true),
  ('logs', 'view_logs', 'founder', 'badge', true),
  ('logs', 'view_logs', 'direction', 'badge', true),
  ('logs', 'export_logs', 'founder', 'badge', true),
  ('logs', 'manage_settings', 'founder', 'badge', true),
  ('logs', 'manage_settings', 'direction', 'badge', true)
) AS v(section, action, user_identifier, identifier_type, allowed)
WHERE NOT EXISTS (
  SELECT 1 FROM public.permissions p
  WHERE p.section = v.section
    AND p.action = v.action
    AND p.user_identifier = v.user_identifier
);

-- Droits admin pour Createur
UPDATE public.profiles
SET
  is_admin = true,
  is_founder = true,
  special_badges = ARRAY['founder']::TEXT[]
WHERE name = 'Createur';

-- Aligner les colonnes booléennes avec special_badges (tous les profils)
UPDATE public.profiles
SET
  is_founder = COALESCE(is_founder, false) OR 'founder' = ANY(COALESCE(special_badges, ARRAY[]::TEXT[])),
  is_direction = COALESCE(is_direction, false) OR 'direction' = ANY(COALESCE(special_badges, ARRAY[]::TEXT[])),
  is_master_op = COALESCE(is_master_op, false) OR 'master_op' = ANY(COALESCE(special_badges, ARRAY[]::TEXT[])),
  is_iridescent = COALESCE(is_iridescent, false) OR 'iridescent' = ANY(COALESCE(special_badges, ARRAY[]::TEXT[]))
WHERE
  COALESCE(is_founder, false) <> ('founder' = ANY(COALESCE(special_badges, ARRAY[]::TEXT[])))
  OR COALESCE(is_direction, false) <> ('direction' = ANY(COALESCE(special_badges, ARRAY[]::TEXT[])))
  OR COALESCE(is_master_op, false) <> ('master_op' = ANY(COALESCE(special_badges, ARRAY[]::TEXT[])))
  OR COALESCE(is_iridescent, false) <> ('iridescent' = ANY(COALESCE(special_badges, ARRAY[]::TEXT[])));

-- Vérification (doit retourner is_site_admin = true quand connecté en tant que Createur)
SELECT
  name,
  is_admin,
  is_founder,
  is_direction,
  is_master_op,
  special_badges
FROM public.profiles
WHERE name = 'Createur';
