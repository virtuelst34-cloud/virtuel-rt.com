-- Ajouter les colonnes bio et status_text à la table profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS status_text TEXT;
