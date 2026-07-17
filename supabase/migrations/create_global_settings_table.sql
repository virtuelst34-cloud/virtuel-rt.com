-- Table pour les paramètres globaux du site
CREATE TABLE IF NOT EXISTS public.global_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  default_theme TEXT NOT NULL DEFAULT 'dark' CHECK (default_theme IN ('dark', 'light')),
  default_party_mode BOOLEAN NOT NULL DEFAULT false,
  default_accent_color TEXT NOT NULL DEFAULT 'purple',
  default_compact_mode BOOLEAN NOT NULL DEFAULT false,
  maintenance_mode BOOLEAN NOT NULL DEFAULT false,
  maintenance_message TEXT NOT NULL DEFAULT 'Le site est en maintenance. Revenez plus tard.',
  allow_guest_access BOOLEAN NOT NULL DEFAULT true,
  allow_registration BOOLEAN NOT NULL DEFAULT true,
  max_users INTEGER NOT NULL DEFAULT 1000,
  enable_notifications BOOLEAN NOT NULL DEFAULT true,
  enable_presence BOOLEAN NOT NULL DEFAULT true,
  enable_dm BOOLEAN NOT NULL DEFAULT true,
  enable_voice BOOLEAN NOT NULL DEFAULT false,
  auto_cleanup_days INTEGER NOT NULL DEFAULT 30,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by TEXT
);

-- Activer RLS
ALTER TABLE public.global_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Founders can update global settings" ON public.global_settings;
DROP POLICY IF EXISTS "Founders can insert global settings" ON public.global_settings;
DROP POLICY IF EXISTS "Everyone can read global settings" ON public.global_settings;

-- Politique : Seuls les fondateurs peuvent modifier les paramètres globaux
CREATE POLICY "Founders can update global settings"
  ON public.global_settings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.email = 'virtuelst34@gmail.com'
      AND profiles.is_founder = true
      AND auth.uid() = profiles.id
    )
  );

-- Politique : Seuls les fondateurs peuvent insérer des paramètres globaux
CREATE POLICY "Founders can insert global settings"
  ON public.global_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.email = 'virtuelst34@gmail.com'
      AND profiles.is_founder = true
      AND auth.uid() = profiles.id
    )
  );

-- Politique : Tout le monde peut lire les paramètres globaux
CREATE POLICY "Everyone can read global settings"
  ON public.global_settings
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- Trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_global_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.updated_by = auth.uid()::text;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_global_settings_updated_at ON public.global_settings;
CREATE TRIGGER trigger_update_global_settings_updated_at
  BEFORE UPDATE ON public.global_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_global_settings_updated_at();

-- Insérer les paramètres par défaut si la table est vide
INSERT INTO public.global_settings (default_theme, default_party_mode, default_accent_color, default_compact_mode, maintenance_mode, maintenance_message, allow_guest_access, allow_registration, max_users, enable_notifications, enable_presence, enable_dm, enable_voice, auto_cleanup_days)
SELECT 'dark', false, 'purple', false, false, 'Le site est en maintenance. Revenez plus tard.', true, true, 1000, true, true, true, false, 30
WHERE NOT EXISTS (SELECT 1 FROM public.global_settings);
