-- Restreindre user_presence : lecture récente / non invisible ; écriture = soi uniquement
-- Présence auth = auth.uid()::text ; invités = current_guest_name() (set_guest_session)

DROP POLICY IF EXISTS "Allow public read access" ON public.user_presence;
DROP POLICY IF EXISTS "Allow public read presence" ON public.user_presence;
DROP POLICY IF EXISTS "Allow users to manage own presence by name" ON public.user_presence;
DROP POLICY IF EXISTS "Allow users to manage own presence" ON public.user_presence;
DROP POLICY IF EXISTS "Allow authenticated users to update own presence" ON public.user_presence;
DROP POLICY IF EXISTS "Allow authenticated users to insert own presence" ON public.user_presence;
DROP POLICY IF EXISTS "Allow authenticated users to delete own presence" ON public.user_presence;
DROP POLICY IF EXISTS "Users can manage their own presence" ON public.user_presence;
DROP POLICY IF EXISTS "Authenticated users can read presence" ON public.user_presence;
DROP POLICY IF EXISTS "Read recent non-invisible presence" ON public.user_presence;
DROP POLICY IF EXISTS "Insert own presence" ON public.user_presence;
DROP POLICY IF EXISTS "Update own presence" ON public.user_presence;
DROP POLICY IF EXISTS "Delete own presence" ON public.user_presence;

CREATE OR REPLACE FUNCTION public.current_presence_actor_id()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(auth.uid()::text, public.current_guest_name());
$$;

GRANT EXECUTE ON FUNCTION public.current_presence_actor_id() TO anon, authenticated;

-- Lecture : lignes fraîches (10 min) et non invisibles ; soi toujours visible pour sync
CREATE POLICY "Read recent non-invisible presence"
  ON public.user_presence
  FOR SELECT
  TO authenticated, anon
  USING (
    user_id = public.current_presence_actor_id()
    OR (
      last_seen > NOW() - INTERVAL '10 minutes'
      AND COALESCE(status, 'online') IS DISTINCT FROM 'invisible'
    )
  );

CREATE POLICY "Insert own presence"
  ON public.user_presence
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (
    public.current_presence_actor_id() IS NOT NULL
    AND user_id = public.current_presence_actor_id()
  );

CREATE POLICY "Update own presence"
  ON public.user_presence
  FOR UPDATE
  TO authenticated, anon
  USING (user_id = public.current_presence_actor_id())
  WITH CHECK (user_id = public.current_presence_actor_id());

CREATE POLICY "Delete own presence"
  ON public.user_presence
  FOR DELETE
  TO authenticated, anon
  USING (user_id = public.current_presence_actor_id());

COMMENT ON TABLE public.user_presence IS 'Présence temps réel — RLS : lecture récente, écriture soi uniquement';
