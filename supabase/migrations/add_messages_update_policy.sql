-- Ajouter une politique RLS pour permettre aux utilisateurs authentifiés de mettre à jour les messages (réactions, épinglage)
DROP POLICY IF EXISTS "Authenticated can update messages" ON public.messages;

CREATE POLICY "Authenticated can update messages" ON public.messages
  FOR UPDATE
  TO authenticated
  WITH CHECK (true);
