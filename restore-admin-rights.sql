-- Restaurer les droits admin et badge fondateur pour l'utilisateur principal
-- Remplacez 'VOTRE_NOM' par votre nom d'utilisateur actuel

-- Ajouter la colonne special_badges si elle n'existe pas
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS special_badges TEXT[] DEFAULT '{}';

-- Ajouter la colonne is_admin si elle n'existe pas
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- Restaurer les droits admin et badge fondateur (remplacez 'VOTRE_NOM' par votre nom)
UPDATE public.profiles 
SET 
  is_admin = true,
  special_badges = ARRAY['founder']::TEXT[]
WHERE name = 'VOTRE_NOM';

-- Vérifier la mise à jour
SELECT id, name, is_admin, special_badges FROM public.profiles WHERE name = 'VOTRE_NOM';
