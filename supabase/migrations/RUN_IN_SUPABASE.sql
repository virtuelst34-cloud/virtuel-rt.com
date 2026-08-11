-- ============================================================
-- VIRTUEL-RT — Script complet à coller dans Supabase SQL Editor
-- Ré-exécutable sans erreur. Ordre : colonnes → fonctions → RLS → données
-- ============================================================

-- ── 1. Colonnes admin sur profiles ──────────────────────────
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_founder BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_direction BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_master_op BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_iridescent BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS special_badges TEXT[] DEFAULT '{}';

-- ── 2. Fonction is_site_admin ───────────────────────────────
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

-- ── 3. Trigger sync : is_founder suit special_badges ────────
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

-- ── 4. Trigger protect : seuls admins modifient badges ──────
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

-- ── 5. RLS profiles : admins peuvent modifier les profils ───
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.is_site_admin())
  WITH CHECK (public.is_site_admin());

-- ── 6. RLS paramètres admin (global, security, messages…) ───
DROP POLICY IF EXISTS "Founders can update global settings" ON public.global_settings;
DROP POLICY IF EXISTS "Founders can insert global settings" ON public.global_settings;
DROP POLICY IF EXISTS "Admins can update global settings" ON public.global_settings;
DROP POLICY IF EXISTS "Admins can insert global settings" ON public.global_settings;
CREATE POLICY "Admins can update global settings" ON public.global_settings
  FOR UPDATE TO authenticated USING (public.is_site_admin());
CREATE POLICY "Admins can insert global settings" ON public.global_settings
  FOR INSERT TO authenticated WITH CHECK (public.is_site_admin());

DROP POLICY IF EXISTS "Founders can update security settings" ON public.security_settings;
DROP POLICY IF EXISTS "Founders can insert security settings" ON public.security_settings;
DROP POLICY IF EXISTS "Admins can update security settings" ON public.security_settings;
DROP POLICY IF EXISTS "Admins can insert security settings" ON public.security_settings;
CREATE POLICY "Admins can update security settings" ON public.security_settings
  FOR UPDATE TO authenticated USING (public.is_site_admin());
CREATE POLICY "Admins can insert security settings" ON public.security_settings
  FOR INSERT TO authenticated WITH CHECK (public.is_site_admin());

DROP POLICY IF EXISTS "Founders can update message settings" ON public.message_settings;
DROP POLICY IF EXISTS "Founders can insert message settings" ON public.message_settings;
DROP POLICY IF EXISTS "Admins can update message settings" ON public.message_settings;
DROP POLICY IF EXISTS "Admins can insert message settings" ON public.message_settings;
CREATE POLICY "Admins can update message settings" ON public.message_settings
  FOR UPDATE TO authenticated USING (public.is_site_admin());
CREATE POLICY "Admins can insert message settings" ON public.message_settings
  FOR INSERT TO authenticated WITH CHECK (public.is_site_admin());

DROP POLICY IF EXISTS "Founders can update notification settings" ON public.notification_settings;
DROP POLICY IF EXISTS "Founders can insert notification settings" ON public.notification_settings;
DROP POLICY IF EXISTS "Admins can update notification settings" ON public.notification_settings;
DROP POLICY IF EXISTS "Admins can insert notification settings" ON public.notification_settings;
CREATE POLICY "Admins can update notification settings" ON public.notification_settings
  FOR UPDATE TO authenticated USING (public.is_site_admin());
CREATE POLICY "Admins can insert notification settings" ON public.notification_settings
  FOR INSERT TO authenticated WITH CHECK (public.is_site_admin());

DROP POLICY IF EXISTS "Founders can update content moderation settings" ON public.content_moderation_settings;
DROP POLICY IF EXISTS "Founders can insert content moderation settings" ON public.content_moderation_settings;
DROP POLICY IF EXISTS "Admins can update content moderation settings" ON public.content_moderation_settings;
DROP POLICY IF EXISTS "Admins can insert content moderation settings" ON public.content_moderation_settings;
CREATE POLICY "Admins can update content moderation settings" ON public.content_moderation_settings
  FOR UPDATE TO authenticated USING (public.is_site_admin());
CREATE POLICY "Admins can insert content moderation settings" ON public.content_moderation_settings
  FOR INSERT TO authenticated WITH CHECK (public.is_site_admin());

