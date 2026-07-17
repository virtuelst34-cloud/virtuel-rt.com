-- Amis : suppression RLS + Realtime pour demandes cross-utilisateur

DROP POLICY IF EXISTS "Users can delete friend relations" ON public.friends;

CREATE POLICY "Users can delete friend relations"
  ON public.friends
  FOR DELETE
  TO authenticated
  USING (public.current_profile_name() IN (user_id, friend_id));

-- Realtime (INSERT/UPDATE/DELETE visibles par les deux parties)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'friends'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.friends;
  END IF;
END $$;

ALTER TABLE public.friends REPLICA IDENTITY FULL;
