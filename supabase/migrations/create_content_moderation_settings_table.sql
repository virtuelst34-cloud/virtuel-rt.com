-- Table pour les paramètres de modération de contenu
CREATE TABLE IF NOT EXISTS public.content_moderation_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  enable_auto_moderation BOOLEAN NOT NULL DEFAULT true,
  auto_moderation_threshold NUMERIC NOT NULL DEFAULT 0.7,
  enable_spam_detection BOOLEAN NOT NULL DEFAULT true,
  spam_threshold NUMERIC NOT NULL DEFAULT 0.8,
  enable_link_filtering BOOLEAN NOT NULL DEFAULT true,
  blocked_domains TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  banned_words TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  enable_ai_moderation BOOLEAN NOT NULL DEFAULT false,
  ai_moderation_model TEXT NOT NULL DEFAULT 'gpt-4',
  enable_report_review BOOLEAN NOT NULL DEFAULT true,
  auto_ban_on_violation BOOLEAN NOT NULL DEFAULT false,
  violation_threshold INTEGER NOT NULL DEFAULT 5,
  enable_content_queue BOOLEAN NOT NULL DEFAULT false,
  require_approval_for_new_users BOOLEAN NOT NULL DEFAULT false,
  approval_post_count INTEGER NOT NULL DEFAULT 3,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by TEXT
);

-- Activer RLS
ALTER TABLE public.content_moderation_settings ENABLE ROW LEVEL SECURITY;

-- Supprimer les politiques existantes si elles existent
DROP POLICY IF EXISTS "Founders can update content moderation settings" ON public.content_moderation_settings;
DROP POLICY IF EXISTS "Founders can insert content moderation settings" ON public.content_moderation_settings;
DROP POLICY IF EXISTS "Everyone can read content moderation settings" ON public.content_moderation_settings;

-- Politique : Seuls les fondateurs peuvent modifier les paramètres de modération
CREATE POLICY "Founders can update content moderation settings"
  ON public.content_moderation_settings
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

-- Politique : Seuls les fondateurs peuvent insérer des paramètres de modération
CREATE POLICY "Founders can insert content moderation settings"
  ON public.content_moderation_settings
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

-- Politique : Tout le monde peut lire les paramètres de modération
CREATE POLICY "Everyone can read content moderation settings"
  ON public.content_moderation_settings
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- Trigger pour mettre à jour updated_at automatiquement
DROP TRIGGER IF EXISTS trigger_update_content_moderation_settings_updated_at ON public.content_moderation_settings;
DROP FUNCTION IF EXISTS update_content_moderation_settings_updated_at();

CREATE OR REPLACE FUNCTION update_content_moderation_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.updated_by = auth.uid()::text;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_content_moderation_settings_updated_at
  BEFORE UPDATE ON public.content_moderation_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_content_moderation_settings_updated_at();

-- Insérer les paramètres par défaut si la table est vide
INSERT INTO public.content_moderation_settings (enable_auto_moderation, auto_moderation_threshold, enable_spam_detection, spam_threshold, enable_link_filtering, blocked_domains, banned_words, enable_ai_moderation, ai_moderation_model, enable_report_review, auto_ban_on_violation, violation_threshold, enable_content_queue, require_approval_for_new_users, approval_post_count)
SELECT true, 0.7, true, 0.8, true, ARRAY[]::TEXT[], ARRAY[]::TEXT[], false, 'gpt-4', true, false, 5, false, false, 3
WHERE NOT EXISTS (SELECT 1 FROM public.content_moderation_settings);
