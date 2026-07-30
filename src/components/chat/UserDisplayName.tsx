import React, { memo, useEffect } from 'react';
import { useUser } from '@/lib/contexts';
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
  as,
  ensureFetch = true,
  title,
  id,
  'aria-label': ariaLabel,
}: UserDisplayNameProps) {
  const { profiles, user, ensureProfiles } = useUser();
  const cached = profiles[name];
  const self = user?.name === name ? user : null;
  const profile = (profileProp || self || cached) as SpecialBadgeProfile | undefined;
  const lvl = level ?? (profile as { level?: number } | undefined)?.level ?? cached?.level ?? 1;

  useEffect(() => {
    if (!ensureFetch || !name) return;
    if (profileProp || self || cached) return;
    void ensureProfiles([name]);
  }, [ensureFetch, name, profileProp, self, cached, ensureProfiles]);

  const Tag: 'span' | 'button' = as || (onClick ? 'button' : 'span');
  const diamondSize = size === 'md' ? 'sm' : size;

  return (
    <Tag
      type={Tag === 'button' ? 'button' : undefined}
      id={id}
      title={title}
      aria-label={ariaLabel || name}
      onClick={onClick}
      className={`inline-flex items-center gap-1 min-w-0 max-w-full ${onClick ? 'cursor-pointer' : ''} ${className}`}
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
