import React, { memo } from 'react';
import { AVATAR_STYLES } from '@/lib/chatConfig';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg';

interface AvatarProps {
  avatarClass: string;
  initials: string;
  size?: AvatarSize;
}

const Avatar = memo(function Avatar({ avatarClass, initials, size = 'md' }: AvatarProps) {
  const style = AVATAR_STYLES[avatarClass] || AVATAR_STYLES.av1;
  const sizes: Record<AvatarSize, string> = {
    xs: 'w-[18px] h-[18px] text-[7px]',
    sm: 'w-[26px] h-[26px] text-[9px]',
    md: 'w-[28px] h-[28px] text-[10px]',
    lg: 'w-[36px] h-[36px] text-[11px]',
  };
  const sizeClass = sizes[size] || sizes.md;
  return (
    <div className={`${sizeClass} rounded-full flex items-center justify-center font-bold border shrink-0 ${style.bg} ${style.text} ${style.border}`}>
      {initials}
    </div>
  );
});

export default Avatar;
