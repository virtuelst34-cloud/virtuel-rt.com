-- Align presence RLS actor with display name (comme DMs / amis via current_actor_name).
-- Cause du bug asymétrique EN LIGNE :
--   tighten_user_presence_rls utilisait auth.uid()::text comme user_id attendu,
--   alors que le client écrit souvent le pseudo (name). Les comptes auth ne
--   pouvaient plus upsert leur présence → visibles localement chez eux, invisibles
--   pour les autres (invités ou peers).

CREATE OR REPLACE FUNCTION public.current_presence_actor_id()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Même identité que current_actor_name() : pseudo profil OU invité
  SELECT public.current_actor_name();
$$;

GRANT EXECUTE ON FUNCTION public.current_presence_actor_id() TO anon, authenticated;

-- Lecture : lignes fraîches (10 min) et non invisibles ; soi toujours visible pour sync
DROP POLICY IF EXISTS "Read recent non-invisible presence" ON public.user_presence;
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

DROP POLICY IF EXISTS "Insert own presence" ON public.user_presence;
CREATE POLICY "Insert own presence"
  ON public.user_presence
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (
    public.current_presence_actor_id() IS NOT NULL
    AND user_id = public.current_presence_actor_id()
  );

DROP POLICY IF EXISTS "Update own presence" ON public.user_presence;
CREATE POLICY "Update own presence"
  ON public.user_presence
  FOR UPDATE
  TO authenticated, anon
  USING (user_id = public.current_presence_actor_id())
  WITH CHECK (user_id = public.current_presence_actor_id());

DROP POLICY IF EXISTS "Delete own presence" ON public.user_presence;
CREATE POLICY "Delete own presence"
  ON public.user_presence
  FOR DELETE
  TO authenticated, anon
  USING (user_id = public.current_presence_actor_id());

-- Purger les anciennes lignes clés par UUID auth (plus utilisées ; clé = pseudo)
DELETE FROM public.user_presence
WHERE user_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

COMMENT ON TABLE public.user_presence IS
  'Présence temps réel — RLS : lecture récente mutuelle, écriture = current_actor_name() uniquement';
