-- Table pour les utilisateurs rendus muets
CREATE TABLE IF NOT EXISTS public.muted_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  muted_user_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, muted_user_id)
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_muted_users_user_id ON public.muted_users(user_id);
CREATE INDEX IF NOT EXISTS idx_muted_users_muted_user_id ON public.muted_users(muted_user_id);

-- Activer RLS
ALTER TABLE public.muted_users ENABLE ROW LEVEL SECURITY;

-- Supprimer les politiques existantes si elles existent
DROP POLICY IF EXISTS "Users can manage their own muted users" ON public.muted_users;

-- Politique : Les utilisateurs peuvent gérer leurs propres utilisateurs rendus muets
CREATE POLICY "Users can manage their own muted users"
  ON public.muted_users
  FOR ALL
  TO authenticated
  USING (
    auth.uid()::text = user_id
  )
  WITH CHECK (
    auth.uid()::text = user_id
  );
