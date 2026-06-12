export interface DiamondBadge {
  id: string;
  minLevel: number;
  label: string;
  color: string;
  glow: string;
}

export interface SpecialBadge {
  id: string;
  label: string;
  color: string;
  icon: string;
}

export interface Rarity {
  weight: number;
  glow: string;
}

export interface BadgePreview {
  size: number;
  id: string;
  minLevel: number;
  label: string;
  color: string;
  glow: string;
}

export const DIAMOND_BADGES_DEFAULT: DiamondBadge[] = [
  { id: 'shadow',   minLevel: 1,  label: 'Diamant Ombre',     color: '#64748b', glow: 'rgba(100,116,139,0.5)' },
  { id: 'ice',      minLevel: 3,  label: 'Diamant Glace',     color: '#67e8f9', glow: 'rgba(103,232,249,0.5)' },
  { id: 'emerald',  minLevel: 5,  label: 'Diamant Émeraude',  color: '#34d399', glow: 'rgba(52,211,153,0.5)'  },
  { id: 'amethyst', minLevel: 8,  label: 'Diamant Améthyste', color: '#a78bfa', glow: 'rgba(167,139,250,0.5)' },
  { id: 'sapphire', minLevel: 12, label: 'Diamant Saphir',    color: '#60a5fa', glow: 'rgba(96,165,250,0.5)'  },
  { id: 'ruby',     minLevel: 18, label: 'Diamant Rubis',     color: '#f87171', glow: 'rgba(248,113,113,0.5)' },
  { id: 'gold',     minLevel: 25, label: 'Diamant Or',        color: '#fbbf24', glow: 'rgba(251,191,36,0.5)'  },
  { id: 'obsidian', minLevel: 35, label: 'Diamant Obsidien',  color: '#e879f9', glow: 'rgba(232,121,249,0.6)' },
  { id: 'nova',     minLevel: 50, label: 'Diamant Nova',      color: '#ffffff', glow: 'rgba(255,255,255,0.7)' },
];

// Badges spéciaux/limités
export const SPECIAL_BADGES: SpecialBadge[] = [
  { id: 'founder', label: 'Fondateur', color: '#ffd700', icon: '👑' },
  { id: 'moderator', label: 'Modérateur', color: '#ff6b6b', icon: '🛡️' },
  { id: 'vip', label: 'VIP', color: '#c084fc', icon: '⭐' },
];

// Système de rareté
export const RARITY: Record<string, Rarity> = {
  common: { weight: 100, glow: 'rgba(255,255,255,0.2)' },
  rare: { weight: 50, glow: 'rgba(59,130,246,0.4)' },
  epic: { weight: 20, glow: 'rgba(168,85,247,0.5)' },
  legendary: { weight: 5, glow: 'rgba(255,215,0,0.7)' },
};

// Animations CSS personnalisées
export const BADGE_ANIMATIONS: Record<string, string> = {
  pulse: 'animate-pulse',
  spin: 'animate-spin',
  bounce: 'animate-bounce',
  glow: 'animate-glow',
};

// Validation des données
export function validateBadge(badge: DiamondBadge | null): boolean {
  return !!(badge && badge.id && badge.minLevel >= 0 && badge.label && badge.color);
}

// Cache pour les badges fusionnés
let cachedMergedBadges: { key: string; data: DiamondBadge[] } | null = null;

// Merge badges par défaut avec les overrides admin
export function getMergedBadges(customBadges: DiamondBadge[] = []): DiamondBadge[] {
  const key = JSON.stringify(customBadges);
  if (cachedMergedBadges?.key === key) return cachedMergedBadges.data;
  
  const result = DIAMOND_BADGES_DEFAULT.map(b => {
    const override = customBadges.find(c => c.id === b.id);
    return override ? { ...b, ...override } : b;
  }).sort((a, b) => a.minLevel - b.minLevel);
  
  cachedMergedBadges = { key, data: result };
  return result;
}

export function getBadgeForLevel(level: number, customBadges: DiamondBadge[] = []): DiamondBadge {
  const badges = getMergedBadges(customBadges);
  const lvl = level || 1;
  let badge = badges[0];
  for (const b of badges) { if (lvl >= b.minLevel) badge = b; }
  return badge;
}

export function getUnlockedBadges(level: number, customBadges: DiamondBadge[] = []): DiamondBadge[] {
  return getMergedBadges(customBadges).filter(b => (level || 1) >= b.minLevel);
}

// Fonction utilitaire pour progression vers le prochain badge
export function getProgressToNextBadge(level: number, customBadges: DiamondBadge[] = []): {
  progress: number;
  current: DiamondBadge;
  next: DiamondBadge | null;
} {
  const badges = getMergedBadges(customBadges);
  const currentBadge = getBadgeForLevel(level, customBadges);
  const nextBadge = badges.find(b => b.minLevel > currentBadge.minLevel);
  
  if (!nextBadge) return { progress: 100, current: currentBadge, next: null };
  
  const range = nextBadge.minLevel - currentBadge.minLevel;
  const progress = ((level - currentBadge.minLevel) / range) * 100;
  
  return { progress, current: currentBadge, next: nextBadge };
}

// Preview des badges
export function getBadgePreview(badge: DiamondBadge, size: 'sm' | 'md' | 'lg' | 'xl' | 'xs' = 'md'): BadgePreview {
  const sizes: Record<string, number> = { xs: 18, sm: 24, md: 32, lg: 48, xl: 64 };
  return { size: sizes[size] || sizes.md, ...badge };
}

// Comparaison de badges
export function compareBadges(badge1: DiamondBadge, badge2: DiamondBadge): number {
  return badge1.minLevel - badge2.minLevel;
}

// Recherche optimisée par ID
export function getBadgeById(id: string, customBadges: DiamondBadge[] = []): DiamondBadge | undefined {
  return getMergedBadges(customBadges).find(b => b.id === id);
}

// Statistiques sur les badges
export function getBadgeStats(customBadges: DiamondBadge[] = []): {
  total: number;
  maxLevel: number;
  averageGap: number;
} {
  const badges = getMergedBadges(customBadges);
  return {
    total: badges.length,
    maxLevel: Math.max(...badges.map(b => b.minLevel)),
    averageGap: badges.reduce((acc, b, i) => acc + (i > 0 ? b.minLevel - badges[i-1].minLevel : 0), 0) / (badges.length - 1),
  };
}

// Compat — export ancien nom pour ne pas casser les imports existants
export const DIAMOND_BADGES = DIAMOND_BADGES_DEFAULT;
