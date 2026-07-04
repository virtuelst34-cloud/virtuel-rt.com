-- Table pour les paramètres de logs et audit
CREATE TABLE IF NOT EXISTS public.logs_audit_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  enable_logging BOOLEAN NOT NULL DEFAULT true,
  log_retention_days INTEGER NOT NULL DEFAULT 30,
  log_admin_actions BOOLEAN NOT NULL DEFAULT true,
  log_user_actions BOOLEAN NOT NULL DEFAULT true,
  log_security_events BOOLEAN NOT NULL DEFAULT true,
  log_api_calls BOOLEAN NOT NULL DEFAULT false,
  enable_log_export BOOLEAN NOT NULL DEFAULT true,
  enable_realtime_monitoring BOOLEAN NOT NULL DEFAULT true,
  alert_on_critical BOOLEAN NOT NULL DEFAULT true,
  alert_email_recipients TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by TEXT
);

-- Table pour les logs d'audit
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  action TEXT NOT NULL,
  user_id TEXT,
  user_name TEXT,
  details TEXT,
  ip_address TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error', 'critical'))
);

-- Activer RLS sur logs_audit_settings
ALTER TABLE public.logs_audit_settings ENABLE ROW LEVEL SECURITY;

-- Supprimer les politiques existantes si elles existent
DROP POLICY IF EXISTS "Founders can update logs audit settings" ON public.logs_audit_settings;
DROP POLICY IF EXISTS "Founders can insert logs audit settings" ON public.logs_audit_settings;
DROP POLICY IF EXISTS "Everyone can read logs audit settings" ON public.logs_audit_settings;

-- Politique : Seuls les fondateurs peuvent modifier les paramètres de logs
CREATE POLICY "Founders can update logs audit settings"
  ON public.logs_audit_settings
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

-- Politique : Seuls les fondateurs peuvent insérer des paramètres de logs
CREATE POLICY "Founders can insert logs audit settings"
  ON public.logs_audit_settings
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

-- Politique : Tout le monde peut lire les paramètres de logs
CREATE POLICY "Everyone can read logs audit settings"
  ON public.logs_audit_settings
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- Activer RLS sur audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Supprimer les politiques existantes si elles existent
DROP POLICY IF EXISTS "Founders can read audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Founders can insert audit logs" ON public.audit_logs;

-- Politique : Seuls les fondateurs peuvent lire les logs d'audit
CREATE POLICY "Founders can read audit logs"
  ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.email = 'virtuelst34@gmail.com'
      AND profiles.is_founder = true
      AND auth.uid()::text = profiles.id
    )
  );

-- Politique : Seuls les fondateurs peuvent insérer des logs d'audit
CREATE POLICY "Founders can insert audit logs"
  ON public.audit_logs
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

-- Trigger pour mettre à jour updated_at automatiquement sur logs_audit_settings
DROP TRIGGER IF EXISTS trigger_update_logs_audit_settings_updated_at ON public.logs_audit_settings;
DROP FUNCTION IF EXISTS update_logs_audit_settings_updated_at();

CREATE OR REPLACE FUNCTION update_logs_audit_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.updated_by = auth.uid()::text;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_logs_audit_settings_updated_at
  BEFORE UPDATE ON public.logs_audit_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_logs_audit_settings_updated_at();

-- Insérer les paramètres par défaut si la table est vide
INSERT INTO public.logs_audit_settings (enable_logging, log_retention_days, log_admin_actions, log_user_actions, log_security_events, log_api_calls, enable_log_export, enable_realtime_monitoring, alert_on_critical, alert_email_recipients)
SELECT true, 30, true, true, true, false, true, true, true, ARRAY[]::TEXT[]
WHERE NOT EXISTS (SELECT 1 FROM public.logs_audit_settings);

-- Index pour améliorer les performances des requêtes sur audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_severity ON public.audit_logs(severity);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
