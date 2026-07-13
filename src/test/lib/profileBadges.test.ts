import { describe, it, expect } from 'vitest';
import { hasAdminAccess, isFounder } from '@/lib/utils/founderCheck';
import { badgesFromProfile, profileFlagsFromBadges, mapSupabaseProfile } from '@/lib/utils/profileBadges';
import type { UserProfile } from '@/lib/contexts/UserContext';

describe('founderCheck', () => {
  const baseUser: UserProfile = {
    name: 'Test',
    avatar: 'av1',
    initials: 'TE',
    bio: '',
    xp: 0,
    level: 1,
    monthlyXP: 0,
    isBanned: false,
    isMuted: false,
    banReason: '',
    isPremium: false,
    isAdmin: false,
    status: 'online',
    joinedAt: '2026-01-01',
  };

  it('isFounder exige email fondateur et badge fondateur', () => {
    expect(isFounder({ ...baseUser, email: 'virtuelst34@gmail.com', isFounder: true })).toBe(true);
    expect(isFounder({ ...baseUser, email: 'virtuelst34@gmail.com', isFounder: false })).toBe(false);
    expect(isFounder({ ...baseUser, email: 'other@example.com', isFounder: true })).toBe(false);
  });

  it('hasAdminAccess autorise admin, fondateur, direction et master OP', () => {
    expect(hasAdminAccess({ ...baseUser, isAdmin: true })).toBe(true);
    expect(hasAdminAccess({ ...baseUser, isFounder: true })).toBe(true);
    expect(hasAdminAccess({ ...baseUser, isDirection: true })).toBe(true);
    expect(hasAdminAccess({ ...baseUser, isMasterOp: true })).toBe(true);
    expect(hasAdminAccess(baseUser)).toBe(false);
    expect(hasAdminAccess(null)).toBe(false);
  });
});

describe('profileBadges', () => {
  it('badgesFromProfile dérive les badges depuis les flags et special_badges', () => {
    expect(badgesFromProfile({ is_founder: true, special_badges: ['vip'] })).toEqual(['founder', 'vip']);
  });

  it('profileFlagsFromBadges reconstruit les flags stockables', () => {
    expect(profileFlagsFromBadges(['founder', 'moderator', 'unknown'])).toEqual({
      is_founder: true,
      is_direction: false,
      is_master_op: false,
      is_iridescent: false,
      special_badges: ['founder', 'moderator'],
    });
  });

  it('mapSupabaseProfile calcule isAdmin pour direction et master OP', () => {
    const mapped = mapSupabaseProfile({
      id: '1',
      name: 'Dir',
      avatar: 'av1',
      initials: 'DI',
      status: 'online',
      level: 1,
      xp: 0,
      is_premium: false,
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
      is_direction: true,
    });

    expect(mapped.isAdmin).toBe(true);
    expect(mapped.isDirection).toBe(true);
  });
});
