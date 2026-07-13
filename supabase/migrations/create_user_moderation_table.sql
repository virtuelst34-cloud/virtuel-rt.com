-- Modération persistée (ban/mute par pseudo)
CREATE TABLE IF NOT EXISTS public.user_moderation (
  user_name TEXT PRIMARY KEY,
  is_banned BOOLEAN NOT NULL DEFAULT false,
  is_muted BOOLEAN NOT NULL DEFAULT false,
  ban_reason TEXT NOT NULL DEFAULT '',
  moderated_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_moderation_banned ON public.user_moderation (is_banned) WHERE is_banned = true;
CREATE INDEX IF NOT EXISTS idx_user_moderation_muted ON public.user_moderation (is_muted) WHERE is_muted = true;

ALTER TABLE public.user_moderation ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read moderation status" ON public.user_moderation;
DROP POLICY IF EXISTS "Admins can manage moderation" ON public.user_moderation;

CREATE POLICY "Anyone can read moderation status"
  ON public.user_moderation FOR SELECT TO authenticated, anon USING (true);

CREATE POLICY "Admins can manage moderation"
  ON public.user_moderation FOR ALL TO authenticated
  USING (public.is_site_admin())
  WITH CHECK (public.is_site_admin());
