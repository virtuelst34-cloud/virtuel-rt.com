import React, { memo } from 'react';
import {
  SPECIAL_BADGES,
  getSpecialBadgeIdsForUser,
} from '@/lib/diamondBadges';
import DiamondBadge from './DiamondBadge';

export type SpecialBadgeProfile = {
  isFounder?: boolean;
  isDirection?: boolean;
  isMasterOp?: boolean;
  isIridescent?: boolean;
  specialBadges?: string[];
  special_badges?: string[];
};

const SHORT_LABEL: Record<string, string> = {
  founder: 'Fondateur',
  moderator: 'Modo',
  vip: 'VIP',
  direction: 'Direction',
  master_op: 'Master OP',
  iridescent: 'Iridescence',
};

const SIZE_PAD: Record<'xs' | 'sm' | 'md', string> = {
  xs: 'px-1 py-0.5 gap-0.5 text-[9px]',
  sm: 'px-1.5 py-0.5 gap-0.5 text-[10px]',
  md: 'px-2 py-1 gap-1 text-[11px]',
};

const ICON_SIZE: Record<'xs' | 'sm' | 'md', string> = {
  xs: 'text-[11px]',
  sm: 'text-[13px]',
  md: 'text-base',
};

interface SpecialBadgeInlineProps {
  profile?: SpecialBadgeProfile | null;
  size?: 'xs' | 'sm' | 'md';
  /** Affiche le libellé du rôle à côté de l’icône (recommandé hors listes ultra-compactes). */
  showLabels?: boolean;
  className?: string;
}

/** Pastilles colorées pour badges spéciaux (staff / rôles) — visibles et lisibles. */
const SpecialBadgeInline = memo(function SpecialBadgeInline({
  profile,
  size = 'xs',
  showLabels = true,
  className = '',
}: SpecialBadgeInlineProps) {
  if (!profile) return null;

  const ids = getSpecialBadgeIdsForUser(profile);
  if (ids.length === 0) return null;

  const pad = SIZE_PAD[size] || SIZE_PAD.xs;
  const iconClass = ICON_SIZE[size] || ICON_SIZE.xs;

  return (
    <span className={`inline-flex items-center gap-0.5 shrink-0 flex-wrap ${className}`} aria-label="Badges spéciaux">
      {ids.map((id) => {
        if (id === 'iridescent') {
          return <DiamondBadge key={id} level={1} size={size === 'md' ? 'sm' : size} specialBadge="iridescent" />;
        }
        const meta = SPECIAL_BADGES.find((b) => b.id === id);
        if (!meta) return null;
        const label = SHORT_LABEL[id] || meta.label;
        return (
          <span
            key={id}
            className={`inline-flex items-center rounded-md border font-bold leading-none shrink-0 ${pad}`}
            style={{
              color: meta.color,
              backgroundColor: `${meta.color}2e`,
              borderColor: `${meta.color}70`,
              boxShadow: `0 0 0 1px ${meta.color}18`,
            }}
            title={meta.label}
            aria-label={meta.label}
          >
            <span className={`${iconClass} leading-none`} aria-hidden>
              {meta.icon}
            </span>
            {showLabels && (
              <span className="whitespace-nowrap tracking-tight">{label}</span>
            )}
          </span>
        );
      })}
    </span>
  );
});

export default SpecialBadgeInline;
