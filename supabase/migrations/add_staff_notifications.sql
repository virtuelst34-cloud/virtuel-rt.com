-- Notifications dédiées Espace staff (messages, bans, signalements, alertes)
-- Étend le CHECK des types et fan-out staff_message sur INSERT staff_messages.

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'dm', 'friend_request', 'friend_accepted', 'system', 'mention',
    'achievement', 'block', 'levelup', 'premium', 'success', 'error',
    'mod', 'report', 'moderation_alert',
    'staff_message', 'staff_ban', 'staff_report', 'staff_alert'
  ));

-- Mappe un event_type modération → type notification staff
CREATE OR REPLACE FUNCTION public.staff_notification_type_for_event(p_event_type TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE lower(COALESCE(p_event_type, ''))
    WHEN 'ban' THEN 'staff_ban'
    WHEN 'unban' THEN 'staff_ban'
    WHEN 'mute' THEN 'staff_ban'
    WHEN 'unmute' THEN 'staff_ban'
    WHEN 'new_report' THEN 'staff_report'
    WHEN 'content_flag' THEN 'staff_alert'
    WHEN 'appeal' THEN 'staff_alert'
    WHEN 'test' THEN 'staff_alert'
    ELSE 'staff_alert'
  END;
$$;

-- Met à jour le fan-out pour écrire les types staff_* (rétrocompat metadata event_type)
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
  v_notif_type TEXT;
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

  v_notif_type := public.staff_notification_type_for_event(p_event_type);

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
    IF v_settings.enable_app_alerts AND COALESCE(v_recipient.notify_mod_app, true) THEN
      INSERT INTO public.notifications (user_id, type, message, metadata, group_key)
      VALUES (
        v_recipient.id,
        v_notif_type,
        p_message,
        COALESCE(p_payload, '{}'::jsonb) || jsonb_build_object(
          'event_type', p_event_type,
          'staff', true
        ),
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

-- Nouveau message staff → notification aux autres membres du staff
CREATE OR REPLACE FUNCTION public.trg_staff_message_notify()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recipient RECORD;
  v_preview TEXT;
  v_roles TEXT[] := ARRAY['founder', 'direction', 'master_op', 'moderator'];
BEGIN
  v_preview := CASE
    WHEN NEW.file_url IS NOT NULL AND (NEW.body IS NULL OR trim(NEW.body) = '' OR NEW.body = '📎 Fichier')
      THEN '📎 Fichier' || COALESCE(' · ' || NULLIF(trim(NEW.file_name), ''), '')
    ELSE left(COALESCE(NEW.body, ''), 120)
  END;

  FOR v_recipient IN
    SELECT p.id, p.name
    FROM public.profiles p
    WHERE
      p.id IS DISTINCT FROM NEW.author_id
      AND (
        COALESCE(p.is_founder, false)
        OR COALESCE(p.is_admin, false)
        OR COALESCE(p.is_direction, false)
        OR COALESCE(p.is_master_op, false)
        OR EXISTS (
          SELECT 1
          FROM unnest(COALESCE(p.special_badges, ARRAY[]::TEXT[])) AS b(badge)
          WHERE b.badge = ANY(v_roles)
        )
      )
  LOOP
    INSERT INTO public.notifications (user_id, type, message, metadata, group_key)
    VALUES (
      v_recipient.id,
      'staff_message',
      '💬 ' || COALESCE(NEW.author_name, 'Staff') || ' : ' || v_preview,
      jsonb_build_object(
        'staff', true,
        'message_id', NEW.id,
        'author_id', NEW.author_id,
        'author_name', NEW.author_name,
        'event_type', 'staff_message'
      ),
      'staff_message:' || NEW.id::text
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS staff_messages_notify ON public.staff_messages;
CREATE TRIGGER staff_messages_notify
  AFTER INSERT ON public.staff_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_staff_message_notify();

NOTIFY pgrst, 'reload schema';
