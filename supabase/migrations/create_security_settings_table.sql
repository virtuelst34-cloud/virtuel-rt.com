-- Table pour les paramètres de sécurité
CREATE TABLE IF NOT EXISTS public.security_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  enable_2fa BOOLEAN NOT NULL DEFAULT false,
  require_2fa_for_admins BOOLEAN NOT NULL DEFAULT true,
  max_login_attempts INTEGER NOT NULL DEFAULT 5,
  lockout_duration_minutes INTEGER NOT NULL DEFAULT 30,
  enable_ip_banning BOOLEAN NOT NULL DEFAULT true,
  auto_ban_threshold INTEGER NOT NULL DEFAULT 10,
  auto_ban_duration_hours INTEGER NOT NULL DEFAULT 24,
  enable_content_filtering BOOLEAN NOT NULL DEFAULT true,
  filter_profanity BOOLEAN NOT NULL DEFAULT true,
  filter_personal_info BOOLEAN NOT NULL DEFAULT true,
  enable_rate_limiting BOOLEAN NOT NULL DEFAULT true,
  rate_limit_per_minute INTEGER NOT NULL DEFAULT 10,
  rate_limit_per_hour INTEGER NOT NULL DEFAULT 100,
  enable_session_timeout BOOLEAN NOT NULL DEFAULT true,
  session_timeout_minutes INTEGER NOT NULL DEFAULT 60,
  enable_captcha BOOLEAN NOT NULL DEFAULT false,
  captcha_threshold INTEGER NOT NULL DEFAULT 3,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by TEXT
);

-- Activer RLS
ALTER TABLE public.security_settings ENABLE ROW LEVEL SECURITY;

-- Supprimer les politiques existantes si elles existent
DROP POLICY IF EXISTS "Founders can update security settings" ON public.security_settings;
DROP POLICY IF EXISTS "Founders can insert security settings" ON public.security_settings;
DROP POLICY IF EXISTS "Everyone can read security settings" ON public.security_settings;

-- Politique : Seuls les fondateurs peuvent modifier les paramètres de sécurité
CREATE POLICY "Founders can update security settings"
  ON public.security_settings
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

-- Politique : Seuls les fondateurs peuvent insérer des paramètres de sécurité
CREATE POLICY "Founders can insert security settings"
  ON public.security_settings
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

-- Politique : Tout le monde peut lire les paramètres de sécurité
CREATE POLICY "Everyone can read security settings"
  ON public.security_settings
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- Trigger pour mettre à jour updated_at automatiquement
DROP TRIGGER IF EXISTS trigger_update_security_settings_updated_at ON public.security_settings;
DROP FUNCTION IF EXISTS update_security_settings_updated_at();

CREATE OR REPLACE FUNCTION update_security_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.updated_by = auth.uid()::text;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_security_settings_updated_at
  BEFORE UPDATE ON public.security_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_security_settings_updated_at();

-- Insérer les paramètres par défaut si la table est vide
INSERT INTO public.security_settings (enable_2fa, require_2fa_for_admins, max_login_attempts, lockout_duration_minutes, enable_ip_banning, auto_ban_threshold, auto_ban_duration_hours, enable_content_filtering, filter_profanity, filter_personal_info, enable_rate_limiting, rate_limit_per_minute, rate_limit_per_hour, enable_session_timeout, session_timeout_minutes, enable_captcha, captcha_threshold)
SELECT false, true, 5, 30, true, 10, 24, true, true, true, true, 10, 100, true, 60, false, 3
WHERE NOT EXISTS (SELECT 1 FROM public.security_settings);
