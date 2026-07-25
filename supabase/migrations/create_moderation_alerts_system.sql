-- Système d'alertes de modération + espace staff (Virtuel-RT)
-- Préférences téléphone, file d'alertes, journal, staff_messages, permissions

-- =============================================================================
-- 1. Profils : téléphone + préférences d'alerte
-- =============================================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone_number TEXT,
  ADD COLUMN IF NOT EXISTS phone_consent BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notify_mod_app BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_mod_email BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_mod_sms BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.phone_number IS 'Numéro optionnel pour alertes SMS de modération/sécurité';
COMMENT ON COLUMN public.profiles.phone_consent IS 'Consentement explicite pour SMS d''alerte';

-- =============================================================================
-- 2. is_staff() — fondateur, admin, direction, master_op, modérateur
-- =============================================================================
CREATE OR REPLACE FUNCTION public.is_staff()
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
        OR 'moderator' = ANY(COALESCE(special_badges, ARRAY[]::TEXT[]))
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_staff() TO authenticated, anon;

-- =============================================================================
-- 3. Paramètres globaux des alertes de modération
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.moderation_alert_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enable_app_alerts BOOLEAN NOT NULL DEFAULT true,
  enable_email_alerts BOOLEAN NOT NULL DEFAULT true,
  enable_sms_alerts BOOLEAN NOT NULL DEFAULT false,
  auto_notify_on_report BOOLEAN NOT NULL DEFAULT true,
  auto_notify_on_ban BOOLEAN NOT NULL DEFAULT true,
  auto_notify_on_mute BOOLEAN NOT NULL DEFAULT false,
  auto_notify_on_content_flag BOOLEAN NOT NULL DEFAULT true,
  auto_notify_on_appeal BOOLEAN NOT NULL DEFAULT true,
  recipient_roles TEXT[] NOT NULL DEFAULT ARRAY['founder', 'direction', 'master_op', 'moderator'],
  alert_cooldown_seconds INTEGER NOT NULL DEFAULT 30,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.moderation_alert_settings (id)
SELECT gen_random_uuid()
WHERE NOT EXISTS (SELECT 1 FROM public.moderation_alert_settings LIMIT 1);

ALTER TABLE public.moderation_alert_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can read moderation alert settings" ON public.moderation_alert_settings;
DROP POLICY IF EXISTS "Admins can update moderation alert settings" ON public.moderation_alert_settings;
DROP POLICY IF EXISTS "Admins can insert moderation alert settings" ON public.moderation_alert_settings;

CREATE POLICY "Staff can read moderation alert settings"
  ON public.moderation_alert_settings FOR SELECT TO authenticated
  USING (public.is_staff());

CREATE POLICY "Admins can update moderation alert settings"
  ON public.moderation_alert_settings FOR UPDATE TO authenticated
  USING (public.is_site_admin())
  WITH CHECK (public.is_site_admin());

CREATE POLICY "Admins can insert moderation alert settings"
  ON public.moderation_alert_settings FOR INSERT TO authenticated
  WITH CHECK (public.is_site_admin());

-- =============================================================================
-- 4. File d'attente + journal des alertes
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.moderation_alert_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL CHECK (event_type IN (
    'new_report', 'ban', 'unban', 'mute', 'unmute', 'content_flag', 'appeal', 'test'
  )),
  channel TEXT NOT NULL CHECK (channel IN ('app', 'email', 'sms')),
  recipient_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  recipient_email TEXT,
  recipient_phone TEXT,
  recipient_name TEXT,
  subject TEXT,
  body TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'processing', 'sent', 'failed', 'skipped', 'provider_missing'
  )),
  error_message TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_mod_alert_queue_status ON public.moderation_alert_queue(status, created_at);
CREATE INDEX IF NOT EXISTS idx_mod_alert_queue_recipient ON public.moderation_alert_queue(recipient_user_id);

CREATE TABLE IF NOT EXISTS public.moderation_alert_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  channels TEXT[] NOT NULL DEFAULT '{}',
  message TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  recipients_count INTEGER NOT NULL DEFAULT 0,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mod_alert_log_created ON public.moderation_alert_log(created_at DESC);

ALTER TABLE public.moderation_alert_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_alert_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can read alert queue" ON public.moderation_alert_queue;
DROP POLICY IF EXISTS "Staff can update alert queue" ON public.moderation_alert_queue;
DROP POLICY IF EXISTS "Staff can insert alert queue" ON public.moderation_alert_queue;
DROP POLICY IF EXISTS "Staff can read alert log" ON public.moderation_alert_log;
DROP POLICY IF EXISTS "Staff can insert alert log" ON public.moderation_alert_log;

