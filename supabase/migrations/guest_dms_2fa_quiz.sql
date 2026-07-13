-- DMs invités, acteur courant, 2FA TOTP, sessions quiz

-- Contexte invité (token → nom) pour les politiques RLS anon
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

-- direct_messages : invités (anon) + comptes authentifiés, IDs = noms de pseudo
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

-- 2FA TOTP (comptes authentifiés)
CREATE TABLE IF NOT EXISTS public.user_two_factor (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  secret TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  backup_codes TEXT[] NOT NULL DEFAULT '{}',
  backup_codes_used TEXT[] NOT NULL DEFAULT '{}',
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_two_factor ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own 2FA" ON public.user_two_factor;
CREATE POLICY "Users manage own 2FA"
  ON public.user_two_factor FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Quiz en temps réel (état par salon)
CREATE TABLE IF NOT EXISTS public.quiz_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id TEXT NOT NULL,
  created_by TEXT NOT NULL,
  title TEXT NOT NULL,
  questions JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN NOT NULL DEFAULT false,
  current_question_index INT NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  participants JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quiz_sessions_salon ON public.quiz_sessions (salon_id);
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_active ON public.quiz_sessions (salon_id, is_active);

ALTER TABLE public.quiz_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read quiz sessions" ON public.quiz_sessions;
DROP POLICY IF EXISTS "Authenticated can manage quiz" ON public.quiz_sessions;
DROP POLICY IF EXISTS "Actors can manage quiz" ON public.quiz_sessions;

CREATE POLICY "Anyone can read quiz sessions"
  ON public.quiz_sessions FOR SELECT TO public USING (true);

CREATE POLICY "Actors can manage quiz"
  ON public.quiz_sessions FOR INSERT TO authenticated, anon
  WITH CHECK (
    public.current_actor_name() IS NOT NULL
    AND created_by = public.current_actor_name()
  );

CREATE POLICY "Actors can update quiz"
  ON public.quiz_sessions FOR UPDATE TO authenticated, anon
  USING (public.current_actor_name() IS NOT NULL)
  WITH CHECK (public.current_actor_name() IS NOT NULL);

CREATE POLICY "Creators can delete quiz"
  ON public.quiz_sessions FOR DELETE TO authenticated, anon
  USING (created_by = public.current_actor_name());

ALTER TABLE public.quiz_sessions REPLICA IDENTITY FULL;
