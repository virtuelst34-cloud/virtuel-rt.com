-- Table pour les relations d'amis
CREATE TABLE IF NOT EXISTS public.friends (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  friend_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, friend_id)
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_friends_user_id ON public.friends(user_id);
CREATE INDEX IF NOT EXISTS idx_friends_friend_id ON public.friends(friend_id);
CREATE INDEX IF NOT EXISTS idx_friends_status ON public.friends(status);

-- Activer RLS
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;

-- Supprimer les politiques existantes si elles existent
DROP POLICY IF EXISTS "Users can read their own friends" ON public.friends;
DROP POLICY IF EXISTS "Users can send friend requests" ON public.friends;
DROP POLICY IF EXISTS "Users can update friend status" ON public.friends;

-- Politique : Les utilisateurs peuvent lire leurs propres relations d'amis
-- Cette politique utilise les pseudos (user_id et friend_id sont des TEXT)
CREATE POLICY "Users can read their own friends"
  ON public.friends
  FOR SELECT
  TO authenticated
  USING (
    user_id IN (SELECT name FROM public.profiles WHERE id = auth.uid())
    OR friend_id IN (SELECT name FROM public.profiles WHERE id = auth.uid())
  );

-- Politique : Les utilisateurs peuvent envoyer des demandes d'amis
CREATE POLICY "Users can send friend requests"
  ON public.friends
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id IN (SELECT name FROM public.profiles WHERE id = auth.uid())
  );

-- Politique : Les utilisateurs peuvent mettre à jour le statut des demandes reçues
CREATE POLICY "Users can update friend status"
  ON public.friends
  FOR UPDATE
  TO authenticated
  USING (
    friend_id IN (SELECT name FROM public.profiles WHERE id = auth.uid())
  )
  WITH CHECK (
    friend_id IN (SELECT name FROM public.profiles WHERE id = auth.uid())
  );

-- Trigger pour mettre à jour updated_at automatiquement
DROP TRIGGER IF EXISTS trigger_update_friends_updated_at ON public.friends;
DROP FUNCTION IF EXISTS update_friends_updated_at();

CREATE OR REPLACE FUNCTION update_friends_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_friends_updated_at
  BEFORE UPDATE ON public.friends
  FOR EACH ROW
  EXECUTE FUNCTION update_friends_updated_at();
