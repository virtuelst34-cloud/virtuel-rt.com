-- Réorganisation des catégories / salons : Général = essentiels uniquement
-- Appliquer via: npm run supabase:apply

-- Catégories (noms lisibles + descriptions)
INSERT INTO public.salon_categories (id, name, emoji, description, sort_order, subcategories, is_coquin) VALUES
  ('general', 'Général', '🏠', 'Accueil et essentiels uniquement', 0, ARRAY['Accueil','Annonces','Communauté'], false),
  ('divertissement', 'Divertissement', '🎉', 'Fun, détente et soirées', 10, ARRAY['Soirée','Humour','Détente'], false),
  ('musique', 'Musique', '🎵', 'Hits, karaoké et partages audio', 20, ARRAY['Décennies','Karaoké','Découvertes'], false),
  ('rencontres', 'Rencontres', '💬', 'Faire connaissance', 30, ARRAY['Amical','Âge','Icebreakers'], false),
  ('jeux', 'Jeux', '🎮', 'Quiz, défis et compétition', 40, ARRAY['Quiz','Défis','Compétition'], false),
  ('aide', 'Aide', '💙', 'Écoute et entraide', 50, ARRAY['Soutien','Conseils','Ressources'], false),
  ('regional', 'Régional', '🌍', 'Régions et cultures locales', 60, ARRAY['France','Belgique','Québec','Suisse'], false),
  ('lgbt', 'LGBT+', '🌈', 'Espace inclusif et bienveillant', 70, ARRAY['Communauté','Pride','Soutien'], false),
  ('libre', 'Libre', '🗣️', 'Tous sujets, sans filtre excessif', 80, ARRAY['Libre','Débat','Actu'], false),
  ('culture', 'Culture', '🎨', 'Livres, ciné, séries, art', 90, ARRAY['Cinéma','Séries','Livres','Art'], false),
  ('tech', 'Tech', '💻', 'High-tech, IA et web', 100, ARRAY['Web','IA','Sciences'], false),
  ('coquin', 'Coquins Premium', '🔥', 'Zone adulte Premium (18+)', 200, ARRAY['Flirt','Soirée','Jeux'], true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  emoji = EXCLUDED.emoji,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order,
  subcategories = EXCLUDED.subcategories,
  is_coquin = EXCLUDED.is_coquin,
  updated_at = NOW();

-- Ordre d’affichage des salons built-in (idempotent, force l’ordre thématique)
INSERT INTO public.salon_display_order (salon_id, sort_order) VALUES
  ('bienvenue', 0),
  ('annonces', 5),
  ('general', 8),
  ('cameras', 100),
  ('bar', 110),
  ('humour', 120),
  ('cuisine', 130),
  ('voyage', 140),
  ('musique60', 200),
  ('musique80', 210),
  ('musique90', 220),
  ('musique2000', 230),
  ('karaoke', 240),
  ('amical', 300),
  ('jeunes', 310),
  ('quarante', 320),
  ('quiz', 400),
  ('blindtest', 410),
  ('gaming', 420),
  ('sport', 430),
  ('divorce', 500),
  ('aide', 510),
  ('france', 600),
  ('belgique', 610),
  ('quebec', 620),
  ('suisse', 630),
  ('lgbt', 700),
  ('libre', 800),
  ('debat', 810),
  ('insulte', 820),
  ('cinema', 900),
  ('series', 910),
  ('livres', 920),
  ('tech', 1000),
  ('ia', 1010),
  ('coquin_lounge', 9000),
  ('coquin_flirt', 9010),
  ('coquin_jeux', 9020)
ON CONFLICT (salon_id) DO UPDATE SET
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();

-- Si des lignes existent dans public.salons pour des IDs built-in, synchroniser catégorie / meta
UPDATE public.salons AS s SET
  category_id = v.category_id,
  subcategory = v.subcategory,
  is_coquin = v.is_coquin,
  sort_order = v.sort_order,
  icon = COALESCE(NULLIF(s.icon, ''), v.icon),
  welcome = CASE WHEN COALESCE(s.welcome, '') = '' THEN v.welcome ELSE s.welcome END
FROM (VALUES
  ('bienvenue', 'general', 'Accueil', false, 0, '👋', '👋 Bienvenue sur Virtuel-RT !'),
  ('annonces', 'general', 'Annonces', false, 5, '📢', '📢 Salon Annonces'),
  ('general', 'general', 'Communauté', false, 8, '💬', '💬 Salon général'),
  ('cameras', 'divertissement', 'Soirée', false, 100, '📹', '📹 Caméras live'),
  ('bar', 'divertissement', 'Détente', false, 110, '🍷', '🍷 Bar & Détente'),
  ('humour', 'divertissement', 'Humour', false, 120, '😂', '😂 Humour'),
  ('cuisine', 'divertissement', 'Détente', false, 130, '🍳', '🍳 Cuisine'),
  ('voyage', 'divertissement', 'Détente', false, 140, '✈️', '✈️ Voyage'),
  ('musique60', 'musique', 'Décennies', false, 200, '🎶', '🎵 Musique 60s'),
  ('musique80', 'musique', 'Décennies', false, 210, '🎸', '🎸 Musique 80s'),
  ('musique90', 'musique', 'Décennies', false, 220, '💿', '💿 Musique 90s'),
  ('musique2000', 'musique', 'Décennies', false, 230, '🎧', '🎧 Années 2000'),
  ('karaoke', 'musique', 'Karaoké', false, 240, '🎤', '🎤 Karaoké'),
  ('amical', 'rencontres', 'Amical', false, 300, '🤝', '🤝 Faire connaissance'),
  ('jeunes', 'rencontres', 'Âge', false, 310, '👋', '👋 18–25 ans'),
  ('quarante', 'rencontres', 'Âge', false, 320, '☕', '☕ 40 ans et +'),
  ('quiz', 'jeux', 'Quiz', false, 400, '🧠', '🧠 Quiz'),
  ('blindtest', 'jeux', 'Défis', false, 410, '🎼', '🎼 Blind test'),
  ('gaming', 'jeux', 'Compétition', false, 420, '🎮', '🎮 Gaming'),
  ('sport', 'jeux', 'Compétition', false, 430, '⚽', '⚽ Sport'),
  ('divorce', 'aide', 'Soutien', false, 500, '💙', '💙 Divorce'),
  ('aide', 'aide', 'Conseils', false, 510, '🤲', '🤲 Entraide'),
  ('france', 'regional', 'France', false, 600, '🇫🇷', '🇫🇷 France'),
  ('belgique', 'regional', 'Belgique', false, 610, '🇧🇪', '🇧🇪 Belgique'),
  ('quebec', 'regional', 'Québec', false, 620, '🇨🇦', '🇨🇦 Québec'),
  ('suisse', 'regional', 'Suisse', false, 630, '🇨🇭', '🇨🇭 Suisse'),
  ('lgbt', 'lgbt', 'Communauté', false, 700, '🌈', '🌈 LGBT+'),
  ('libre', 'libre', 'Libre', false, 800, '🚪', '🚪 Salon libre'),
  ('debat', 'libre', 'Débat', false, 810, '⚡', '⚡ Débat'),
  ('insulte', 'libre', 'Libre', false, 820, '😤', '😤 Insulte libre'),
  ('cinema', 'culture', 'Cinéma', false, 900, '🎬', '🎬 Cinéma'),
  ('series', 'culture', 'Séries', false, 910, '📺', '📺 Séries TV'),
  ('livres', 'culture', 'Livres', false, 920, '📚', '📚 Livres'),
  ('tech', 'tech', 'Web', false, 1000, '💻', '💻 Tech & Web'),
  ('ia', 'tech', 'IA', false, 1010, '🤖', '🤖 IA & futur'),
  ('coquin_lounge', 'coquin', 'Soirée', true, 9000, '🔥', '🔥 Lounge coquin'),
  ('coquin_flirt', 'coquin', 'Flirt', true, 9010, '💋', '💋 Flirt soft'),
  ('coquin_jeux', 'coquin', 'Jeux', true, 9020, '😏', '😏 Jeux coquins')
) AS v(id, category_id, subcategory, is_coquin, sort_order, icon, welcome)
WHERE s.id = v.id;

-- Hors essentiels : retirer de Général les salons custom sans catégorie thématique
-- (Général = bienvenue / annonces / general uniquement)
UPDATE public.salons
SET category_id = 'libre',
    subcategory = CASE WHEN COALESCE(subcategory, '') = '' THEN 'Libre' ELSE subcategory END
WHERE (category_id IS NULL OR category_id = 'general')
  AND id NOT IN ('bienvenue', 'annonces', 'general');
