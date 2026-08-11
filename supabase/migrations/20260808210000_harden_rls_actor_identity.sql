-- Harden RLS / RPCs around actor identity (pseudo + guest token).
-- Guests stay supported via current_actor_name() + optional p_guest_token in the same TX.
-- Full UUID migration of DMs/friends/presence/preferences remains a follow-up.

-- ---------------------------------------------------------------------------
-- Shared: apply guest token in-request (transaction-local)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.apply_request_guest_token(p_guest_token TEXT)
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

GRANT EXECUTE ON FUNCTION public.apply_request_guest_token(TEXT) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- Messages: INSERT must match session actor (blocks author_name spoofing)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.message_author_allowed(p_author_name TEXT, p_salon_id TEXT, p_is_system BOOLEAN)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.current_actor_name() IS NOT NULL
    AND trim(COALESCE(p_author_name, '')) <> ''
    AND (
      p_author_name = public.current_actor_name()
      OR (
        COALESCE(p_is_system, false) = TRUE
        AND p_author_name = 'Quiz'
        AND p_salon_id = 'quiz'
      )
    );
$$;

GRANT EXECUTE ON FUNCTION public.message_author_allowed(TEXT, TEXT, BOOLEAN) TO anon, authenticated;

DROP POLICY IF EXISTS "Insert messages bienvenue founder only" ON public.messages;
DROP POLICY IF EXISTS "Insert messages with coquin gate" ON public.messages;
DROP POLICY IF EXISTS "Insert messages actor must match" ON public.messages;

CREATE POLICY "Insert messages actor must match"
ON public.messages
FOR INSERT
TO authenticated, anon
WITH CHECK (
  public.can_insert_message(salon_id)
  AND public.message_author_allowed(author_name, salon_id, is_system)
);

COMMENT ON POLICY "Insert messages actor must match" ON public.messages IS
  'INSERT: gate coquin/bienvenue + author_name = current_actor_name (Quiz system only in #quiz)';

-- RPC: guests pass token in the same transaction (set_guest_session alone does not persist)
CREATE OR REPLACE FUNCTION public.insert_own_message(
  p_salon_id TEXT,
  p_author_name TEXT,
  p_author_avatar TEXT DEFAULT 'av1',
  p_author_initials TEXT DEFAULT '??',
  p_text TEXT DEFAULT '',
  p_created_date TIMESTAMPTZ DEFAULT NOW(),
  p_reactions JSONB DEFAULT '{}'::jsonb,
  p_pinned BOOLEAN DEFAULT false,
  p_is_system BOOLEAN DEFAULT false,
  p_is_announcement BOOLEAN DEFAULT false,
  p_reply_to TEXT DEFAULT NULL,
  p_image_url TEXT DEFAULT NULL,
  p_guest_token TEXT DEFAULT NULL
)
RETURNS public.messages
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor TEXT;
  row_out public.messages;
  safe_author TEXT;
  safe_system BOOLEAN := COALESCE(p_is_system, false);
BEGIN
  PERFORM public.apply_request_guest_token(p_guest_token);
  actor := public.current_actor_name();

  IF actor IS NULL OR trim(actor) = '' THEN
    RAISE EXCEPTION 'message_actor_required' USING ERRCODE = '42501';
  END IF;

  IF NOT public.can_insert_message(p_salon_id) THEN
    RAISE EXCEPTION 'message_insert_denied' USING ERRCODE = '42501';
  END IF;

  -- Force author to actor except Quiz system posts in #quiz
  IF safe_system AND p_author_name = 'Quiz' AND p_salon_id = 'quiz' THEN
    safe_author := 'Quiz';
  ELSE
    safe_author := actor;
    safe_system := false;
  END IF;

  INSERT INTO public.messages (
    salon_id, author_name, author_avatar, author_initials, text, created_date,
    reactions, pinned, is_system, is_announcement, reply_to, image_url
  ) VALUES (
    p_salon_id,
    safe_author,
    COALESCE(NULLIF(trim(p_author_avatar), ''), 'av1'),
    COALESCE(NULLIF(trim(p_author_initials), ''), upper(left(safe_author, 2))),
    COALESCE(p_text, ''),
    COALESCE(p_created_date, NOW()),
    COALESCE(p_reactions, '{}'::jsonb),
    COALESCE(p_pinned, false),
    safe_system,
    COALESCE(p_is_announcement, false),
    NULLIF(trim(p_reply_to), ''),
    NULLIF(trim(p_image_url), '')
  )
  RETURNING * INTO row_out;

  RETURN row_out;
END;
$$;

