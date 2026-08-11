-- Catégories de salons + colonnes category_id / subcategory / is_coquin
-- Appliquer via: npm run supabase:apply

CREATE TABLE IF NOT EXISTS public.salon_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  emoji TEXT NOT NULL DEFAULT '💬',
  description TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 100,
  subcategories TEXT[] NOT NULL DEFAULT '{}',
  is_coquin BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.salon_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read salon_categories" ON public.salon_categories;
CREATE POLICY "Anyone can read salon_categories"
ON public.salon_categories
FOR SELECT
TO public
USING (true);

DROP POLICY IF EXISTS "Authenticated can manage salon_categories" ON public.salon_categories;
CREATE POLICY "Authenticated can manage salon_categories"
ON public.salon_categories
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

ALTER TABLE public.salons
  ADD COLUMN IF NOT EXISTS category_id TEXT REFERENCES public.salon_categories(id) ON DELETE SET NULL;

ALTER TABLE public.salons
  ADD COLUMN IF NOT EXISTS subcategory TEXT NOT NULL DEFAULT '';

ALTER TABLE public.salons
  ADD COLUMN IF NOT EXISTS is_coquin BOOLEAN NOT NULL DEFAULT false;

-- Catégories par défaut (idempotent)
INSERT INTO public.salon_categories (id, name, emoji, description, sort_order, subcategories, is_coquin) VALUES
  ('general', 'Général', '🏠', 'Accueil et salons principaux', 0, ARRAY['Accueil','Annonces','Communauté'], false),
  ('divertissement', 'Divertissement', '🎉', 'Fun, détente et soirées', 10, ARRAY['Soirée','Humour','Détente'], false),
  ('musique', 'Musique', '🎵', 'Hits, karaoké et partages audio', 20, ARRAY['Décennies','Karaoké','Découvertes'], false),
  ('rencontres', 'Rencontres', '💬', 'Faire connaissance', 30, ARRAY['Amical','Âge','Icebreakers'], false),
  ('jeux', 'Jeux', '🎮', 'Quiz, défis et compétition', 40, ARRAY['Quiz','Défis','Compétition'], false),
  ('aide', 'Aide / Support', '💙', 'Écoute et entraide', 50, ARRAY['Soutien','Conseils','Ressources'], false),
  ('regional', 'Régional', '🌍', 'Régions et cultures locales', 60, ARRAY['France','Belgique','Québec','Suisse'], false),
  ('lgbt', 'LGBT+', '🌈', 'Espace inclusif et bienveillant', 70, ARRAY['Communauté','Pride','Soutien'], false),
  ('libre', 'Discussion libre', '🗣️', 'Tous sujets', 80, ARRAY['Libre','Débat','Actu'], false),
  ('culture', 'Culture & Arts', '🎨', 'Livres, ciné, art', 90, ARRAY['Cinéma','Livres','Art'], false),
  ('tech', 'Tech & Geek', '💻', 'High-tech, jeux vidéo, web', 100, ARRAY['Jeux vidéo','Web','Sciences'], false),
  ('coquin', 'Coquins', '🔥', 'Zone adulte Premium (18+)', 200, ARRAY['Flirt','Soirée','Jeux'], true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  emoji = EXCLUDED.emoji,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order,
  subcategories = EXCLUDED.subcategories,
  is_coquin = EXCLUDED.is_coquin,
  updated_at = NOW();

-- Ordre d’affichage des nouveaux salons built-in
INSERT INTO public.salon_display_order (salon_id, sort_order) VALUES
  ('bienvenue', 0),
  ('annonces', 5),
  ('musique60', 10),
  ('musique80', 20),
  ('musique90', 25),
  ('karaoke', 30),
  ('debat', 40),
  ('quiz', 50),
  ('jeunes', 60),
  ('lgbt', 70),
  ('divorce', 80),
  ('libre', 90),
  ('insulte', 100),
  ('cameras', 110),
  ('bar', 120),
  ('cinema', 130),
  ('livres', 140),
  ('gaming', 150),
  ('tech', 160),
  ('sport', 170),
  ('cuisine', 180),
  ('voyage', 190),
  ('belgique', 200),
  ('quebec', 210),
  ('aide', 220),
  ('coquin_lounge', 900),
  ('coquin_flirt', 910),
  ('coquin_jeux', 920)
ON CONFLICT (salon_id) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_salons_category_id ON public.salons (category_id);
CREATE INDEX IF NOT EXISTS idx_salon_categories_sort ON public.salon_categories (sort_order);

-- Permissions admin catégories
INSERT INTO public.permissions (section, action, user_identifier, identifier_type, allowed)
SELECT v.section, v.action, v.user_identifier, v.identifier_type, v.allowed
FROM (VALUES
  ('salons', 'manage_categories', 'moderator', 'badge', true),
  ('salons', 'manage_categories', 'master_op', 'badge', true),
  ('salons', 'manage_categories', 'direction', 'badge', true),
  ('salons', 'manage_categories', 'founder', 'badge', true)
) AS v(section, action, user_identifier, identifier_type, allowed)
WHERE NOT EXISTS (
  SELECT 1 FROM public.permissions p
  WHERE p.section = v.section
    AND p.action = v.action
    AND p.user_identifier = v.user_identifier
    AND p.identifier_type = v.identifier_type
);
