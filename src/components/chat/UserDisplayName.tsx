import React, { memo, useEffect } from 'react';
import { useUser } from '@/lib/contexts';
import { useUIOptional } from '@/lib/contexts/UIContext';
import DiamondBadge from './DiamondBadge';
import SpecialBadgeInline, { type SpecialBadgeProfile } from './SpecialBadgeInline';

interface UserDisplayNameProps {
  name: string;
  /** Profil connu (sinon lookup dans `profiles` + fetch). */
  profile?: SpecialBadgeProfile | null;
  level?: number;
  size?: 'xs' | 'sm' | 'md';
  /** Diamant de niveau — toujours à côté des badges spéciaux, jamais remplacé. */
  showLevelDiamond?: boolean;
  showSpecialBadges?: boolean;
  /** Libellés sur les pastilles (ex. « Modo », « Fondateur »). */
  showSpecialLabels?: boolean;
  nameClassName?: string;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
  /**
   * Si true (défaut), le nom ouvre la fiche via `openUserProfile`.
   * Ignoré si `onClick` est fourni. Mettre false pour un affichage non cliquable.
   */
  openProfileOnClick?: boolean;
  as?: 'span' | 'button';
  /** Charge le profil Supabase si absent du cache (badges des autres). */
  ensureFetch?: boolean;
  title?: string;
  id?: string;
  'aria-label'?: string;
}

const UserDisplayName = memo(function UserDisplayName({
  name,
  profile: profileProp,
  level,
  size = 'xs',
  showLevelDiamond = true,
  showSpecialBadges = true,
  showSpecialLabels = true,
  nameClassName = '',
  className = '',
  onClick,
  openProfileOnClick = true,
  as,
  ensureFetch = true,
  title,
  id,
  'aria-label': ariaLabel,
}: UserDisplayNameProps) {
  const { profiles, user, ensureProfiles } = useUser();
  const ui = useUIOptional();
  const cached = profiles[name];
  const self = user?.name === name ? user : null;
  const profile = (profileProp || self || cached) as SpecialBadgeProfile | undefined;
  const lvl = level ?? (profile as { level?: number } | undefined)?.level ?? cached?.level ?? 1;

  useEffect(() => {
    if (!ensureFetch || !name) return;
    if (profileProp || self || cached) return;
    void ensureProfiles([name]);
  }, [ensureFetch, name, profileProp, self, cached, ensureProfiles]);

  const handleClick = onClick
    ? onClick
    : openProfileOnClick && ui
      ? (e: React.MouseEvent) => {
          e.stopPropagation();
          ui.openUserProfile(name);
        }
      : undefined;

  const Tag: 'span' | 'button' = as || (handleClick ? 'button' : 'span');
  const diamondSize = size === 'md' ? 'sm' : size;

  return (
    <Tag
      type={Tag === 'button' ? 'button' : undefined}
      id={id}
      title={title || (handleClick ? `Voir le profil de ${name}` : undefined)}
      aria-label={ariaLabel || name}
      onClick={handleClick}
      className={`inline-flex items-center gap-1 min-w-0 max-w-full ${handleClick ? 'cursor-pointer hover:opacity-90' : ''} ${className}`}
    >
      <span className={`truncate font-semibold ${nameClassName || 'text-foreground'}`}>{name}</span>
      {showLevelDiamond && <DiamondBadge level={lvl || 1} size={diamondSize} />}
      {showSpecialBadges && (
        <SpecialBadgeInline profile={profile} size={size} showLabels={showSpecialLabels} />
      )}
    </Tag>
  );
});

export default UserDisplayName;
