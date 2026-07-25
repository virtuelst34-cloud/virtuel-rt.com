import React, { memo } from 'react';
import { AVATAR_STYLES } from '@/lib/chatConfig';
import { MOOD_OPTIONS, type MoodId } from '@/lib/funFeatures';
import AvatarFace from './AvatarFace';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg';

interface AvatarProps {
  avatarClass: string;
  initials: string;
  size?: AvatarSize;
  mood?: MoodId | string | null;
}

const Avatar = memo(function Avatar({ avatarClass, initials, size = 'md', mood }: AvatarProps) {
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
  return (
    <div
      className={`${sizeClass} rounded-full overflow-hidden flex items-center justify-center font-bold border shrink-0 ${style.bg} ${style.border} ${moodRing}`}
      title={initials}
    >
      <AvatarFace style={style} />
    </div>
  );
});

export default Avatar;
