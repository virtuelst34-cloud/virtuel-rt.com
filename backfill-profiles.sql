-- Créer des profils pour les utilisateurs existants qui n'en ont pas
INSERT INTO public.profiles (id, name, avatar, initials)
SELECT 
  au.id,
  COALESCE(au.raw_user_meta_data->>'name', split_part(au.email, '@', 1)),
  'av1',
  UPPER(SUBSTRING(COALESCE(au.raw_user_meta_data->>'name', split_part(au.email, '@', 1)), 1, 2))
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = au.id
);
