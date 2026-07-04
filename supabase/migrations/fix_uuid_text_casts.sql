-- Correction : profiles.id est UUID (lié à auth.users), pas TEXT
-- Exécuter ce patch si vous avez l'erreur "operator does not exist: uuid = text"

CREATE OR REPLACE FUNCTION public.current_profile_name()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT name FROM public.profiles WHERE id = auth.uid();
$$;

-- Friends
DROP POLICY IF EXISTS "Users can read their own friends" ON public.friends;
CREATE POLICY "Users can read their own friends" ON public.friends FOR SELECT TO authenticated
  USING (public.current_profile_name() IN (user_id, friend_id));

DROP POLICY IF EXISTS "Users can send friend requests" ON public.friends;
CREATE POLICY "Users can send friend requests" ON public.friends FOR INSERT TO authenticated
  WITH CHECK (public.current_profile_name() = user_id);

DROP POLICY IF EXISTS "Users can update friend status" ON public.friends;
CREATE POLICY "Users can update friend status" ON public.friends FOR UPDATE TO authenticated
  USING (public.current_profile_name() = friend_id)
  WITH CHECK (public.current_profile_name() = friend_id);

-- Direct messages
DROP POLICY IF EXISTS "Users can read their own messages" ON public.direct_messages;
CREATE POLICY "Users can read their own messages" ON public.direct_messages FOR SELECT TO authenticated
  USING (public.current_profile_name() IN (sender_id, receiver_id));

DROP POLICY IF EXISTS "Users can send messages" ON public.direct_messages;
CREATE POLICY "Users can send messages" ON public.direct_messages FOR INSERT TO authenticated
  WITH CHECK (public.current_profile_name() = sender_id);

DROP POLICY IF EXISTS "Users can update read status" ON public.direct_messages;
CREATE POLICY "Users can update read status" ON public.direct_messages FOR UPDATE TO authenticated
  USING (public.current_profile_name() = receiver_id)
  WITH CHECK (public.current_profile_name() = receiver_id);

-- Blocked / muted
DROP POLICY IF EXISTS "Users can manage their own blocked users" ON public.blocked_users;
CREATE POLICY "Users can manage their own blocked users" ON public.blocked_users FOR ALL TO authenticated
  USING (public.current_profile_name() = user_id)
  WITH CHECK (public.current_profile_name() = user_id);

DROP POLICY IF EXISTS "Users can manage their own muted users" ON public.muted_users;
CREATE POLICY "Users can manage their own muted users" ON public.muted_users FOR ALL TO authenticated
  USING (public.current_profile_name() = user_id)
  WITH CHECK (public.current_profile_name() = user_id);
