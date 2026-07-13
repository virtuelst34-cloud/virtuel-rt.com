-- Table pour les paramètres de messages
CREATE TABLE IF NOT EXISTS public.message_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  max_message_length INTEGER NOT NULL DEFAULT 1000,
  min_message_length INTEGER NOT NULL DEFAULT 1,
  message_cooldown_ms INTEGER NOT NULL DEFAULT 1000,
  enable_message_editing BOOLEAN NOT NULL DEFAULT true,
  edit_time_limit_minutes INTEGER NOT NULL DEFAULT 15,
  enable_message_reactions BOOLEAN NOT NULL DEFAULT true,
  enable_message_pinning BOOLEAN NOT NULL DEFAULT true,
  max_pinned_messages INTEGER NOT NULL DEFAULT 5,
  auto_delete_messages_days INTEGER NOT NULL DEFAULT 0,
  enable_message_deletion BOOLEAN NOT NULL DEFAULT true,
  enable_image_upload BOOLEAN NOT NULL DEFAULT true,
  max_image_size_mb INTEGER NOT NULL DEFAULT 5,
  enable_link_preview BOOLEAN NOT NULL DEFAULT true,
  enable_code_blocks BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by TEXT
);

-- Activer RLS
ALTER TABLE public.message_settings ENABLE ROW LEVEL SECURITY;

-- Supprimer les politiques existantes si elles existent
DROP POLICY IF EXISTS "Founders can update message settings" ON public.message_settings;
DROP POLICY IF EXISTS "Founders can insert message settings" ON public.message_settings;
DROP POLICY IF EXISTS "Everyone can read message settings" ON public.message_settings;

-- Politique : Seuls les fondateurs peuvent modifier les paramètres de messages
CREATE POLICY "Founders can update message settings"
  ON public.message_settings
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

-- Politique : Seuls les fondateurs peuvent insérer des paramètres de messages
CREATE POLICY "Founders can insert message settings"
  ON public.message_settings
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

-- Politique : Tout le monde peut lire les paramètres de messages
CREATE POLICY "Everyone can read message settings"
  ON public.message_settings
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- Trigger pour mettre à jour updated_at automatiquement
DROP TRIGGER IF EXISTS trigger_update_message_settings_updated_at ON public.message_settings;
DROP FUNCTION IF EXISTS update_message_settings_updated_at();

CREATE OR REPLACE FUNCTION update_message_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.updated_by = auth.uid()::text;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_message_settings_updated_at
  BEFORE UPDATE ON public.message_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_message_settings_updated_at();

-- Insérer les paramètres par défaut si la table est vide
INSERT INTO public.message_settings (max_message_length, min_message_length, message_cooldown_ms, enable_message_editing, edit_time_limit_minutes, enable_message_reactions, enable_message_pinning, max_pinned_messages, auto_delete_messages_days, enable_message_deletion, enable_image_upload, max_image_size_mb, enable_link_preview, enable_code_blocks)
SELECT 1000, 1, 1000, true, 15, true, true, 5, 0, true, true, 5, true, true
WHERE NOT EXISTS (SELECT 1 FROM public.message_settings);
