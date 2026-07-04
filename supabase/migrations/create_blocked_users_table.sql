-- Table pour les utilisateurs bloqués
CREATE TABLE IF NOT EXISTS public.blocked_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  blocked_user_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, blocked_user_id)
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_blocked_users_user_id ON public.blocked_users(user_id);
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocked_user_id ON public.blocked_users(blocked_user_id);

-- Activer RLS
ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;

-- Supprimer les politiques existantes si elles existent
DROP POLICY IF EXISTS "Users can manage their own blocked users" ON public.blocked_users;

-- Politique : Les utilisateurs peuvent gérer leurs propres utilisateurs bloqués
CREATE POLICY "Users can manage their own blocked users"
  ON public.blocked_users
  FOR ALL
  TO authenticated
  USING (
    auth.uid()::text = user_id
  )
  WITH CHECK (
    auth.uid()::text = user_id
  );