GRANT EXECUTE ON FUNCTION public.insert_own_message(
  TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, JSONB, BOOLEAN, BOOLEAN, BOOLEAN, TEXT, TEXT, TEXT
) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- Messages: UPDATE / DELETE — own author or site admin (reactions via RPC)
-- Pinning any message stays available via set_message_pinned RPC
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Update messages with coquin gate" ON public.messages;
DROP POLICY IF EXISTS "Authenticated can update messages" ON public.messages;
DROP POLICY IF EXISTS "Update own or admin messages" ON public.messages;

CREATE POLICY "Update own or admin messages"
ON public.messages
FOR UPDATE
TO authenticated, anon
USING (
  public.can_access_coquin_salon(salon_id)
  AND (
    author_name = public.current_actor_name()
    OR public.is_site_admin()
  )
)
WITH CHECK (
  public.can_access_coquin_salon(salon_id)
  AND (
    author_name = public.current_actor_name()
    OR public.is_site_admin()
  )
);

DROP POLICY IF EXISTS "Delete own or admin messages" ON public.messages;
DROP POLICY IF EXISTS "Users can delete own messages" ON public.messages;

CREATE POLICY "Delete own or admin messages"
ON public.messages
FOR DELETE
TO authenticated, anon
USING (
  public.can_access_coquin_salon(salon_id)
  AND (
    author_name = public.current_actor_name()
    OR public.is_site_admin()
  )
);

CREATE OR REPLACE FUNCTION public.set_message_pinned(
  p_message_id TEXT,
  p_pinned BOOLEAN,
  p_guest_token TEXT DEFAULT NULL
)
RETURNS public.messages
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor TEXT;
  row_out public.messages;
