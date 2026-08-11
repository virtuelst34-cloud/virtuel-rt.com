-- Salons: ordre d'affichage, description, créateur
-- Appliquer via: npm run supabase:apply
-- ou SQL Editor Supabase (coller ce fichier).

ALTER TABLE public.salons
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 1000;

ALTER TABLE public.salons
  ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '';

ALTER TABLE public.salons
  ADD COLUMN IF NOT EXISTS created_by TEXT;

-- Ordre d'affichage pour tous les salons (built-in + custom)
CREATE TABLE IF NOT EXISTS public.salon_display_order (
  salon_id TEXT PRIMARY KEY,
  sort_order INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.salon_display_order ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read salon_display_order" ON public.salon_display_order;
CREATE POLICY "Anyone can read salon_display_order"
ON public.salon_display_order
FOR SELECT
TO public
USING (true);

DROP POLICY IF EXISTS "Authenticated can upsert salon_display_order" ON public.salon_display_order;
CREATE POLICY "Authenticated can upsert salon_display_order"
ON public.salon_display_order
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Ordre initial des salons built-in (idempotent)
INSERT INTO public.salon_display_order (salon_id, sort_order) VALUES
  ('bienvenue', 0),
  ('musique60', 10),
  ('musique80', 20),
  ('karaoke', 30),
  ('debat', 40),
  ('quiz', 50),
  ('jeunes', 60),
  ('lgbt', 70),
  ('divorce', 80),
  ('libre', 90),
  ('insulte', 100),
  ('cameras', 110),
  ('bar', 120)
ON CONFLICT (salon_id) DO NOTHING;

-- Index pour tri rapide
CREATE INDEX IF NOT EXISTS idx_salons_sort_order ON public.salons (sort_order);
CREATE INDEX IF NOT EXISTS idx_salon_display_order_sort ON public.salon_display_order (sort_order);

-- Permissions salons étendues (rôles modération+)
INSERT INTO public.permissions (section, action, user_identifier, identifier_type, allowed)
SELECT v.section, v.action, v.user_identifier, v.identifier_type, v.allowed
FROM (VALUES
  ('salons', 'edit_custom', 'moderator', 'badge', true),
  ('salons', 'edit_custom', 'master_op', 'badge', true),
  ('salons', 'edit_custom', 'direction', 'badge', true),
  ('salons', 'edit_custom', 'founder', 'badge', true),
  ('salons', 'reorder', 'moderator', 'badge', true),
  ('salons', 'reorder', 'master_op', 'badge', true),
  ('salons', 'reorder', 'direction', 'badge', true),
  ('salons', 'reorder', 'founder', 'badge', true),
  ('salons', 'manage_messages', 'moderator', 'badge', true),
  ('salons', 'manage_messages', 'master_op', 'badge', true),
  ('salons', 'manage_messages', 'direction', 'badge', true),
  ('salons', 'manage_messages', 'founder', 'badge', true),
  ('salons', 'pin_messages', 'moderator', 'badge', true),
  ('salons', 'pin_messages', 'master_op', 'badge', true),
  ('salons', 'pin_messages', 'direction', 'badge', true),
  ('salons', 'pin_messages', 'founder', 'badge', true),
  ('salons', 'delete_custom', 'moderator', 'badge', true),
  ('salons', 'create_custom', 'authenticated', 'user_type', true),
  ('salons', 'view_all', 'guest', 'user_type', true),
  ('salons', 'view_all', 'authenticated', 'user_type', true)
) AS v(section, action, user_identifier, identifier_type, allowed)
WHERE NOT EXISTS (
  SELECT 1 FROM public.permissions p
  WHERE p.section = v.section
    AND p.action = v.action
    AND p.user_identifier = v.user_identifier
    AND p.identifier_type = v.identifier_type
);
