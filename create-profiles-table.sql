-- Supprimer la table profiles si elle existe (attention: cela supprime toutes les données)
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Créer la table profiles avec la bonne structure
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL UNIQUE,
  avatar TEXT NOT NULL DEFAULT 'av1',
  initials TEXT NOT NULL,
  level INTEGER NOT NULL DEFAULT 1,
  xp INTEGER NOT NULL DEFAULT 0,
  bio TEXT DEFAULT '',
  status_text TEXT,
  age INTEGER,
  city VARCHAR(100),
  gender VARCHAR(20) CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Créer un index sur name pour les performances
CREATE INDEX IF NOT EXISTS idx_profiles_name ON public.profiles(name);

-- Activer RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Politique RLS : permettre à tous de lire les profils
CREATE POLICY "Allow public read access" ON public.profiles
  FOR SELECT
  TO public
  USING (true);

-- Politique RLS : permettre aux utilisateurs de mettre à jour leur propre profil
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Politique RLS : permettre aux utilisateurs d'insérer leur propre profil
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- Trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
