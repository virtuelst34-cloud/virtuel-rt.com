import React, { memo } from 'react';
import { getBadgeForLevel, getBadgePreview, validateBadge, BADGE_ANIMATIONS, SPECIAL_BADGES } from '@/lib/diamondBadges';
import { useBadges } from '@/lib/contexts';

// Diamant SVG avec facettes, reflets et profondeur
function DiamondSVG({ color, glow, px }) {
  const id = `dg-${color.replace('#', '')}`;
  return (
    <svg width={px} height={px} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ filter: `drop-shadow(0 0 5px ${glow}) drop-shadow(0 0 2px ${color})`, flexShrink: 0 }}>
      <defs>
        <linearGradient id={`${id}-top`} x1="10" y1="2" x2="22" y2="13" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="100%" stopColor={color} stopOpacity="0.7" />
        </linearGradient>
        <linearGradient id={`${id}-left`} x1="2" y1="13" x2="16" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={color} stopOpacity="0.9" />
          <stop offset="100%" stopColor={color} stopOpacity="0.4" />
        </linearGradient>
        <linearGradient id={`${id}-right`} x1="30" y1="13" x2="16" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={color} stopOpacity="0.6" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.3" />
        </linearGradient>
        <linearGradient id={`${id}-mid`} x1="10" y1="13" x2="22" y2="13" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.25" />
          <stop offset="50%" stopColor={color} stopOpacity="0.5" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.15" />
        </linearGradient>
      </defs>

      {/* Couronne (haut) — 4 facettes */}
      {/* Facette centrale haut */}
      <polygon points="16,2 22,12 10,12" fill={`url(#${id}-top)`} />
      {/* Facette gauche haut */}
      <polygon points="4,9 10,12 16,2" fill={`url(#${id}-top)`} opacity="0.75" />
      {/* Facette droite haut */}
      <polygon points="28,9 22,12 16,2" fill={`url(#${id}-top)`} opacity="0.55" />
      {/* Bordure gauche haut */}
      <polygon points="2,13 4,9 10,12" fill={color} opacity="0.5" />
      {/* Bordure droite haut */}
      <polygon points="30,13 28,9 22,12" fill={color} opacity="0.3" />

      {/* Ceinture (ligne médiane) */}
      <polygon points="2,13 10,12 16,14 10,15" fill={`url(#${id}-mid)`} />
      <polygon points="30,13 22,12 16,14 22,15" fill={`url(#${id}-mid)`} opacity="0.7" />

      {/* Pavillon (bas) — pointe */}
      {/* Facette gauche bas */}
      <polygon points="2,13 10,15 16,30" fill={`url(#${id}-left)`} />
      {/* Facette centrale bas */}
      <polygon points="10,15 22,15 16,30" fill={color} opacity="0.65" />
      {/* Facette droite bas */}
      <polygon points="30,13 22,15 16,30" fill={`url(#${id}-right)`} />

      {/* Reflet principal (éclat blanc en haut à gauche) */}
      <polygon points="10,4 14,6 11,10 8,8" fill="#ffffff" opacity="0.55" />
      {/* Petit reflet secondaire */}
      <polygon points="18,3 20,4 19,6" fill="#ffffff" opacity="0.35" />
    </svg>
  );
}

const DiamondBadge = memo(function DiamondBadge(props) {
  const { level, size = 'sm', showLabel = false, animation = null, specialBadge = null } = props;
  const { customBadges } = useBadges() || {};
  
  // Utiliser le badge spécial si fourni, sinon le badge de niveau
  const badge = specialBadge && SPECIAL_BADGES.find(b => b.id === specialBadge)
    ? SPECIAL_BADGES.find(b => b.id === specialBadge)
    : getBadgeForLevel(level, customBadges || []);
  
  // Validation du badge
  if (!validateBadge(badge)) return null;

  // Utiliser getBadgePreview pour la taille
  const badgePreview = getBadgePreview(badge, size);
  const px = badgePreview.size;
  const showPing = size === 'md' || size === 'lg';
  
  // Animation CSS si spécifiée
  const animationClass = animation && BADGE_ANIMATIONS[animation] ? BADGE_ANIMATIONS[animation] : '';

  return (
    <span className={`relative group inline-flex items-center gap-1 shrink-0 ${animationClass}`} title={badge.label}>
      <span className="relative inline-flex items-center justify-center shrink-0">
        {showPing && (
          <span
            className="absolute rounded-full animate-ping opacity-25"
            style={{ width: '150%', height: '150%', background: badge.color }}
          />
        )}
        <DiamondSVG color={badge.color} glow={badge.glow} px={px} />
      </span>

      {showLabel && (
        <span className="text-[9px] font-bold tracking-wide" style={{ color: badge.color }}>
          {badge.label}
        </span>
      )}

      {/* Tooltip au hover */}
      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-50
        opacity-0 group-hover:opacity-100 transition-opacity duration-150
        whitespace-nowrap text-[10px] font-semibold px-2 py-1 rounded-lg border shadow-lg"
        style={{
          background: `${badge.color}18`,
          borderColor: `${badge.color}50`,
          color: badge.color,
        }}>
        {badge.label} · Nv.{badge.minLevel}+
      </span>
    </span>
  );
});

export default DiamondBadge;