CREATE POLICY "Staff can read alert queue"
  ON public.moderation_alert_queue FOR SELECT TO authenticated
  USING (public.is_staff());

CREATE POLICY "Staff can update alert queue"
  ON public.moderation_alert_queue FOR UPDATE TO authenticated
  USING (public.is_site_admin())
  WITH CHECK (public.is_site_admin());

CREATE POLICY "Staff can insert alert queue"
  ON public.moderation_alert_queue FOR INSERT TO authenticated
  WITH CHECK (public.is_staff());

CREATE POLICY "Staff can read alert log"
  ON public.moderation_alert_log FOR SELECT TO authenticated
  USING (public.is_staff());

CREATE POLICY "Staff can insert alert log"
  ON public.moderation_alert_log FOR INSERT TO authenticated
  WITH CHECK (public.is_staff());

-- =============================================================================
-- 5. Signalements — statut de traitement
-- =============================================================================
ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'resolved', 'dismissed')),
  ADD COLUMN IF NOT EXISTS handled_by TEXT,
  ADD COLUMN IF NOT EXISTS handled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS staff_notes TEXT;

CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports(status, created_at DESC);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can insert reports" ON public.reports;
DROP POLICY IF EXISTS "Staff can read reports" ON public.reports;
DROP POLICY IF EXISTS "Staff can update reports" ON public.reports;

CREATE POLICY "Anyone can insert reports"
  ON public.reports FOR INSERT TO authenticated, anon
  WITH CHECK (true);

CREATE POLICY "Staff can read reports"
  ON public.reports FOR SELECT TO authenticated
  USING (public.is_staff());

CREATE POLICY "Staff can update reports"
  ON public.reports FOR UPDATE TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- =============================================================================
-- 6. Notifications — type moderation_alert
-- =============================================================================
DO $$
BEGIN
  ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
  ALTER TABLE public.notifications
    ADD CONSTRAINT notifications_type_check
    CHECK (type IN (
      'dm', 'friend_request', 'friend_accepted', 'system', 'mention', 'moderation_alert'
    ));
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'notifications type check: %', SQLERRM;
END $$;

-- =============================================================================
-- 7. Messages staff (salon interne)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.staff_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staff_messages_created ON public.staff_messages(created_at DESC);

ALTER TABLE public.staff_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can read staff messages" ON public.staff_messages;
DROP POLICY IF EXISTS "Staff can insert staff messages" ON public.staff_messages;
DROP POLICY IF EXISTS "Staff can delete own staff messages" ON public.staff_messages;

CREATE POLICY "Staff can read staff messages"
  ON public.staff_messages FOR SELECT TO authenticated
  USING (public.is_staff());

CREATE POLICY "Staff can insert staff messages"
  ON public.staff_messages FOR INSERT TO authenticated
  WITH CHECK (
    public.is_staff()
    AND (author_id IS NULL OR author_id = auth.uid())
  );

CREATE POLICY "Staff can delete own staff messages"
  ON public.staff_messages FOR DELETE TO authenticated
  USING (
    public.is_staff()
    AND (author_id = auth.uid() OR public.is_site_admin())
  );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'staff_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_messages;
  END IF;
END $$;

