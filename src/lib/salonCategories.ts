/** Catégories / sous-thèmes des salons (classement sidebar + admin). */

export interface SalonCategory {
  id: string;
  name: string;
  emoji: string;
  description?: string;
  sort_order: number;
  /** Sous-thèmes affichés dans l’admin / filtres */
  subcategories: string[];
  /** Catégorie réservée Mode coquin (Premium) */
  isCoquin?: boolean;
}

export const DEFAULT_SALON_CATEGORIES: SalonCategory[] = [
  {
    id: 'general',
    name: 'Général',
    emoji: '🏠',
    description: 'Accueil et essentiels uniquement',
    sort_order: 0,
    subcategories: ['Accueil', 'Annonces', 'Communauté'],
  },
  {
    id: 'divertissement',
    name: 'Divertissement',
    emoji: '🎉',
    description: 'Fun, détente et soirées',
    sort_order: 10,
    subcategories: ['Soirée', 'Humour', 'Détente'],
  },
  {
    id: 'musique',
    name: 'Musique',
    emoji: '🎵',
    description: 'Hits, karaoké et partages audio',
    sort_order: 20,
    subcategories: ['Décennies', 'Karaoké', 'Découvertes'],
  },
  {
    id: 'rencontres',
    name: 'Rencontres',
    emoji: '💬',
    description: 'Faire connaissance',
    sort_order: 30,
    subcategories: ['Amical', 'Âge', 'Icebreakers'],
  },
  {
    id: 'jeux',
    name: 'Jeux',
    emoji: '🎮',
    description: 'Quiz, défis et compétition',
    sort_order: 40,
    subcategories: ['Quiz', 'Défis', 'Compétition'],
  },
  {
    id: 'aide',
    name: 'Aide',
    emoji: '💙',
    description: 'Écoute et entraide',
    sort_order: 50,
    subcategories: ['Soutien', 'Conseils', 'Ressources'],
  },
  {
    id: 'regional',
    name: 'Régional',
    emoji: '🌍',
    description: 'Régions et cultures locales',
    sort_order: 60,
    subcategories: ['France', 'Belgique', 'Québec', 'Suisse'],
  },
  {
    id: 'lgbt',
    name: 'LGBT+',
    emoji: '🌈',
    description: 'Espace inclusif et bienveillant',
    sort_order: 70,
    subcategories: ['Communauté', 'Pride', 'Soutien'],
  },
  {
    id: 'libre',
    name: 'Libre',
    emoji: '🗣️',
    description: 'Tous sujets, sans filtre excessif',
    sort_order: 80,
    subcategories: ['Libre', 'Débat', 'Actu'],
  },
  {
    id: 'culture',
    name: 'Culture',
    emoji: '🎨',
    description: 'Livres, ciné, séries, art',
    sort_order: 90,
    subcategories: ['Cinéma', 'Séries', 'Livres', 'Art'],
  },
  {
    id: 'tech',
    name: 'Tech',
    emoji: '💻',
    description: 'High-tech, IA et web',
    sort_order: 100,
    subcategories: ['Web', 'IA', 'Sciences'],
  },
  {
    id: 'coquin',
    name: 'Coquins Premium',
    emoji: '🔥',
    description: 'Zone adulte Premium (18+)',
    sort_order: 200,
    subcategories: ['Flirt', 'Soirée', 'Jeux'],
    isCoquin: true,
  },
];

export const CATEGORY_BY_ID: Record<string, SalonCategory> = Object.fromEntries(
  DEFAULT_SALON_CATEGORIES.map(c => [c.id, c]),
);

/** Catégorie de repli pour salons sans category_id (hors Général, réservé aux essentiels). */
export const FALLBACK_CATEGORY_ID = 'libre';

export function getCategoryMeta(categoryId?: string | null): SalonCategory {
  if (categoryId && CATEGORY_BY_ID[categoryId]) return CATEGORY_BY_ID[categoryId];
  return CATEGORY_BY_ID[FALLBACK_CATEGORY_ID] || CATEGORY_BY_ID.general;
}

export function isCoquinCategory(categoryId?: string | null): boolean {
  return getCategoryMeta(categoryId).isCoquin === true;
}
