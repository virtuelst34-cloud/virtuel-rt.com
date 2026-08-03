-- Anti-abus codes Premium + journal d’usage + épingle salon staff + merci modo
-- Exécutable plusieurs fois (IF NOT EXISTS / CREATE OR REPLACE)

-- ── Journal des redemptions ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.premium_code_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id UUID NOT NULL REFERENCES public.premium_codes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT premium_code_redemptions_user_unique UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_premium_redemptions_code
  ON public.premium_code_redemptions (code_id, redeemed_at DESC);

ALTER TABLE public.premium_code_redemptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read premium redemptions" ON public.premium_code_redemptions;
CREATE POLICY "Admins read premium redemptions"
ON public.premium_code_redemptions
FOR SELECT TO authenticated
USING (public.is_site_admin());

-- ── Redeem renforcé : 1 succès / compte + log ────────────────────────────

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

  -- 1 redeem réussi par compte (anti-abus)
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

-- ── Liste redemptions (admin) ────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.admin_list_premium_redemptions(p_code_id UUID DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  code_id UUID,
  code TEXT,
  user_id UUID,
  user_name TEXT,
  redeemed_at TIMESTAMPTZ
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
    r.id, r.code_id, c.code, r.user_id, r.user_name, r.redeemed_at
  FROM public.premium_code_redemptions r
  JOIN public.premium_codes c ON c.id = r.code_id
  WHERE p_code_id IS NULL OR r.code_id = p_code_id
  ORDER BY r.redeemed_at DESC
  LIMIT 200;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_premium_redemptions(UUID) TO authenticated;

-- Enrichir admin_list_premium_codes avec derniers usages (via redemptions count déjà dans use_count)

-- ── Salon du moment : staff 1-clic ───────────────────────────────────────

CREATE OR REPLACE FUNCTION public.staff_set_featured_salon(p_salon_id TEXT DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'Accès refusé : staff requis';
  END IF;

  UPDATE public.global_settings
  SET featured_salon_id = NULLIF(trim(COALESCE(p_salon_id, '')), '');

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.staff_set_featured_salon(TEXT) TO authenticated;

COMMENT ON FUNCTION public.staff_set_featured_salon(TEXT) IS
  'Staff : définit ou retire le salon du moment (global_settings.featured_salon_id)';

-- ── Merci modo → alertes Espace staff ────────────────────────────────────

CREATE OR REPLACE FUNCTION public.send_merci_modo(p_target_name TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender_id UUID := auth.uid();
  v_sender_name TEXT;
  v_target RECORD;
  v_last TIMESTAMPTZ;
  v_msg TEXT;
  v_count INTEGER;
BEGIN
  IF v_sender_id IS NULL THEN
    RAISE EXCEPTION 'Connexion requise pour envoyer un merci';
  END IF;

  SELECT name INTO v_sender_name FROM public.profiles WHERE id = v_sender_id;
  IF v_sender_name IS NULL OR trim(v_sender_name) = '' THEN
    RAISE EXCEPTION 'Profil introuvable';
  END IF;

  IF p_target_name IS NULL OR trim(p_target_name) = '' THEN
    RAISE EXCEPTION 'Modérateur introuvable';
  END IF;

  IF lower(trim(p_target_name)) = lower(trim(v_sender_name)) THEN
    RAISE EXCEPTION 'Vous ne pouvez pas vous remercier vous-même';
  END IF;

  -- Rate limit 1 / heure
  SELECT MAX(created_at) INTO v_last
  FROM public.notifications
  WHERE user_id = v_sender_id
    AND type = 'system'
    AND group_key = 'merci_modo_sent';

  IF v_last IS NOT NULL AND v_last > NOW() - INTERVAL '1 hour' THEN
    RAISE EXCEPTION 'Merci déjà envoyé récemment — réessayez dans une heure';
  END IF;

  SELECT * INTO v_target
  FROM public.profiles
  WHERE lower(name) = lower(trim(p_target_name))
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Modérateur introuvable';
  END IF;

  IF NOT (
    COALESCE(v_target.is_founder, false)
    OR COALESCE(v_target.is_admin, false)
    OR COALESCE(v_target.is_direction, false)
    OR COALESCE(v_target.is_master_op, false)
    OR 'moderator' = ANY(COALESCE(v_target.special_badges, ARRAY[]::TEXT[]))
    OR 'founder' = ANY(COALESCE(v_target.special_badges, ARRAY[]::TEXT[]))
    OR 'direction' = ANY(COALESCE(v_target.special_badges, ARRAY[]::TEXT[]))
    OR 'master_op' = ANY(COALESCE(v_target.special_badges, ARRAY[]::TEXT[]))
  ) THEN
    RAISE EXCEPTION 'Cette personne n’est pas un membre du staff';
  END IF;

  v_msg := format('%s a dit « Merci modo » à %s', v_sender_name, v_target.name);

  -- Fan-out Espace staff (Alertes)
  v_count := public.dispatch_moderation_alert(
    'merci_modo',
    v_msg,
    jsonb_build_object(
      'event_type', 'merci_modo',
      'from_name', v_sender_name,
      'to_name', v_target.name,
      'staff', true
    ),
    v_sender_name
  );

  -- Accusé pour l’émetteur (sert aussi de rate-limit)
  INSERT INTO public.notifications (user_id, type, message, group_key, group_count)
  VALUES (v_sender_id, 'system', 'Merci envoyé à ' || v_target.name || ' — l’équipe a été notifiée.', 'merci_modo_sent', 1);

  -- Notification perso au modo
  INSERT INTO public.notifications (user_id, type, message, group_key, group_count)
  VALUES (v_target.id, 'system', v_sender_name || ' vous a dit « Merci modo » 🙏', 'merci_modo_recv', 1);

  RETURN jsonb_build_object('ok', TRUE, 'staff_notified', COALESCE(v_count, 0));
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_merci_modo(TEXT) TO authenticated;

-- Étendre dispatch pour merci_modo (ne dépend pas des toggles auto)
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
    -- Fallback minimal si table absente / vide : notifier les admins via staff_alert
    IF lower(COALESCE(p_event_type, '')) = 'merci_modo' THEN
      FOR v_recipient IN
        SELECT p.*
        FROM public.profiles p
        WHERE
          COALESCE(p.is_founder, false)
          OR COALESCE(p.is_admin, false)
          OR COALESCE(p.is_direction, false)
          OR COALESCE(p.is_master_op, false)
          OR 'moderator' = ANY(COALESCE(p.special_badges, ARRAY[]::TEXT[]))
      LOOP
        INSERT INTO public.notifications (user_id, type, message, metadata, group_key)
        VALUES (
          v_recipient.id,
          'staff_alert',
          p_message,
          COALESCE(p_payload, '{}'::jsonb) || jsonb_build_object('event_type', p_event_type, 'staff', true),
          'moderation:merci_modo'
        );
        v_count := v_count + 1;
      END LOOP;
    END IF;
    RETURN v_count;
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
    WHEN 'merci_modo' THEN v_should := true;
    ELSE v_should := true;
  END CASE;

  IF NOT v_should THEN
    RETURN 0;
  END IF;

  v_notif_type := CASE
    WHEN lower(COALESCE(p_event_type, '')) = 'merci_modo' THEN 'staff_alert'
    ELSE public.staff_notification_type_for_event(p_event_type)
  END;

  v_subject := CASE p_event_type
    WHEN 'new_report' THEN 'Nouveau signalement — Virtuel-RT'
    WHEN 'ban' THEN 'Bannissement — Virtuel-RT'
    WHEN 'unban' THEN 'Débannissement — Virtuel-RT'
    WHEN 'mute' THEN 'Mute — Virtuel-RT'
    WHEN 'unmute' THEN 'Démute — Virtuel-RT'
    WHEN 'content_flag' THEN 'Contenu signalé — Virtuel-RT'
    WHEN 'appeal' THEN 'Appel de modération — Virtuel-RT'
    WHEN 'test' THEN 'Test d''alerte — Virtuel-RT'
    WHEN 'merci_modo' THEN 'Merci modo — Virtuel-RT'
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
       AND trim(v_recipient.email) <> ''
       AND lower(COALESCE(p_event_type, '')) <> 'merci_modo' THEN
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
       AND trim(v_recipient.phone_number) <> ''
       AND lower(COALESCE(p_event_type, '')) <> 'merci_modo' THEN
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

  INSERT INTO public.moderation_alert_log (
    event_type, channels, message, payload, recipients_count, created_by
  ) VALUES (
    p_event_type, v_channels, p_message, COALESCE(p_payload, '{}'::jsonb), v_count, p_created_by
  );

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.dispatch_moderation_alert(TEXT, TEXT, JSONB, TEXT) TO authenticated, anon, service_role;