-- =============================================================================
-- 8. RPC : fan-out d'alerte de modération
-- =============================================================================
CREATE OR REPLACE FUNCTION public.dispatch_moderation_alert(
  p_event_type TEXT,
  p_message TEXT,
  p_payload JSONB DEFAULT '{}'::jsonb,
  p_created_by TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_settings public.moderation_alert_settings%ROWTYPE;
  v_recipient RECORD;
  v_count INTEGER := 0;
  v_channels TEXT[] := '{}';
  v_should BOOLEAN := false;
  v_subject TEXT;
BEGIN
  SELECT * INTO v_settings FROM public.moderation_alert_settings LIMIT 1;
  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  CASE p_event_type
    WHEN 'new_report' THEN v_should := v_settings.auto_notify_on_report;
    WHEN 'ban' THEN v_should := v_settings.auto_notify_on_ban;
    WHEN 'unban' THEN v_should := v_settings.auto_notify_on_ban;
    WHEN 'mute' THEN v_should := v_settings.auto_notify_on_mute;
    WHEN 'unmute' THEN v_should := v_settings.auto_notify_on_mute;
    WHEN 'content_flag' THEN v_should := v_settings.auto_notify_on_content_flag;
    WHEN 'appeal' THEN v_should := v_settings.auto_notify_on_appeal;
    WHEN 'test' THEN v_should := true;
    ELSE v_should := true;
  END CASE;

  IF NOT v_should THEN
    RETURN 0;
  END IF;

  v_subject := CASE p_event_type
    WHEN 'new_report' THEN 'Nouveau signalement — Virtuel-RT'
    WHEN 'ban' THEN 'Bannissement — Virtuel-RT'
    WHEN 'unban' THEN 'Débannissement — Virtuel-RT'
    WHEN 'mute' THEN 'Mute — Virtuel-RT'
    WHEN 'unmute' THEN 'Démute — Virtuel-RT'
    WHEN 'content_flag' THEN 'Contenu signalé — Virtuel-RT'
    WHEN 'appeal' THEN 'Appel de modération — Virtuel-RT'
    WHEN 'test' THEN 'Test d''alerte — Virtuel-RT'
    ELSE 'Alerte modération — Virtuel-RT'
  END;

  FOR v_recipient IN
    SELECT p.*
    FROM public.profiles p
    WHERE
      COALESCE(p.is_founder, false)
      OR COALESCE(p.is_admin, false)
      OR COALESCE(p.is_direction, false)
      OR COALESCE(p.is_master_op, false)
      OR EXISTS (
        SELECT 1
        FROM unnest(COALESCE(p.special_badges, ARRAY[]::TEXT[])) AS b(badge)
        WHERE b.badge = ANY(v_settings.recipient_roles)
      )
  LOOP
    -- In-app
    IF v_settings.enable_app_alerts AND COALESCE(v_recipient.notify_mod_app, true) THEN
      INSERT INTO public.notifications (user_id, type, message, metadata, group_key)
      VALUES (
        v_recipient.id,
        'moderation_alert',
        p_message,
        COALESCE(p_payload, '{}'::jsonb) || jsonb_build_object('event_type', p_event_type),
        'moderation:' || p_event_type
      );
      INSERT INTO public.moderation_alert_queue (
        event_type, channel, recipient_user_id, recipient_name, subject, body, payload, status, processed_at
      ) VALUES (
        p_event_type, 'app', v_recipient.id, v_recipient.name, v_subject, p_message,
        COALESCE(p_payload, '{}'::jsonb), 'sent', NOW()
      );
      v_count := v_count + 1;
      IF NOT ('app' = ANY(v_channels)) THEN v_channels := array_append(v_channels, 'app'); END IF;
    END IF;

    -- Email
    IF v_settings.enable_email_alerts
       AND COALESCE(v_recipient.notify_mod_email, true)
       AND v_recipient.email IS NOT NULL
       AND trim(v_recipient.email) <> '' THEN
      INSERT INTO public.moderation_alert_queue (
        event_type, channel, recipient_user_id, recipient_email, recipient_name, subject, body, payload, status
      ) VALUES (
        p_event_type, 'email', v_recipient.id, v_recipient.email, v_recipient.name,
        v_subject, p_message, COALESCE(p_payload, '{}'::jsonb), 'pending'
      );
      v_count := v_count + 1;
      IF NOT ('email' = ANY(v_channels)) THEN v_channels := array_append(v_channels, 'email'); END IF;
    END IF;

    -- SMS
    IF v_settings.enable_sms_alerts
       AND COALESCE(v_recipient.notify_mod_sms, false)
       AND COALESCE(v_recipient.phone_consent, false)
       AND v_recipient.phone_number IS NOT NULL
       AND trim(v_recipient.phone_number) <> '' THEN
      INSERT INTO public.moderation_alert_queue (
        event_type, channel, recipient_user_id, recipient_phone, recipient_name, subject, body, payload, status
      ) VALUES (
        p_event_type, 'sms', v_recipient.id, v_recipient.phone_number, v_recipient.name,
        v_subject, p_message, COALESCE(p_payload, '{}'::jsonb), 'pending'
      );
      v_count := v_count + 1;
      IF NOT ('sms' = ANY(v_channels)) THEN v_channels := array_append(v_channels, 'sms'); END IF;
    END IF;
  END LOOP;

  INSERT INTO public.moderation_alert_log (event_type, channels, message, payload, recipients_count, created_by)
  VALUES (p_event_type, v_channels, p_message, COALESCE(p_payload, '{}'::jsonb), v_count, p_created_by);

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.dispatch_moderation_alert(TEXT, TEXT, JSONB, TEXT) TO authenticated, anon, service_role;

-- Trigger : nouveau signalement → alerte
CREATE OR REPLACE FUNCTION public.trg_report_moderation_alert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.dispatch_moderation_alert(
    'new_report',
    format('⚠️ Nouveau signalement : %s (%s) par %s',
      COALESCE(NEW.target_name, NEW.target_id),
      NEW.reason,
      NEW.reporter
    ),
    jsonb_build_object(
      'report_id', NEW.id,
      'target_type', NEW.target_type,
      'target_name', NEW.target_name,
      'reason', NEW.reason,
      'reporter', NEW.reporter
    ),
    NEW.reporter
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reports_moderation_alert ON public.reports;
CREATE TRIGGER reports_moderation_alert
  AFTER INSERT ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_report_moderation_alert();

-- =============================================================================
-- 9. Permissions seed — modération + alertes + staff chat
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  section TEXT NOT NULL,
  action TEXT NOT NULL,
  user_identifier TEXT NOT NULL,
  identifier_type TEXT NOT NULL DEFAULT 'user_type'
    CHECK (identifier_type IN ('user_type', 'badge')),
  allowed BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique constraint for upserts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'permissions_unique_combo'
  ) THEN
    ALTER TABLE public.permissions
      ADD CONSTRAINT permissions_unique_combo
      UNIQUE (section, action, user_identifier, identifier_type);
  END IF;
EXCEPTION
  WHEN others THEN NULL;
END $$;

INSERT INTO public.permissions (section, action, user_identifier, identifier_type, allowed)
VALUES
  -- Fondateur : tout
  ('moderation', 'view_reports', 'founder', 'badge', true),
  ('moderation', 'ban_users', 'founder', 'badge', true),
  ('moderation', 'mute_users', 'founder', 'badge', true),
  ('moderation', 'unblock_users', 'founder', 'badge', true),
  ('moderation', 'manage_alerts', 'founder', 'badge', true),
  ('moderation', 'receive_alerts', 'founder', 'badge', true),
  ('moderation', 'staff_chat', 'founder', 'badge', true),
  ('moderation', 'handle_reports', 'founder', 'badge', true),
  ('admin', 'access_panel', 'founder', 'badge', true),
  ('admin', 'manage_permissions', 'founder', 'badge', true),
  -- Direction
  ('moderation', 'view_reports', 'direction', 'badge', true),
  ('moderation', 'ban_users', 'direction', 'badge', true),
  ('moderation', 'mute_users', 'direction', 'badge', true),
  ('moderation', 'unblock_users', 'direction', 'badge', true),
  ('moderation', 'manage_alerts', 'direction', 'badge', true),
  ('moderation', 'receive_alerts', 'direction', 'badge', true),
  ('moderation', 'staff_chat', 'direction', 'badge', true),
  ('moderation', 'handle_reports', 'direction', 'badge', true),
  ('admin', 'access_panel', 'direction', 'badge', true),
  -- Master OP
  ('moderation', 'view_reports', 'master_op', 'badge', true),
  ('moderation', 'ban_users', 'master_op', 'badge', true),
  ('moderation', 'mute_users', 'master_op', 'badge', true),
  ('moderation', 'unblock_users', 'master_op', 'badge', true),
  ('moderation', 'manage_alerts', 'master_op', 'badge', true),
  ('moderation', 'receive_alerts', 'master_op', 'badge', true),
  ('moderation', 'staff_chat', 'master_op', 'badge', true),
  ('moderation', 'handle_reports', 'master_op', 'badge', true),
  ('admin', 'access_panel', 'master_op', 'badge', true),
  -- Modérateur
  ('moderation', 'view_reports', 'moderator', 'badge', true),
  ('moderation', 'ban_users', 'moderator', 'badge', true),
  ('moderation', 'mute_users', 'moderator', 'badge', true),
  ('moderation', 'unblock_users', 'moderator', 'badge', true),
  ('moderation', 'manage_alerts', 'moderator', 'badge', false),
  ('moderation', 'receive_alerts', 'moderator', 'badge', true),
  ('moderation', 'staff_chat', 'moderator', 'badge', true),
  ('moderation', 'handle_reports', 'moderator', 'badge', true),
  ('admin', 'access_panel', 'moderator', 'badge', false)
ON CONFLICT (section, action, user_identifier, identifier_type)
DO UPDATE SET allowed = EXCLUDED.allowed, updated_at = NOW();

-- Allow staff to insert notifications for others via SECURITY DEFINER path only;
-- also allow service role style inserts from authenticated staff for app channel already done in RPC.
