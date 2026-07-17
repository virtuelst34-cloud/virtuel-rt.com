-- Amis : autoriser les invités (anon) via current_actor_name(), comme les DMs

DROP POLICY IF EXISTS "Users can read their own friends" ON public.friends;
DROP POLICY IF EXISTS "Users can send friend requests" ON public.friends;
DROP POLICY IF EXISTS "Users can update friend status" ON public.friends;
DROP POLICY IF EXISTS "Users can delete friend relations" ON public.friends;
DROP POLICY IF EXISTS "Actors can read their friends" ON public.friends;
DROP POLICY IF EXISTS "Actors can send friend requests" ON public.friends;
DROP POLICY IF EXISTS "Actors can update friend status" ON public.friends;
DROP POLICY IF EXISTS "Actors can delete friend relations" ON public.friends;

CREATE POLICY "Actors can read their friends"
  ON public.friends FOR SELECT TO authenticated, anon
  USING (public.current_actor_name() IN (user_id, friend_id));

CREATE POLICY "Actors can send friend requests"
  ON public.friends FOR INSERT TO authenticated, anon
  WITH CHECK (
    public.current_actor_name() IS NOT NULL
    AND public.current_actor_name() = user_id
    AND user_id <> friend_id
  );

CREATE POLICY "Actors can update friend status"
  ON public.friends FOR UPDATE TO authenticated, anon
  USING (public.current_actor_name() = friend_id)
  WITH CHECK (public.current_actor_name() = friend_id);

CREATE POLICY "Actors can delete friend relations"
  ON public.friends FOR DELETE TO authenticated, anon
  USING (public.current_actor_name() IN (user_id, friend_id));
