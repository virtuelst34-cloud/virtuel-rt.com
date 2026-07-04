-- Nettoyer les données de test
DELETE FROM public.user_presence WHERE user_id IN ('08e06299-df94-4677-8416-f411a2668550', 'd4462bfb-27b7-4978-8d7f-16f3146abd58', '53da7852-96c0-47ac-8718-9e503252aa4d', 'kjhgkjhvj');
CREATE TABLE IF NOT EXISTS public.user_presence (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  avatar TEXT NOT NULL,
  initials TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'online' CHECK (status IN ('online', 'away', 'busy')),
  current_salon_id TEXT,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_user_presence_user_id ON public.user_presence(user_id);
CREATE INDEX IF NOT EXISTS idx_user_presence_current_salon_id ON public.user_presence(current_salon_id);
CREATE INDEX IF NOT EXISTS idx_user_presence_last_seen ON public.user_presence(last_seen);

-- Activer Row Level Security
ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;

-- Supprimer les policies existantes si elles existent
DROP POLICY IF EXISTS "Allow public read access" ON public.user_presence;
DROP POLICY IF EXISTS "Allow users to update own presence" ON public.user_presence;
DROP POLICY IF EXISTS "Allow users to insert own presence" ON public.user_presence;
DROP POLICY IF EXISTS "Allow users to delete own presence" ON public.user_presence;

-- Politique RLS : permettre à tous de lire la présence (pour afficher les utilisateurs en ligne)
CREATE POLICY "Allow public read access" ON public.user_presence
  FOR SELECT
  TO public
  USING (true);

-- Politique RLS : permettre aux utilisateurs authentifiés de mettre à jour leur propre présence
CREATE POLICY "Allow authenticated users to update own presence" ON public.user_presence
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid()::text);

-- Politique RLS : permettre aux utilisateurs authentifiés d'insérer leur propre présence
CREATE POLICY "Allow authenticated users to insert own presence" ON public.user_presence
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid()::text);

-- Politique RLS : permettre aux utilisateurs authentifiés de supprimer leur propre présence
CREATE POLICY "Allow authenticated users to delete own presence" ON public.user_presence
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid()::text);

-- Politique RLS : permettre à tous (invités inclus) d'insérer/mettre à jour leur propre présence via user_id
CREATE POLICY "Allow users to manage own presence by name" ON public.user_presence
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Fonction pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Supprimer le trigger existant s'il existe
DROP TRIGGER IF EXISTS update_user_presence_updated_at ON public.user_presence;

-- Trigger pour mettre à jour updated_at automatiquement
CREATE TRIGGER update_user_presence_updated_at
  BEFORE UPDATE ON public.user_presence
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Fonction de nettoyage des présences inactives (plus de 5 minutes)
CREATE OR REPLACE FUNCTION cleanup_inactive_presences()
RETURNS void AS $$
BEGIN
  DELETE FROM public.user_presence
  WHERE last_seen < NOW() - INTERVAL '5 minutes';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Commentaire sur la table
COMMENT ON TABLE public.user_presence IS 'Table de gestion de la présence des utilisateurs en temps réel';
