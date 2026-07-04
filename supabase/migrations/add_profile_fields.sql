-- Ajouter les champs de personnalisation utilisateur (age, ville, sexe)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS age INTEGER,
ADD COLUMN IF NOT EXISTS city VARCHAR(100),
ADD COLUMN IF NOT EXISTS gender VARCHAR(20) CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say'));

-- Commentaires sur les colonnes
COMMENT ON COLUMN public.profiles.age IS 'Âge de l utilisateur (optionnel)';
COMMENT ON COLUMN public.profiles.city IS 'Ville de l utilisateur (optionnel)';
COMMENT ON COLUMN public.profiles.gender IS 'Sexe de l utilisateur (male, female, other, prefer_not_to_say)';
