-- Salons: activer RLS + politiques de base (idempotent)
-- Objectif: permettre la lecture publique des salons et la création/modification par les utilisateurs authentifiés.

ALTER TABLE public.salons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read salons" ON public.salons;
CREATE POLICY "Anyone can read salons"
ON public.salons
FOR SELECT
TO public
USING (true);

DROP POLICY IF EXISTS "Authenticated can insert salons" ON public.salons;
CREATE POLICY "Authenticated can insert salons"
ON public.salons
FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can update salons" ON public.salons;
CREATE POLICY "Authenticated can update salons"
ON public.salons
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can delete salons" ON public.salons;
CREATE POLICY "Authenticated can delete salons"
ON public.salons
FOR DELETE
TO authenticated
USING (true);