DROP POLICY IF EXISTS "Founders can update logs audit settings" ON public.logs_audit_settings;
DROP POLICY IF EXISTS "Founders can insert logs audit settings" ON public.logs_audit_settings;
DROP POLICY IF EXISTS "Admins can update logs audit settings" ON public.logs_audit_settings;
DROP POLICY IF EXISTS "Admins can insert logs audit settings" ON public.logs_audit_settings;
CREATE POLICY "Admins can update logs audit settings" ON public.logs_audit_settings
  FOR UPDATE TO authenticated USING (public.is_site_admin());
CREATE POLICY "Admins can insert logs audit settings" ON public.logs_audit_settings
  FOR INSERT TO authenticated WITH CHECK (public.is_site_admin());

-- ── 7. RLS permissions ──────────────────────────────────────
DROP POLICY IF EXISTS "Founders can manage permissions" ON public.permissions;
DROP POLICY IF EXISTS "Admins can manage permissions" ON public.permissions;
CREATE POLICY "Admins can manage permissions" ON public.permissions
  FOR ALL TO authenticated
  USING (public.is_site_admin())
  WITH CHECK (public.is_site_admin());

-- ── 8. Permissions manquantes (sections admin) ──────────────
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

-- ── 9. Droits Createur ──────────────────────────────────────
UPDATE public.profiles
SET
  is_admin = true,
  is_founder = true,
  special_badges = ARRAY['founder']::TEXT[]
WHERE name = 'Createur';

-- ── 10. Resync tous les profils ─────────────────────────────
UPDATE public.profiles
SET
  is_founder = 'founder' = ANY(COALESCE(special_badges, ARRAY[]::TEXT[])),
  is_direction = 'direction' = ANY(COALESCE(special_badges, ARRAY[]::TEXT[])),
  is_master_op = 'master_op' = ANY(COALESCE(special_badges, ARRAY[]::TEXT[])),
  is_iridescent = 'iridescent' = ANY(COALESCE(special_badges, ARRAY[]::TEXT[]));

-- ── 11. Messages privés (sender_id / receiver_id = pseudos) ─
CREATE OR REPLACE FUNCTION public.set_guest_session(p_token TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_token IS NULL OR length(trim(p_token)) = 0 THEN
    PERFORM set_config('app.guest_token', '', true);
    RETURN;
  END IF;
  PERFORM set_config('app.guest_token', trim(p_token), true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_guest_session(TEXT) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.current_guest_name()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT guest_name
  FROM public.guest_sessions
  WHERE session_token = NULLIF(current_setting('app.guest_token', true), '')
    AND expires_at > NOW()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.current_actor_name()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT name FROM public.profiles WHERE id = auth.uid()),
    public.current_guest_name()
  );
$$;

DROP POLICY IF EXISTS "Users can read their own messages" ON public.direct_messages;
DROP POLICY IF EXISTS "Users can send messages" ON public.direct_messages;
DROP POLICY IF EXISTS "Users can update read status" ON public.direct_messages;
DROP POLICY IF EXISTS "Actors can read their own DMs" ON public.direct_messages;
DROP POLICY IF EXISTS "Actors can send DMs" ON public.direct_messages;
DROP POLICY IF EXISTS "Actors can mark DMs read" ON public.direct_messages;

CREATE POLICY "Actors can read their own DMs"
  ON public.direct_messages FOR SELECT TO authenticated, anon
  USING (public.current_actor_name() IN (sender_id, receiver_id));

CREATE POLICY "Actors can send DMs"
  ON public.direct_messages FOR INSERT TO authenticated, anon
  WITH CHECK (
    public.current_actor_name() IS NOT NULL
    AND public.current_actor_name() = sender_id
    AND sender_id <> receiver_id
  );

CREATE POLICY "Actors can mark DMs read"
  ON public.direct_messages FOR UPDATE TO authenticated, anon
  USING (public.current_actor_name() = receiver_id)
  WITH CHECK (public.current_actor_name() = receiver_id);

-- ── 12. Vérifications ───────────────────────────────────────
SELECT 'Createur' AS check_label, name, is_admin, is_founder, special_badges
FROM public.profiles WHERE name = 'Createur';

SELECT 'Permissions count' AS check_label, COUNT(*) AS total
FROM public.permissions;
