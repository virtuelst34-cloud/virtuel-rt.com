-- =============================================================================
-- Virtuel-RT — Schéma Supabase consolidé
-- =============================================================================
-- Usage : exécuter dans l'éditeur SQL Supabase (SQL Editor → New query → Run)
-- Idempotent : peut être relancé sans erreur sur un projet existant.
-- Les migrations individuelles dans supabase/migrations/ restent la source
-- de vérité pour les évolutions incrémentales.
-- =============================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- TABLES CORE
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  avatar TEXT NOT NULL DEFAULT 'av1',
  initials TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'online' CHECK (status IN ('online', 'offline', 'away', 'busy')),
  level INTEGER NOT NULL DEFAULT 1,
  xp INTEGER NOT NULL DEFAULT 0,
  is_premium BOOLEAN NOT NULL DEFAULT false,
  email TEXT,
  email_confirmed_at TIMESTAMPTZ,
  is_founder BOOLEAN NOT NULL DEFAULT false,
  is_direction BOOLEAN NOT NULL DEFAULT false,
  is_master_op BOOLEAN NOT NULL DEFAULT false,
  is_iridescent BOOLEAN NOT NULL DEFAULT false,
  bio TEXT DEFAULT '',
  status_text TEXT,
  age INTEGER,
  city VARCHAR(100),
  gender VARCHAR(20) CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  salon_id TEXT NOT NULL,
  author_name TEXT NOT NULL,
  author_avatar TEXT NOT NULL,
  author_initials TEXT NOT NULL,
  text TEXT NOT NULL,
  created_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reactions JSONB DEFAULT '{}',
  pinned BOOLEAN DEFAULT false,
  is_system BOOLEAN DEFAULT false,
  is_announcement BOOLEAN DEFAULT false,
  reply_to TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.salons (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'chat',
  icon TEXT NOT NULL DEFAULT 'DoorOpen',
  count INTEGER DEFAULT 0,
  live BOOLEAN DEFAULT false,
  welcome TEXT NOT NULL DEFAULT '',
  password TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.xp_monthly (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_name TEXT NOT NULL,
  xp INTEGER NOT NULL DEFAULT 0,
  month TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_name, month)
);

CREATE TABLE IF NOT EXISTS public.preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_name TEXT NOT NULL UNIQUE,
  theme TEXT NOT NULL DEFAULT 'dark' CHECK (theme IN ('dark', 'light')),
  party_mode BOOLEAN NOT NULL DEFAULT false,
  is_premium BOOLEAN NOT NULL DEFAULT false,
  accent_color TEXT NOT NULL DEFAULT 'purple',
  compact_mode BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.custom_badges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  min_level INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  target_id TEXT NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('message', 'user')),
  target_name TEXT,
  target_content TEXT,
  reason TEXT NOT NULL,
  description TEXT,
  reporter TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  section TEXT NOT NULL,
  action TEXT NOT NULL,
  user_identifier TEXT NOT NULL,
  identifier_type TEXT NOT NULL DEFAULT 'user_type' CHECK (identifier_type IN ('user_type', 'badge')),
  allowed BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.salon_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  salon_id TEXT NOT NULL UNIQUE,
  welcome_message TEXT,
  welcome_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- TABLES SOCIALES & PRÉSENCE
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.friends (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  friend_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, friend_id)
);

CREATE TABLE IF NOT EXISTS public.direct_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id TEXT NOT NULL,
  receiver_id TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  reactions JSONB DEFAULT '{}',
  image_url TEXT
);

CREATE TABLE IF NOT EXISTS public.user_presence (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  avatar TEXT NOT NULL,
  initials TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'online' CHECK (status IN ('online', 'away', 'busy')),
  current_salon_id TEXT,
  last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.blocked_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  blocked_user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, blocked_user_id)
);

CREATE TABLE IF NOT EXISTS public.muted_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  muted_user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, muted_user_id)
);

-- -----------------------------------------------------------------------------
-- TABLES ADMIN / PARAMÈTRES
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.global_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  default_theme TEXT NOT NULL DEFAULT 'dark',
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
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by TEXT
);

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
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by TEXT
);

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
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by TEXT
);

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
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by TEXT
);

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
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by TEXT
);

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
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by TEXT
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  action TEXT NOT NULL,
  user_id TEXT,
  user_name TEXT,
  details TEXT,
  ip_address TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error', 'critical'))
);

