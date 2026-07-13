-- messages.id est TEXT en production → corriger les RPC qui utilisaient UUID
-- pgcrypto est dans le schéma extensions sur Supabase

DROP FUNCTION IF EXISTS public.update_message_reaction(UUID, JSONB);

CREATE OR REPLACE FUNCTION public.update_message_reaction(message_id TEXT, new_reactions JSONB)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.messages
  SET reactions = new_reactions
  WHERE id = message_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_message_reaction(TEXT, JSONB) TO authenticated, anon;

CREATE OR REPLACE FUNCTION public.register_guest_session(
  p_name TEXT,
  p_avatar TEXT,
  p_initials TEXT,
  p_session_token TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_name TEXT := trim(p_name);
  v_token TEXT := COALESCE(NULLIF(trim(p_session_token), ''), encode(gen_random_bytes(24), 'hex'));
  v_expires TIMESTAMPTZ := NOW() + INTERVAL '30 minutes';
  v_row public.guest_sessions%ROWTYPE;
BEGIN
  IF length(v_name) < 2 OR length(v_name) > 32 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pseudo invalide (2-32 caractères)');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.profiles WHERE lower(name) = lower(v_name)
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ce pseudo est déjà utilisé par un compte enregistré');
  END IF;

  DELETE FROM public.guest_sessions WHERE expires_at < NOW();

  IF EXISTS (
    SELECT 1 FROM public.guest_sessions
    WHERE lower(guest_name) = lower(v_name)
      AND expires_at > NOW()
      AND session_token <> v_token
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ce pseudo est déjà pris par un autre invité');
  END IF;

  INSERT INTO public.guest_sessions (guest_name, session_token, avatar, initials, expires_at)
  VALUES (
    v_name,
    v_token,
    COALESCE(NULLIF(trim(p_avatar), ''), 'av1'),
    COALESCE(NULLIF(trim(p_initials), ''), upper(left(v_name, 2))),
    v_expires
  )
  ON CONFLICT (session_token) DO UPDATE SET
    guest_name = EXCLUDED.guest_name,
    avatar = EXCLUDED.avatar,
    initials = EXCLUDED.initials,
    expires_at = EXCLUDED.expires_at,
    created_at = NOW()
  RETURNING * INTO v_row;

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

GRANT EXECUTE ON FUNCTION public.register_guest_session(TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
