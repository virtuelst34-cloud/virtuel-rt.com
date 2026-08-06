import React, { memo } from 'react';
import { AVATAR_STYLES } from '@/lib/chatConfig';
import { MOOD_OPTIONS, type MoodId } from '@/lib/funFeatures';
import AvatarFace from './AvatarFace';
import { useUIOptional } from '@/lib/contexts/UIContext';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg';

interface AvatarProps {
  avatarClass: string;
  initials: string;
  size?: AvatarSize;
  mood?: MoodId | string | null;
  /** Si défini avec openProfileOnClick, ouvre la fiche profil au clic. */
  profileName?: string;
  /** Avatar cliquable → openUserProfile(profileName). Défaut false. */
  openProfileOnClick?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
  title?: string;
  'aria-label'?: string;
}

const Avatar = memo(function Avatar({
  avatarClass,
  initials,
  size = 'md',
  mood,
  profileName,
  openProfileOnClick = false,
  onClick,
  className = '',
  title,
  'aria-label': ariaLabel,
}: AvatarProps) {
  const ui = useUIOptional();
  const style = AVATAR_STYLES[avatarClass] || AVATAR_STYLES.av1;
  const sizes: Record<AvatarSize, string> = {
    xs: 'w-[18px] h-[18px] text-[7px]',
    sm: 'w-[26px] h-[26px] text-[9px]',
    md: 'w-[28px] h-[28px] text-[10px]',
    lg: 'w-[36px] h-[36px] text-[11px]',
  };
  const sizeClass = sizes[size] || sizes.md;
  const moodRing = mood && mood !== 'off'
    ? (MOOD_OPTIONS.find(m => m.id === mood)?.ring || '')
    : '';
  const clickable = !!(onClick || (openProfileOnClick && profileName && ui));

  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      onClick(e);
      return;
    }
    if (openProfileOnClick && profileName && ui) {
      e.stopPropagation();
      ui.openUserProfile(profileName);
    }
  };

  const sharedClass = `${sizeClass} rounded-full overflow-hidden flex items-center justify-center font-bold border shrink-0 ${style.bg} ${style.border} ${moodRing} ${clickable ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''} ${className}`;

  if (clickable) {
    return (
      <button
        type="button"
        className={sharedClass}
        title={title || initials}
        aria-label={ariaLabel || (profileName ? `Voir le profil de ${profileName}` : initials)}
        onClick={handleClick}
      >
        <AvatarFace style={style} />
      </button>
    );
  }

  return (
    <div
      className={sharedClass}
      title={title || initials}
    >
      <AvatarFace style={style} />
    </div>
  );
});

export default Avatar;