BEGIN
  PERFORM public.apply_request_guest_token(p_guest_token);
  actor := public.current_actor_name();

  IF actor IS NULL OR trim(actor) = '' THEN
    RAISE EXCEPTION 'message_actor_required' USING ERRCODE = '42501';
  END IF;

  UPDATE public.messages m
  SET pinned = COALESCE(p_pinned, false)
  WHERE m.id::text = p_message_id
    AND public.can_access_coquin_salon(m.salon_id)
  RETURNING * INTO row_out;

  IF row_out.id IS NULL THEN
    RAISE EXCEPTION 'message_not_found_or_denied' USING ERRCODE = '42501';
  END IF;

  RETURN row_out;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_message_pinned(TEXT, BOOLEAN, TEXT) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.delete_own_message(
  p_message_id TEXT,
  p_guest_token TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor TEXT;
  deleted_count INT;
BEGIN
  PERFORM public.apply_request_guest_token(p_guest_token);
  actor := public.current_actor_name();

  IF actor IS NULL OR trim(actor) = '' THEN
    RAISE EXCEPTION 'message_actor_required' USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.messages m
  WHERE m.id::text = p_message_id
    AND public.can_access_coquin_salon(m.salon_id)
    AND (m.author_name = actor OR public.is_site_admin());

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  IF deleted_count = 0 THEN
    RAISE EXCEPTION 'message_delete_denied' USING ERRCODE = '42501';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_own_message(TEXT, TEXT) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- Reactions RPC: require an actor (+ optional guest token)
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.update_message_reaction(UUID, JSONB);
DROP FUNCTION IF EXISTS public.update_message_reaction(TEXT, JSONB);
DROP FUNCTION IF EXISTS public.update_message_reaction(TEXT, JSONB, TEXT);

CREATE OR REPLACE FUNCTION public.update_message_reaction(
  message_id TEXT,
  new_reactions JSONB,
  p_guest_token TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor TEXT;
  updated_count INT;
BEGIN
  PERFORM public.apply_request_guest_token(p_guest_token);
  actor := public.current_actor_name();

  IF actor IS NULL OR trim(actor) = '' THEN
    RAISE EXCEPTION 'reaction_actor_required' USING ERRCODE = '42501';
  END IF;

  UPDATE public.messages m
  SET reactions = COALESCE(new_reactions, '{}'::jsonb)
  WHERE m.id::text = message_id
    AND public.can_access_coquin_salon(m.salon_id);

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  IF updated_count = 0 THEN
    RAISE EXCEPTION 'reaction_denied' USING ERRCODE = '42501';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_message_reaction(TEXT, JSONB, TEXT) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- Preferences: own row only (premium still guarded by trigger / admin RPCs)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can manage preferences by user_name" ON public.preferences;
DROP POLICY IF EXISTS "Users manage own preferences by name" ON public.preferences;
DROP POLICY IF EXISTS "Actors manage own preferences" ON public.preferences;

CREATE POLICY "Actors manage own preferences"
  ON public.preferences FOR ALL TO authenticated, anon
  USING (user_name = public.current_actor_name())
  WITH CHECK (user_name = public.current_actor_name());

CREATE OR REPLACE FUNCTION public.upsert_own_preferences(
  p_user_name TEXT,
  p_theme TEXT DEFAULT NULL,
  p_party_mode BOOLEAN DEFAULT NULL,
  p_accent_color TEXT DEFAULT NULL,
  p_compact_mode BOOLEAN DEFAULT NULL,
  p_guest_token TEXT DEFAULT NULL
)
RETURNS public.preferences
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor TEXT;
  row_out public.preferences;
BEGIN
  PERFORM public.apply_request_guest_token(p_guest_token);
  actor := public.current_actor_name();

  IF actor IS NULL OR trim(actor) = '' THEN
    RAISE EXCEPTION 'prefs_actor_required' USING ERRCODE = '42501';
  END IF;

  IF p_user_name IS DISTINCT FROM actor THEN
    RAISE EXCEPTION 'prefs_actor_mismatch' USING ERRCODE = '42501';
  END IF;

  UPDATE public.preferences
  SET
    theme = COALESCE(p_theme, theme),
    party_mode = COALESCE(p_party_mode, party_mode),
    accent_color = COALESCE(p_accent_color, accent_color),
    compact_mode = COALESCE(p_compact_mode, compact_mode),
    updated_at = NOW()
  WHERE user_name = actor
  RETURNING * INTO row_out;

  IF row_out.id IS NULL THEN
    INSERT INTO public.preferences (user_name, theme, party_mode, accent_color, compact_mode)
    VALUES (
      actor,
      COALESCE(p_theme, 'dark'),
      COALESCE(p_party_mode, false),
      COALESCE(p_accent_color, 'purple'),
      COALESCE(p_compact_mode, false)
    )
    RETURNING * INTO row_out;
  END IF;

  RETURN row_out;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_own_preferences(
  TEXT, TEXT, BOOLEAN, TEXT, BOOLEAN, TEXT
) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- guest_sessions: stop leaking tokens via open SELECT/INSERT/UPDATE
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can read guest sessions" ON public.guest_sessions;
DROP POLICY IF EXISTS "Anyone can insert guest session" ON public.guest_sessions;
DROP POLICY IF EXISTS "Anyone can update guest session" ON public.guest_sessions;
DROP POLICY IF EXISTS "Anyone can read own guest session by token" ON public.guest_sessions;
DROP POLICY IF EXISTS "Anyone can update own guest session" ON public.guest_sessions;

-- No direct table policies: access only via SECURITY DEFINER RPCs
ALTER TABLE public.guest_sessions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  REVOKE ALL ON TABLE public.guest_sessions FROM anon;
  REVOKE ALL ON TABLE public.guest_sessions FROM authenticated;
EXCEPTION
  WHEN undefined_object THEN NULL;
  WHEN insufficient_privilege THEN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.validate_guest_session(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.guest_sessions%ROWTYPE;
BEGIN
  IF p_token IS NULL OR length(trim(p_token)) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Token manquant');
  END IF;

  SELECT * INTO v_row
  FROM public.guest_sessions
  WHERE session_token = trim(p_token)
  LIMIT 1;

  IF v_row.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Session invité invalide');
  END IF;

  IF v_row.expires_at < NOW() THEN
    DELETE FROM public.guest_sessions WHERE id = v_row.id;
    RETURN jsonb_build_object('success', false, 'error', 'Session invité expirée');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'session_token', v_row.session_token,
    'guest_name', v_row.guest_name,
    'avatar', v_row.avatar,
    'initials', v_row.initials,
    'expires_at', v_row.expires_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_guest_session(TEXT) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- Quiz: only creator (or admin) may update/delete
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Actors can update quiz" ON public.quiz_sessions;
CREATE POLICY "Actors can update quiz"
  ON public.quiz_sessions FOR UPDATE TO authenticated, anon
  USING (
    public.current_actor_name() IS NOT NULL
    AND (
      created_by = public.current_actor_name()
      OR public.is_site_admin()
    )
  )
  WITH CHECK (
    public.current_actor_name() IS NOT NULL
    AND (
      created_by = public.current_actor_name()
      OR public.is_site_admin()
    )
  );

DROP POLICY IF EXISTS "Creators can delete quiz" ON public.quiz_sessions;
CREATE POLICY "Creators can delete quiz"
  ON public.quiz_sessions FOR DELETE TO authenticated, anon
  USING (
    created_by = public.current_actor_name()
    OR public.is_site_admin()
  );

NOTIFY pgrst, 'reload schema';
