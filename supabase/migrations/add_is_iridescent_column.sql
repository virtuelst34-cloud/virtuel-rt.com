-- Ajouter la colonne is_iridescent pour le badge diamant iridescent spécial
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_iridescent BOOLEAN DEFAULT FALSE;

-- Commentaire sur la colonne
COMMENT ON COLUMN public.profiles.is_iridescent IS 'Indique si l utilisateur possède le badge diamant iridescent spécial (limité à 3 utilisateurs)';
