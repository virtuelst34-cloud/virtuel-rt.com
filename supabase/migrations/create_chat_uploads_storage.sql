-- Bucket Storage pour les uploads de chat (images/fichiers)
-- Idempotent : ré-exécutable sans erreur

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-uploads',
  'chat-uploads',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Lecture publique des fichiers uploadés
DROP POLICY IF EXISTS "Public read chat uploads" ON storage.objects;
CREATE POLICY "Public read chat uploads" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'chat-uploads');

-- Upload : utilisateurs authentifiés dans leur dossier userId/*
DROP POLICY IF EXISTS "Authenticated upload chat files" ON storage.objects;
CREATE POLICY "Authenticated upload chat files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'chat-uploads'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Upload invité : dossier guest/* (mode sans compte Supabase)
DROP POLICY IF EXISTS "Anon upload guest chat files" ON storage.objects;
CREATE POLICY "Anon upload guest chat files" ON storage.objects
  FOR INSERT TO anon
  WITH CHECK (
    bucket_id = 'chat-uploads'
    AND (storage.foldername(name))[1] = 'guest'
  );

-- Suppression : propriétaire authentifié uniquement
DROP POLICY IF EXISTS "Users delete own chat uploads" ON storage.objects;
CREATE POLICY "Users delete own chat uploads" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'chat-uploads'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
