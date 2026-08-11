-- Guest-safe DMs / friends: SECURITY DEFINER RPCs with p_guest_token in the same TX.
-- Mirrors presence/messages — set_guest_session alone does not stick across REST calls.
-- Identity remains display-name (pseudo) for now; full UUID migration is still deferred.

-- ---------------------------------------------------------------------------
-- DMs
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.send_own_dm(
  p_sender_id TEXT,
  p_receiver_id TEXT,
  p_text TEXT,
  p_image_url TEXT DEFAULT NULL,
  p_guest_token TEXT DEFAULT NULL
)
RETURNS public.direct_messages
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor TEXT;
  peer TEXT;
  body TEXT;
  media TEXT;
  row_out public.direct_messages;
BEGIN
  PERFORM public.apply_request_guest_token(p_guest_token);
  actor := public.current_actor_name();

  IF actor IS NULL OR trim(actor) = '' THEN
    RAISE EXCEPTION 'dm_actor_required' USING ERRCODE = '42501';
  END IF;

  IF trim(COALESCE(p_sender_id, '')) IS DISTINCT FROM actor THEN
    RAISE EXCEPTION 'dm_actor_mismatch' USING ERRCODE = '42501';
  END IF;

  peer := trim(COALESCE(p_receiver_id, ''));
  IF peer = '' THEN
    RAISE EXCEPTION 'dm_peer_required' USING ERRCODE = '22023';
  END IF;
  IF peer = actor THEN
    RAISE EXCEPTION 'dm_self_forbidden' USING ERRCODE = '22023';
  END IF;

  media := NULLIF(trim(COALESCE(p_image_url, '')), '');
  body := trim(COALESCE(p_text, ''));
  IF body = '' AND media IS NULL THEN
    RAISE EXCEPTION 'dm_empty' USING ERRCODE = '22023';
  END IF;
  IF body = '' THEN
    body := '📎 Fichier';
  END IF;

  INSERT INTO public.direct_messages (sender_id, receiver_id, text, image_url)
  VALUES (actor, peer, body, media)
  RETURNING * INTO row_out;

  RETURN row_out;
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_own_dm(TEXT, TEXT, TEXT, TEXT, TEXT)
  TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.list_own_dms(
  p_actor TEXT,
  p_peer TEXT,
  p_guest_token TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor TEXT;
  peer TEXT;
BEGIN
  PERFORM public.apply_request_guest_token(p_guest_token);
  actor := public.current_actor_name();

  IF actor IS NULL OR trim(actor) = '' THEN
    RAISE EXCEPTION 'dm_actor_required' USING ERRCODE = '42501';
  END IF;
  IF trim(COALESCE(p_actor, '')) IS DISTINCT FROM actor THEN
    RAISE EXCEPTION 'dm_actor_mismatch' USING ERRCODE = '42501';
  END IF;

  peer := trim(COALESCE(p_peer, ''));
  IF peer = '' THEN
    RAISE EXCEPTION 'dm_peer_required' USING ERRCODE = '22023';
  END IF;

  RETURN COALESCE((
    SELECT jsonb_agg(to_jsonb(ordered) ORDER BY ordered.created_at ASC)
    FROM (
      SELECT id, sender_id, receiver_id, text, image_url, read_at, created_at, reactions
      FROM (
        SELECT id, sender_id, receiver_id, text, image_url, read_at, created_at, reactions
        FROM public.direct_messages
        WHERE (sender_id = actor AND receiver_id = peer)
           OR (sender_id = peer AND receiver_id = actor)
        ORDER BY created_at DESC
        LIMIT 100
      ) recent
      ORDER BY created_at ASC
    ) ordered
  ), '[]'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_own_dms(TEXT, TEXT, TEXT)
  TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.list_own_dm_inbox(
  p_actor TEXT,
  p_guest_token TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor TEXT;
BEGIN
  PERFORM public.apply_request_guest_token(p_guest_token);
  actor := public.current_actor_name();

  IF actor IS NULL OR trim(actor) = '' THEN
    RAISE EXCEPTION 'dm_actor_required' USING ERRCODE = '42501';
  END IF;
  IF trim(COALESCE(p_actor, '')) IS DISTINCT FROM actor THEN
    RAISE EXCEPTION 'dm_actor_mismatch' USING ERRCODE = '42501';
  END IF;

  RETURN COALESCE((
    SELECT jsonb_agg(to_jsonb(t) ORDER BY t.created_at DESC)
    FROM (
      SELECT id, sender_id, receiver_id, text, image_url, read_at, created_at, reactions
      FROM public.direct_messages
      WHERE sender_id = actor OR receiver_id = actor
      ORDER BY created_at DESC
      LIMIT 150
    ) t
  ), '[]'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_own_dm_inbox(TEXT, TEXT)
  TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.mark_own_dms_read(
  p_actor TEXT,
  p_peer TEXT,
  p_guest_token TEXT DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor TEXT;
  peer TEXT;
  updated_count integer := 0;
BEGIN
  PERFORM public.apply_request_guest_token(p_guest_token);
  actor := public.current_actor_name();

  IF actor IS NULL OR trim(actor) = '' THEN
    RAISE EXCEPTION 'dm_actor_required' USING ERRCODE = '42501';
  END IF;
  IF trim(COALESCE(p_actor, '')) IS DISTINCT FROM actor THEN
    RAISE EXCEPTION 'dm_actor_mismatch' USING ERRCODE = '42501';
  END IF;

  peer := trim(COALESCE(p_peer, ''));
  IF peer = '' THEN
    RAISE EXCEPTION 'dm_peer_required' USING ERRCODE = '22023';
  END IF;

  UPDATE public.direct_messages
  SET read_at = NOW()
  WHERE receiver_id = actor
    AND sender_id = peer
    AND read_at IS NULL;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_own_dms_read(TEXT, TEXT, TEXT)
  TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- Friends
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.list_own_friends(
  p_actor TEXT,
  p_guest_token TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor TEXT;
BEGIN
  PERFORM public.apply_request_guest_token(p_guest_token);
  actor := public.current_actor_name();

  IF actor IS NULL OR trim(actor) = '' THEN
    RAISE EXCEPTION 'friend_actor_required' USING ERRCODE = '42501';
  END IF;
  IF trim(COALESCE(p_actor, '')) IS DISTINCT FROM actor THEN
    RAISE EXCEPTION 'friend_actor_mismatch' USING ERRCODE = '42501';
  END IF;

  RETURN COALESCE((
    SELECT jsonb_agg(to_jsonb(t) ORDER BY t.created_at DESC)
    FROM (
      SELECT id, user_id, friend_id, status, created_at, updated_at
      FROM public.friends
      WHERE user_id = actor OR friend_id = actor
      ORDER BY created_at DESC
    ) t
  ), '[]'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_own_friends(TEXT, TEXT)
  TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.send_friend_request(
  p_user_id TEXT,
  p_friend_id TEXT,
  p_guest_token TEXT DEFAULT NULL
)
RETURNS public.friends
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor TEXT;
  peer TEXT;
  existing public.friends;
  row_out public.friends;
BEGIN
  PERFORM public.apply_request_guest_token(p_guest_token);
  actor := public.current_actor_name();

  IF actor IS NULL OR trim(actor) = '' THEN
    RAISE EXCEPTION 'friend_actor_required' USING ERRCODE = '42501';
  END IF;
  IF trim(COALESCE(p_user_id, '')) IS DISTINCT FROM actor THEN
    RAISE EXCEPTION 'friend_actor_mismatch' USING ERRCODE = '42501';
  END IF;

  peer := trim(COALESCE(p_friend_id, ''));
  IF peer = '' THEN
    RAISE EXCEPTION 'friend_peer_required' USING ERRCODE = '22023';
  END IF;
  IF peer = actor THEN
    RAISE EXCEPTION 'friend_self_forbidden' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO existing
  FROM public.friends
  WHERE (user_id = actor AND friend_id = peer)
     OR (user_id = peer AND friend_id = actor)
  LIMIT 1;

  IF existing.id IS NOT NULL THEN
    IF existing.status = 'pending' THEN
      RAISE EXCEPTION 'friend_request_pending' USING ERRCODE = '23505';
    END IF;
    IF existing.status = 'accepted' THEN
      RAISE EXCEPTION 'friend_already_accepted' USING ERRCODE = '23505';
    END IF;
    -- rejected: allow a fresh request by replacing the row
    DELETE FROM public.friends WHERE id = existing.id;
  END IF;

  INSERT INTO public.friends (user_id, friend_id, status)
  VALUES (actor, peer, 'pending')
  RETURNING * INTO row_out;

  RETURN row_out;
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_friend_request(TEXT, TEXT, TEXT)
  TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.accept_friend_request(
  p_request_id UUID,
  p_guest_token TEXT DEFAULT NULL
)
RETURNS public.friends
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor TEXT;
  row_out public.friends;
BEGIN
  PERFORM public.apply_request_guest_token(p_guest_token);
  actor := public.current_actor_name();

  IF actor IS NULL OR trim(actor) = '' THEN
    RAISE EXCEPTION 'friend_actor_required' USING ERRCODE = '42501';
  END IF;

  UPDATE public.friends
  SET status = 'accepted', updated_at = NOW()
  WHERE id = p_request_id
    AND friend_id = actor
    AND status = 'pending'
  RETURNING * INTO row_out;

  IF row_out.id IS NULL THEN
    RAISE EXCEPTION 'friend_request_not_found' USING ERRCODE = 'P0002';
  END IF;

  RETURN row_out;
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_friend_request(UUID, TEXT)
  TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.delete_own_friend_relation(
  p_request_id UUID,
  p_guest_token TEXT DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor TEXT;
  deleted_count integer := 0;
BEGIN
  PERFORM public.apply_request_guest_token(p_guest_token);
  actor := public.current_actor_name();

  IF actor IS NULL OR trim(actor) = '' THEN
    RAISE EXCEPTION 'friend_actor_required' USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.friends
  WHERE id = p_request_id
    AND (user_id = actor OR friend_id = actor);

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  IF deleted_count = 0 THEN
    RAISE EXCEPTION 'friend_request_not_found' USING ERRCODE = 'P0002';
  END IF;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_own_friend_relation(UUID, TEXT)
  TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.delete_own_friend_with(
  p_actor TEXT,
  p_peer TEXT,
  p_guest_token TEXT DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor TEXT;
  peer TEXT;
  deleted_count integer := 0;
BEGIN
  PERFORM public.apply_request_guest_token(p_guest_token);
  actor := public.current_actor_name();

  IF actor IS NULL OR trim(actor) = '' THEN
    RAISE EXCEPTION 'friend_actor_required' USING ERRCODE = '42501';
  END IF;
  IF trim(COALESCE(p_actor, '')) IS DISTINCT FROM actor THEN
    RAISE EXCEPTION 'friend_actor_mismatch' USING ERRCODE = '42501';
  END IF;

  peer := trim(COALESCE(p_peer, ''));
  IF peer = '' THEN
    RAISE EXCEPTION 'friend_peer_required' USING ERRCODE = '22023';
  END IF;

  DELETE FROM public.friends
  WHERE (user_id = actor AND friend_id = peer)
     OR (user_id = peer AND friend_id = actor);

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_own_friend_with(TEXT, TEXT, TEXT)
  TO anon, authenticated;

-- Drop any legacy auth.uid()-style friends policies if they resurfaced
DROP POLICY IF EXISTS "Users can read their own friends" ON public.friends;
DROP POLICY IF EXISTS "Users can send friend requests" ON public.friends;
DROP POLICY IF EXISTS "Users can update friend status" ON public.friends;
DROP POLICY IF EXISTS "Users can delete friend relations" ON public.friends;
