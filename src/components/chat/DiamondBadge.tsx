import React, { memo } from 'react';
import { getBadgeForLevel, getBadgePreview, validateBadge, BADGE_ANIMATIONS, SPECIAL_BADGES, DiamondBadge as DiamondBadgeType, SpecialBadge } from '@/lib/diamondBadges';
import { useBadges } from '@/lib/contexts';

interface DiamondSVGProps {
  color: string;
  glow: string;
  px: number;
}

type BadgeType = DiamondBadgeType | SpecialBadge;

// Diamant SVG avec facettes, reflets et profondeur
function DiamondSVG({ color, glow, px }: DiamondSVGProps) {
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

// Diamant Iridescent avec animation de couleur changeante et rotation (effet ionisation)
function IridescentDiamond({ px }: { px: number }) {
  return (
    <svg width={px} height={px} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"
      className="animate-iridescent"
      style={{ 
        filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.6)) drop-shadow(0 0 4px rgba(168,85,247,0.5))',
        flexShrink: 0,
        animation: 'iridescent-rotate 8s linear infinite'
      }}>
      <style>{`
        @keyframes iridescent-rotate {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      <defs>
        {/* Gradient iridescent animé avec plus de couleurs */}
        <linearGradient id="iridescent-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ff6b6b">
            <animate attributeName="stopColor" values="#ff6b6b;#ffd700;#34d399;#60a5fa;#a78bfa;#ff6b6b" dur="3s" repeatCount="indefinite" />
          </stop>
          <stop offset="20%" stopColor="#ffd700">
            <animate attributeName="stopColor" values="#ffd700;#34d399;#60a5fa;#a78bfa;#ff6b6b;#ffd700" dur="3s" repeatCount="indefinite" />
          </stop>
          <stop offset="40%" stopColor="#34d399">
            <animate attributeName="stopColor" values="#34d399;#60a5fa;#a78bfa;#ff6b6b;#ffd700;#34d399" dur="3s" repeatCount="indefinite" />
          </stop>
          <stop offset="60%" stopColor="#60a5fa">
            <animate attributeName="stopColor" values="#60a5fa;#a78bfa;#ff6b6b;#ffd700;#34d399;#60a5fa" dur="3s" repeatCount="indefinite" />
          </stop>
          <stop offset="80%" stopColor="#a78bfa">
            <animate attributeName="stopColor" values="#a78bfa;#ff6b6b;#ffd700;#34d399;#60a5fa;#a78bfa" dur="3s" repeatCount="indefinite" />
          </stop>
          <stop offset="100%" stopColor="#ff6b6b">
            <animate attributeName="stopColor" values="#ff6b6b;#ffd700;#34d399;#60a5fa;#a78bfa;#ff6b6b" dur="3s" repeatCount="indefinite" />
          </stop>
        </linearGradient>
        
        {/* Gradient pour facettes avec animation plus rapide */}
        <linearGradient id="iridescent-top" x1="10" y1="2" x2="22" y2="13" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95">
            <animate attributeName="stopOpacity" values="0.95;0.75;0.95" dur="1.5s" repeatCount="indefinite" />
          </stop>
          <stop offset="100%" stopColor="url(#iridescent-gradient)" stopOpacity="0.8" />
        </linearGradient>
        
        <linearGradient id="iridescent-left" x1="2" y1="13" x2="16" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="url(#iridescent-gradient)" stopOpacity="0.9" />
          <stop offset="100%" stopColor="url(#iridescent-gradient)" stopOpacity="0.5" />
        </linearGradient>
        
        <linearGradient id="iridescent-right" x1="30" y1="13" x2="16" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="url(#iridescent-gradient)" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.4" />
        </linearGradient>
        
        <linearGradient id="iridescent-mid" x1="10" y1="13" x2="22" y2="13" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.3" />
          <stop offset="50%" stopColor="url(#iridescent-gradient)" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.2" />
        </linearGradient>
      </defs>

      {/* Couronne (haut) */}
      <polygon points="16,2 22,12 10,12" fill="url(#iridescent-top)" />
      <polygon points="4,9 10,12 16,2" fill="url(#iridescent-top)" opacity="0.8" />
      <polygon points="28,9 22,12 16,2" fill="url(#iridescent-top)" opacity="0.6" />
      <polygon points="2,13 4,9 10,12" fill="url(#iridescent-gradient)" opacity="0.6" />
      <polygon points="30,13 28,9 22,12" fill="url(#iridescent-gradient)" opacity="0.4" />

      {/* Ceinture */}
      <polygon points="2,13 10,12 16,14 10,15" fill="url(#iridescent-mid)" />
      <polygon points="30,13 22,12 16,14 22,15" fill="url(#iridescent-mid)" opacity="0.8" />

      {/* Pavillon (bas) */}
      <polygon points="2,13 10,15 16,30" fill="url(#iridescent-left)" />
      <polygon points="10,15 22,15 16,30" fill="url(#iridescent-gradient)" opacity="0.7" />
      <polygon points="30,13 22,15 16,30" fill="url(#iridescent-right)" />

      {/* Reflets animés avec pulsation */}
      <polygon points="10,4 14,6 11,10 8,8" fill="#ffffff" opacity="0.6">
        <animate attributeName="opacity" values="0.6;0.9;0.6" dur="1s" repeatCount="indefinite" />
      </polygon>
      <polygon points="18,3 20,4 19,6" fill="#ffffff" opacity="0.4">
        <animate attributeName="opacity" values="0.4;0.7;0.4" dur="1s" repeatCount="indefinite" begin="0.3s" />
      </polygon>
      <polygon points="14,7 16,8 15,10" fill="#ffffff" opacity="0.3">
        <animate attributeName="opacity" values="0.3;0.6;0.3" dur="1s" repeatCount="indefinite" begin="0.6s" />
      </polygon>
    </svg>
  );
}

interface DiamondBadgeProps {
  level: number;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showLabel?: boolean;
  animation?: keyof typeof BADGE_ANIMATIONS;
  specialBadge?: string;
}

const DiamondBadge = memo(function DiamondBadge({ level, size = 'sm', showLabel = false, animation, specialBadge }: DiamondBadgeProps) {
  const { customBadges } = useBadges() || {};
  
  // Utiliser le badge spécial si fourni, sinon le badge de niveau
  const badge: BadgeType | null = specialBadge && SPECIAL_BADGES.find(b => b.id === specialBadge)
    ? SPECIAL_BADGES.find(b => b.id === specialBadge)!
    : getBadgeForLevel(level, customBadges || []);
  
  // Validation du badge
  if (!badge) return null;
  
  // Pour les badges spéciaux, on ne valide pas avec validateBadge car ils n'ont pas minLevel
  if (!('icon' in badge) && !validateBadge(badge as DiamondBadgeType)) return null;

  // Déterminer si c'est un badge spécial ou un badge de niveau
  const isSpecial = 'icon' in badge;
  const isIridescent = specialBadge === 'iridescent';
  
  // Pour les badges de niveau, utiliser getBadgePreview
  const diamondBadge = isSpecial ? null : badge as DiamondBadgeType;
  const badgePreview = diamondBadge ? getBadgePreview(diamondBadge, size) : { size: size === 'sm' ? 24 : size === 'md' ? 32 : size === 'lg' ? 48 : 64, ...badge };
  
  // Réduire la taille de moitié pour le diamant iridescent uniquement
  const px = isIridescent ? badgePreview.size / 2 : badgePreview.size;
  const showPing = size === 'md' || size === 'lg';
  
  // Animation CSS si spécifiée
  const animationClass = animation && BADGE_ANIMATIONS[animation] ? BADGE_ANIMATIONS[animation] : '';

  // Pour les badges spéciaux, utiliser une couleur par défaut pour glow
  const glow = isSpecial ? `${badge.color}50` : (badge as DiamondBadgeType).glow;
  const minLevel = isSpecial ? 0 : (badge as DiamondBadgeType).minLevel;

  return (
    <span className={`relative group inline-flex items-center gap-1 shrink-0 ${animationClass}`} title={badge.label}>
      <span className="relative inline-flex items-center justify-center shrink-0">
        {showPing && !isIridescent && (
          <span
            className="absolute rounded-full animate-ping opacity-25"
            style={{ width: '150%', height: '150%', background: badge.color }}
          />
        )}
        {isIridescent ? (
          <IridescentDiamond px={px} />
        ) : isSpecial ? (
          <span className="text-2xl" style={{ color: badge.color }}>{(badge as SpecialBadge).icon}</span>
        ) : (
          <DiamondSVG color={badge.color} glow={glow} px={px} />
        )}
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
          background: isIridescent 
            ? 'linear-gradient(135deg, rgba(255,107,107,0.2), rgba(255,215,0,0.2), rgba(52,211,153,0.2), rgba(96,165,250,0.2), rgba(167,139,250,0.2))'
            : `${badge.color}18`,
          borderColor: isIridescent ? 'rgba(255,255,255,0.3)' : `${badge.color}50`,
          color: isIridescent ? '#ffffff' : badge.color,
        }}>
        {badge.label} {isSpecial ? '' : `· Nv.${minLevel}+`}
      </span>
    </span>
  );
});

export default DiamondBadge;
