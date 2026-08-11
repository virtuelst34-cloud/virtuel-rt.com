-- Salon #bienvenue : annonces fondateur uniquement (lecture seule pour les autres)
-- + purge de l'historique pour réafficher le guide / règles

CREATE OR REPLACE FUNCTION public.is_founder_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND (
        COALESCE(is_founder, false) = TRUE
        OR 'founder' = ANY(COALESCE(special_badges, ARRAY[]::TEXT[]))
      )
  );
$$;

COMMENT ON FUNCTION public.is_founder_user() IS
  'True si le profil connecté a is_founder ou le badge founder';

CREATE OR REPLACE FUNCTION public.can_insert_message(p_salon_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.can_access_coquin_salon(p_salon_id)
    AND (
      p_salon_id IS DISTINCT FROM 'bienvenue'
      OR public.is_founder_user()
    );
$$;

COMMENT ON FUNCTION public.can_insert_message(TEXT) IS
  'Autorise INSERT messages : gate coquin + salon bienvenue réservé au fondateur';

DROP POLICY IF EXISTS "Insert messages with coquin gate" ON public.messages;
DROP POLICY IF EXISTS "Insert messages bienvenue founder only" ON public.messages;

CREATE POLICY "Insert messages bienvenue founder only"
ON public.messages
FOR INSERT
TO authenticated, anon
WITH CHECK (public.can_insert_message(salon_id));

-- Purge uniquement le salon bienvenue (ne touche pas les autres salons)
DELETE FROM public.messages WHERE salon_id = 'bienvenue';

COMMENT ON POLICY "Insert messages bienvenue founder only" ON public.messages IS
  'Salon bienvenue = annonces fondateur uniquement ; autres salons inchangés (gate coquin)';
