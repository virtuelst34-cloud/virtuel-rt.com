-- Créer la table permissions si elle n'existe pas
CREATE TABLE IF NOT EXISTS public.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section TEXT NOT NULL,
  action TEXT NOT NULL,
  user_identifier TEXT NOT NULL,
  identifier_type TEXT NOT NULL,
  allowed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Créer des indexes pour les performances
CREATE INDEX IF NOT EXISTS idx_permissions_section ON public.permissions(section);
CREATE INDEX IF NOT EXISTS idx_permissions_user_identifier ON public.permissions(user_identifier, identifier_type);
CREATE INDEX IF NOT EXISTS idx_permissions_section_action ON public.permissions(section, action);

-- Activer RLS
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

-- Politique RLS : permettre à tous de lire les permissions
CREATE POLICY "Allow public read access" ON public.permissions
  FOR SELECT
  TO public
  USING (true);

-- Politique RLS : permettre aux admins de modifier les permissions
CREATE POLICY "Admins can manage permissions" ON public.permissions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );
