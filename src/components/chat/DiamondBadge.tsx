import React, { memo, useId, useContext } from 'react';
import {
  getBadgeForLevel,
  validateBadge,
  BADGE_ANIMATIONS,
  SPECIAL_BADGES,
} from '@/lib/diamondBadges';
import { BadgesContext } from '@/lib/contexts/BadgesContext';

const SIZE_PX: Record<string, number> = { xs: 16, sm: 22, md: 32, lg: 48, xl: 64 };
const EMOJI_CLASS: Record<string, string> = {
  xs: 'text-[11px] leading-none',
  sm: 'text-sm leading-none',
  md: 'text-xl leading-none',
  lg: 'text-2xl leading-none',
  xl: 'text-3xl leading-none',
};

function DiamondSVG({
  color,
  glow,
  px,
  uid,
}: {
  color: string;
  glow: string;
  px: number;
  uid: string;
}) {
  const id = `dg-${uid}`;
  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
      style={{ filter: `drop-shadow(0 0 4px ${glow}) drop-shadow(0 0 1px ${color})` }}
    >
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
      <polygon points="16,2 22,12 10,12" fill={`url(#${id}-top)`} />
      <polygon points="4,9 10,12 16,2" fill={`url(#${id}-top)`} opacity="0.75" />
      <polygon points="28,9 22,12 16,2" fill={`url(#${id}-top)`} opacity="0.55" />
      <polygon points="2,13 4,9 10,12" fill={color} opacity="0.5" />
      <polygon points="30,13 28,9 22,12" fill={color} opacity="0.3" />
      <polygon points="2,13 10,12 16,14 10,15" fill={`url(#${id}-mid)`} />
      <polygon points="30,13 22,12 16,14 22,15" fill={`url(#${id}-mid)`} opacity="0.7" />
      <polygon points="2,13 10,15 16,30" fill={`url(#${id}-left)`} />
      <polygon points="10,15 22,15 16,30" fill={color} opacity="0.65" />
      <polygon points="30,13 22,15 16,30" fill={`url(#${id}-right)`} />
      <polygon points="10,4 14,6 11,10 8,8" fill="#ffffff" opacity="0.55" />
      <polygon points="18,3 20,4 19,6" fill="#ffffff" opacity="0.35" />
    </svg>
  );
}

function IridescentDiamond({ px, uid }: { px: number; uid: string }) {
  const id = `iri-${uid}`;
  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
      style={{
        filter: 'drop-shadow(0 0 5px rgba(168,85,247,0.45)) drop-shadow(0 0 2px rgba(255,255,255,0.35))',
        animation: 'iridescent-rotate 8s linear infinite',
      }}
    >
      <style>{`
        @keyframes iridescent-rotate {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      <defs>
        <linearGradient id={`${id}-grad`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ff6b6b">
            <animate attributeName="stopColor" values="#ff6b6b;#ffd700;#34d399;#60a5fa;#a78bfa;#ff6b6b" dur="3s" repeatCount="indefinite" />
          </stop>
          <stop offset="50%" stopColor="#60a5fa">
            <animate attributeName="stopColor" values="#60a5fa;#a78bfa;#ff6b6b;#ffd700;#34d399;#60a5fa" dur="3s" repeatCount="indefinite" />
          </stop>
          <stop offset="100%" stopColor="#a78bfa">
            <animate attributeName="stopColor" values="#a78bfa;#ff6b6b;#ffd700;#34d399;#60a5fa;#a78bfa" dur="3s" repeatCount="indefinite" />
          </stop>
        </linearGradient>
        <linearGradient id={`${id}-top`} x1="10" y1="2" x2="22" y2="13" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="100%" stopColor={`url(#${id}-grad)`} stopOpacity="0.8" />
        </linearGradient>
        <linearGradient id={`${id}-left`} x1="2" y1="13" x2="16" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={`url(#${id}-grad)`} stopOpacity="0.9" />
          <stop offset="100%" stopColor={`url(#${id}-grad)`} stopOpacity="0.5" />
        </linearGradient>
        <linearGradient id={`${id}-right`} x1="30" y1="13" x2="16" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={`url(#${id}-grad)`} stopOpacity="0.7" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.4" />
        </linearGradient>
      </defs>
      <polygon points="16,2 22,12 10,12" fill={`url(#${id}-top)`} />
      <polygon points="4,9 10,12 16,2" fill={`url(#${id}-top)`} opacity="0.8" />
      <polygon points="28,9 22,12 16,2" fill={`url(#${id}-top)`} opacity="0.6" />
      <polygon points="2,13 4,9 10,12" fill={`url(#${id}-grad)`} opacity="0.6" />
      <polygon points="30,13 28,9 22,12" fill={`url(#${id}-grad)`} opacity="0.4" />
      <polygon points="2,13 10,15 16,30" fill={`url(#${id}-left)`} />
      <polygon points="10,15 22,15 16,30" fill={`url(#${id}-grad)`} opacity="0.7" />
      <polygon points="30,13 22,15 16,30" fill={`url(#${id}-right)`} />
      <polygon points="10,4 14,6 11,10 8,8" fill="#ffffff" opacity="0.6" />
      <polygon points="18,3 20,4 19,6" fill="#ffffff" opacity="0.4" />
    </svg>
  );
}

interface DiamondBadgeProps {
  level: number;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showLabel?: boolean;
  animation?: keyof typeof BADGE_ANIMATIONS;
  /** Iridescent remplace le diamant ; rôles (👑⚡…) remplacent aussi, taille adaptée. */
  specialBadge?: string;
}

const DiamondBadge = memo(function DiamondBadge({
  level,
  size = 'sm',
  showLabel = false,
  animation,
  specialBadge,
}: DiamondBadgeProps) {
  const uid = useId().replace(/:/g, '');
  const customBadges = useContext(BadgesContext)?.customBadges || [];

  const specialMeta = specialBadge ? SPECIAL_BADGES.find((b) => b.id === specialBadge) : undefined;
  const isIridescent = specialBadge === 'iridescent';
  const isRole = !!specialMeta && !isIridescent;

  const levelBadge = getBadgeForLevel(level || 1, customBadges);
  if (!levelBadge || !validateBadge(levelBadge)) return null;

  // Badge spécial inconnu → fallback diamant de niveau
  if (specialBadge && !specialMeta) {
    // keep level diamond
  }

  const px = SIZE_PX[size] || SIZE_PX.sm;
  const emojiClass = EMOJI_CLASS[size] || EMOJI_CLASS.sm;
  const animationClass = animation && BADGE_ANIMATIONS[animation] ? BADGE_ANIMATIONS[animation] : '';
  const showPing = (size === 'md' || size === 'lg') && !isIridescent && !isRole;

  const labelColor = isIridescent ? '#c4b5fd' : specialMeta?.color || levelBadge.color;
  const labelText = specialMeta?.label || levelBadge.label;

  return (
    <span className={`relative group inline-flex items-center gap-1 shrink-0 ${animationClass}`} title={labelText}>
      <span className="relative inline-flex items-center justify-center shrink-0" style={{ width: px, height: px }}>
        {showPing && (
          <span
            className="absolute rounded-full animate-ping opacity-25"
            style={{ width: '150%', height: '150%', background: levelBadge.color }}
          />
        )}
        {isIridescent ? (
          <IridescentDiamond px={px} uid={uid} />
        ) : isRole ? (
          <span className={`${emojiClass} shrink-0`} style={{ color: specialMeta!.color }} aria-hidden>
            {specialMeta!.icon}
          </span>
        ) : (
          <DiamondSVG color={levelBadge.color} glow={levelBadge.glow} px={px} uid={uid} />
        )}
      </span>

      {showLabel && (
        <span className="text-[9px] font-bold tracking-wide" style={{ color: labelColor }}>
          {labelText}
        </span>
      )}

      <span
        className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-50
        opacity-0 group-hover:opacity-100 transition-opacity duration-150
        whitespace-nowrap text-[10px] font-semibold px-2 py-1 rounded-lg border shadow-lg"
        style={{
          background: isIridescent
            ? 'linear-gradient(135deg, rgba(255,107,107,0.2), rgba(255,215,0,0.2), rgba(52,211,153,0.2), rgba(96,165,250,0.2), rgba(167,139,250,0.2))'
            : `${labelColor}18`,
          borderColor: isIridescent ? 'rgba(255,255,255,0.3)' : `${labelColor}50`,
          color: isIridescent ? '#ffffff' : labelColor,
        }}
      >
        {labelText}
        {!specialMeta ? ` · Nv.${levelBadge.minLevel}+` : ''}
      </span>
    </span>
  );
});

export default DiamondBadge;
