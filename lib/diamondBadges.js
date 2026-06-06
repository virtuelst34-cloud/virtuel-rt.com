export const DIAMOND_BADGES_DEFAULT = [
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

// Merge badges par défaut avec les overrides admin
export function getMergedBadges(customBadges = []) {
  return DIAMOND_BADGES_DEFAULT.map(b => {
    const override = customBadges.find(c => c.id === b.id);
    return override ? { ...b, ...override } : b;
  }).sort((a, b) => a.minLevel - b.minLevel);
}

export function getBadgeForLevel(level, customBadges = []) {
  const badges = getMergedBadges(customBadges);
  const lvl = level || 1;
  let badge = badges[0];
  for (const b of badges) { if (lvl >= b.minLevel) badge = b; }
  return badge;
}

export function getUnlockedBadges(level, customBadges = []) {
  return getMergedBadges(customBadges).filter(b => (level || 1) >= b.minLevel);
}

// Compat — export ancien nom pour ne pas casser les imports existants
export const DIAMOND_BADGES = DIAMOND_BADGES_DEFAULT;