-- -----------------------------------------------------------------------------
-- INDEX
-- -----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_messages_salon_id ON public.messages(salon_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_date ON public.messages(created_date DESC);
CREATE INDEX IF NOT EXISTS idx_friends_user_id ON public.friends(user_id);
CREATE INDEX IF NOT EXISTS idx_friends_friend_id ON public.friends(friend_id);
CREATE INDEX IF NOT EXISTS idx_direct_messages_sender ON public.direct_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_direct_messages_receiver ON public.direct_messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_user_presence_salon ON public.user_presence(current_salon_id);
CREATE INDEX IF NOT EXISTS idx_blocked_users_user_id ON public.blocked_users(user_id);
CREATE INDEX IF NOT EXISTS idx_muted_users_user_id ON public.muted_users(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.audit_logs(timestamp DESC);

-- -----------------------------------------------------------------------------
-- FONCTIONS UTILITAIRES
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.cleanup_inactive_presences()
RETURNS void AS $$
BEGIN
  DELETE FROM public.user_presence
  WHERE last_seen < NOW() - INTERVAL '5 minutes';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Nom du profil connecté (évite les comparaisons uuid/text dans les politiques RLS)
CREATE OR REPLACE FUNCTION public.current_profile_name()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT name FROM public.profiles WHERE id = auth.uid();
$$;

-- -----------------------------------------------------------------------------
-- ROW LEVEL SECURITY — Politiques essentielles
-- -----------------------------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.muted_users ENABLE ROW LEVEL SECURITY;

-- Messages : lecture publique, écriture authentifiée
DROP POLICY IF EXISTS "Anyone can read messages" ON public.messages;
CREATE POLICY "Anyone can read messages" ON public.messages FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Authenticated can insert messages" ON public.messages;
CREATE POLICY "Authenticated can insert messages" ON public.messages FOR INSERT TO authenticated WITH CHECK (true);

-- Présence : lecture publique, gestion ouverte (invités inclus)
DROP POLICY IF EXISTS "Allow public read presence" ON public.user_presence;
CREATE POLICY "Allow public read presence" ON public.user_presence FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Allow users to manage own presence" ON public.user_presence;
CREATE POLICY "Allow users to manage own presence" ON public.user_presence FOR ALL TO public USING (true) WITH CHECK (true);

-- Friends & DM : basés sur le nom de profil
DROP POLICY IF EXISTS "Users can read their own friends" ON public.friends;
CREATE POLICY "Users can read their own friends" ON public.friends FOR SELECT TO authenticated
  USING (public.current_profile_name() IN (user_id, friend_id));

DROP POLICY IF EXISTS "Users can send friend requests" ON public.friends;
CREATE POLICY "Users can send friend requests" ON public.friends FOR INSERT TO authenticated
  WITH CHECK (public.current_profile_name() = user_id);

DROP POLICY IF EXISTS "Users can update friend status" ON public.friends;
CREATE POLICY "Users can update friend status" ON public.friends FOR UPDATE TO authenticated
  USING (public.current_profile_name() = friend_id)
  WITH CHECK (public.current_profile_name() = friend_id);

DROP POLICY IF EXISTS "Users can read their own messages" ON public.direct_messages;
CREATE POLICY "Users can read their own messages" ON public.direct_messages FOR SELECT TO authenticated
  USING (public.current_profile_name() IN (sender_id, receiver_id));

DROP POLICY IF EXISTS "Users can send messages" ON public.direct_messages;
CREATE POLICY "Users can send messages" ON public.direct_messages FOR INSERT TO authenticated
  WITH CHECK (public.current_profile_name() = sender_id);

DROP POLICY IF EXISTS "Users can update read status" ON public.direct_messages;
CREATE POLICY "Users can update read status" ON public.direct_messages FOR UPDATE TO authenticated
  USING (public.current_profile_name() = receiver_id)
  WITH CHECK (public.current_profile_name() = receiver_id);

-- Bloqués / muets : user_id = nom du profil
DROP POLICY IF EXISTS "Users can manage their own blocked users" ON public.blocked_users;
CREATE POLICY "Users can manage their own blocked users" ON public.blocked_users FOR ALL TO authenticated
  USING (public.current_profile_name() = user_id)
  WITH CHECK (public.current_profile_name() = user_id);

DROP POLICY IF EXISTS "Users can manage their own muted users" ON public.muted_users;
CREATE POLICY "Users can manage their own muted users" ON public.muted_users FOR ALL TO authenticated
  USING (public.current_profile_name() = user_id)
  WITH CHECK (public.current_profile_name() = user_id);

-- -----------------------------------------------------------------------------
-- DONNÉES PAR DÉFAUT (settings admin)
-- -----------------------------------------------------------------------------

INSERT INTO public.global_settings (default_theme)
SELECT 'dark' WHERE NOT EXISTS (SELECT 1 FROM public.global_settings);

INSERT INTO public.security_settings (enable_2fa)
SELECT false WHERE NOT EXISTS (SELECT 1 FROM public.security_settings);

INSERT INTO public.message_settings (max_message_length)
SELECT 1000 WHERE NOT EXISTS (SELECT 1 FROM public.message_settings);

INSERT INTO public.notification_settings (enable_push_notifications)
SELECT true WHERE NOT EXISTS (SELECT 1 FROM public.notification_settings);

INSERT INTO public.content_moderation_settings (enable_auto_moderation)
SELECT true WHERE NOT EXISTS (SELECT 1 FROM public.content_moderation_settings);

INSERT INTO public.logs_audit_settings (enable_logging)
SELECT true WHERE NOT EXISTS (SELECT 1 FROM public.logs_audit_settings);

-- -----------------------------------------------------------------------------
-- REALTIME
-- Activer manuellement dans Supabase Dashboard → Database → Replication :
--   messages, user_presence, direct_messages
-- -----------------------------------------------------------------------------
