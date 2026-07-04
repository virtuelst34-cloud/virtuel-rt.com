-- Debug: Vérifier la structure de la table profiles
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Debug: Vérifier les données dans profiles
SELECT id, name, avatar, initials 
FROM public.profiles 
LIMIT 5;

-- Debug: Vérifier l'auth.uid() actuel
SELECT auth.uid();

-- Debug: Tester la requête RLS
SELECT name::text FROM public.profiles WHERE id = auth.uid()::text;
