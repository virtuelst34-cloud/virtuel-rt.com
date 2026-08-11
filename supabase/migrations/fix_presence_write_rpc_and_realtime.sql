-- Présence fiable : écriture atomique (auth + invité) + lecture mutuelle pour Realtime.
--
-- Causes restantes après fix_presence_actor_name_rls :
-- 1) Invités : set_guest_session(is_local) ne survit pas à la requête suivante → upsert/touch
--    RLS échoue en silence (0 lignes) → présents localement, invisibles pour les pairs.
-- 2) presenceService.touch() fait UPDATE seul : si la ligne a été purgée, pas de recréation.
-- 3) Realtime postgres_changes filtre via SELECT RLS ; actor NULL côté invité OK grâce à
--    la branche « récent non invisible », mais sans écriture DB les peers n'apparaissent jamais.
--
-- Solution : RPCs SECURITY DEFINER qui appliquent le token invité DANS la même transaction,
-- vérifient current_actor_name(), puis upsert/delete. SELECT RLS inchangé (lecture mutuelle).

CREATE OR REPLACE FUNCTION public.apply_presence_guest_token(p_guest_token TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_guest_token IS NULL OR length(trim(p_guest_token)) = 0 THEN
    RETURN;
  END IF;
  PERFORM set_config('app.guest_token', trim(p_guest_token), true);
END;
$$;

CREATE OR REPLACE FUNCTION public.upsert_own_presence(
  p_user_id TEXT,
  p_name TEXT,
  p_avatar TEXT DEFAULT 'av1',
  p_initials TEXT DEFAULT '??',
  p_status TEXT DEFAULT 'online',
  p_current_salon_id TEXT DEFAULT NULL,
  p_guest_token TEXT DEFAULT NULL
)
RETURNS public.user_presence
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor TEXT;
  row_out public.user_presence;
  safe_status TEXT;
BEGIN
  PERFORM public.apply_presence_guest_token(p_guest_token);
  actor := public.current_actor_name();

  IF actor IS NULL OR trim(actor) = '' THEN
    RAISE EXCEPTION 'presence_actor_required' USING ERRCODE = '42501';
  END IF;

  IF p_user_id IS DISTINCT FROM actor THEN
    RAISE EXCEPTION 'presence_actor_mismatch' USING ERRCODE = '42501';
  END IF;

  safe_status := COALESCE(NULLIF(trim(p_status), ''), 'online');
  IF safe_status NOT IN ('online', 'away', 'busy', 'invisible') THEN
    safe_status := 'online';
  END IF;

  INSERT INTO public.user_presence AS up (
    user_id, name, avatar, initials, status, current_salon_id, last_seen, updated_at
  ) VALUES (
    actor,
    COALESCE(NULLIF(trim(p_name), ''), actor),
    COALESCE(NULLIF(trim(p_avatar), ''), 'av1'),
    COALESCE(NULLIF(trim(p_initials), ''), upper(left(actor, 2))),
    safe_status,
    NULLIF(trim(p_current_salon_id), ''),
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    name = EXCLUDED.name,
    avatar = EXCLUDED.avatar,
    initials = EXCLUDED.initials,
    status = EXCLUDED.status,
    current_salon_id = EXCLUDED.current_salon_id,
    last_seen = NOW(),
    updated_at = NOW()
  RETURNING * INTO row_out;

  RETURN row_out;
END;
$$;

CREATE OR REPLACE FUNCTION public.touch_own_presence(
  p_user_id TEXT,
  p_status TEXT DEFAULT NULL,
  p_current_salon_id TEXT DEFAULT NULL,
  p_guest_token TEXT DEFAULT NULL
)
RETURNS public.user_presence
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor TEXT;
  existing public.user_presence;
  row_out public.user_presence;
  safe_status TEXT;
BEGIN
  PERFORM public.apply_presence_guest_token(p_guest_token);
  actor := public.current_actor_name();

  IF actor IS NULL OR trim(actor) = '' OR p_user_id IS DISTINCT FROM actor THEN
    RAISE EXCEPTION 'presence_actor_mismatch' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO existing FROM public.user_presence WHERE user_id = actor;

  IF existing.user_id IS NULL THEN
    RETURN public.upsert_own_presence(
      actor,
      actor,
      'av1',
      upper(left(actor, 2)),
      COALESCE(NULLIF(trim(p_status), ''), 'online'),
      p_current_salon_id,
      p_guest_token
    );
  END IF;

  safe_status := COALESCE(NULLIF(trim(p_status), ''), existing.status, 'online');
  IF safe_status NOT IN ('online', 'away', 'busy', 'invisible') THEN
    safe_status := 'online';
  END IF;

  UPDATE public.user_presence
  SET
    status = safe_status,
    current_salon_id = CASE
      WHEN p_current_salon_id IS NULL THEN current_salon_id
      WHEN trim(p_current_salon_id) = '' THEN NULL
      ELSE trim(p_current_salon_id)
    END,
    last_seen = NOW(),
    updated_at = NOW()
  WHERE user_id = actor
  RETURNING * INTO row_out;

  RETURN row_out;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_own_presence(
  p_user_id TEXT,
  p_guest_token TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor TEXT;
BEGIN
  PERFORM public.apply_presence_guest_token(p_guest_token);
  actor := public.current_actor_name();

  IF actor IS NULL OR trim(actor) = '' OR p_user_id IS DISTINCT FROM actor THEN
    RAISE EXCEPTION 'presence_actor_mismatch' USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.user_presence WHERE user_id = actor;
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_presence_guest_token(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_own_presence(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.touch_own_presence(TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_own_presence(TEXT, TEXT) TO anon, authenticated;

-- Purger les fantômes trop vieux (au-delà de la fenêtre de lecture RLS)
DELETE FROM public.user_presence
WHERE last_seen < NOW() - INTERVAL '15 minutes';

COMMENT ON FUNCTION public.upsert_own_presence IS
  'Upsert présence de l’acteur courant (pseudo) ; token invité optionnel dans la même transaction';
COMMENT ON FUNCTION public.touch_own_presence IS
  'Heartbeat présence ; recrée la ligne si absente';
COMMENT ON FUNCTION public.delete_own_presence IS
  'Supprime la présence de l’acteur courant';
