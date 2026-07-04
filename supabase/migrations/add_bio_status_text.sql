-- Ajouter les colonnes bio et status_text à la table profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS status_text VARCHAR(60);

-- Commentaires sur les colonnes
COMMENT ON COLUMN public.profiles.bio IS 'Bio de l utilisateur (optionnel)';
COMMENT ON COLUMN public.profiles.status_text IS 'Statut personnalisé de l utilisateur (optionnel)';
