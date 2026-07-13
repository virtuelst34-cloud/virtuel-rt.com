import { UserProfile as SupabaseUserProfile } from '../supabaseAuth';
import { UserProfile } from '../contexts/UserContext';

const STORED_BADGE_IDS = ['founder', 'moderator', 'vip', 'direction', 'master_op', 'iridescent'] as const;

export function badgesFromProfile(profile: {
  is_founder?: boolean;
  is_direction?: boolean;
  is_master_op?: boolean;
  is_iridescent?: boolean;
  special_badges?: string[];
}): string[] {
  const fromArray = profile.special_badges || [];
  const derived = [
    ...(profile.is_founder || fromArray.includes('founder') ? ['founder'] : []),
    ...(profile.is_direction || fromArray.includes('direction') ? ['direction'] : []),
    ...(profile.is_master_op || fromArray.includes('master_op') ? ['master_op'] : []),
    ...(profile.is_iridescent || fromArray.includes('iridescent') ? ['iridescent'] : []),
    ...fromArray.filter((b) => b === 'moderator' || b === 'vip'),
  ];
  return [...new Set(derived)];
}

export function profileFlagsFromBadges(badges: string[]) {
  const unique = [...new Set(badges)];
  return {
    is_founder: unique.includes('founder'),
    is_direction: unique.includes('direction'),
    is_master_op: unique.includes('master_op'),
    is_iridescent: unique.includes('iridescent'),
    special_badges: unique.filter((b) =>
      (STORED_BADGE_IDS as readonly string[]).includes(b)
    ),
  };
}

export function mapSupabaseProfile(profile: SupabaseUserProfile): UserProfile {
  const specialBadges = badgesFromProfile(profile);
  const isFounder = specialBadges.includes('founder');
  const isDirection = specialBadges.includes('direction');
  const isMasterOp = specialBadges.includes('master_op');
  const isIridescent = specialBadges.includes('iridescent');

  return {
    id: profile.id,
    name: profile.name,
    avatar: profile.avatar,
    initials: profile.initials,
    bio: profile.bio || '',
    xp: profile.xp,
    level: profile.level,
    monthlyXP: 0,
    isBanned: false,
    isMuted: false,
    banReason: '',
    isPremium: profile.is_premium,
    isAdmin: !!profile.is_admin || isFounder || isDirection || isMasterOp,
    status: profile.status || 'online',
    joinedAt: profile.created_at,
    statusText: profile.status_text || '',
    email: profile.email,
    emailVerified: profile.email_confirmed_at ? true : false,
    isFounder,
    isDirection,
    isMasterOp,
    isIridescent,
    specialBadges,
    age: profile.age,
    city: profile.city,
    gender: profile.gender,
  };
}
