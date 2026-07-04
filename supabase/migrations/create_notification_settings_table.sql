-- Table pour les paramètres de notification globaux
CREATE TABLE IF NOT EXISTS public.notification_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  enable_email_notifications BOOLEAN NOT NULL DEFAULT false,
  enable_push_notifications BOOLEAN NOT NULL DEFAULT true,
  enable_sound_notifications BOOLEAN NOT NULL DEFAULT true,
  enable_desktop_notifications BOOLEAN NOT NULL DEFAULT true,
  notification_sound TEXT NOT NULL DEFAULT 'default',
  notification_duration INTEGER NOT NULL DEFAULT 5000,
  enable_mentions BOOLEAN NOT NULL DEFAULT true,
  enable_dm_notifications BOOLEAN NOT NULL DEFAULT true,
  enable_salon_notifications BOOLEAN NOT NULL DEFAULT true,
  enable_system_notifications BOOLEAN NOT NULL DEFAULT true,
  notification_cooldown INTEGER NOT NULL DEFAULT 1000,
  max_notifications_per_hour INTEGER NOT NULL DEFAULT 50,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by TEXT
);

-- Activer RLS
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

-- Politique : Seuls les fondateurs peuvent modifier les paramètres de notification
CREATE POLICY "Founders can update notification settings"
  ON public.notification_settings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.email = 'virtuelst34@gmail.com'
      AND profiles.is_founder = true
      AND auth.uid()::text = profiles.id
    )
  );

-- Politique : Seuls les fondateurs peuvent insérer des paramètres de notification
CREATE POLICY "Founders can insert notification settings"
  ON public.notification_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.email = 'virtuelst34@gmail.com'
      AND profiles.is_founder = true
      AND auth.uid()::text = profiles.id
    )
  );

-- Politique : Tout le monde peut lire les paramètres de notification
CREATE POLICY "Everyone can read notification settings"
  ON public.notification_settings
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- Trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_notification_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.updated_by = auth.uid()::text;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_notification_settings_updated_at
  BEFORE UPDATE ON public.notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_settings_updated_at();

-- Insérer les paramètres par défaut si la table est vide
INSERT INTO public.notification_settings (enable_email_notifications, enable_push_notifications, enable_sound_notifications, enable_desktop_notifications, notification_sound, notification_duration, enable_mentions, enable_dm_notifications, enable_salon_notifications, enable_system_notifications, notification_cooldown, max_notifications_per_hour)
SELECT false, true, true, true, 'default', 5000, true, true, true, true, 1000, 50
WHERE NOT EXISTS (SELECT 1 FROM public.notification_settings);
