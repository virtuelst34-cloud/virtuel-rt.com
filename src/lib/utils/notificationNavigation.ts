export interface NotificationTarget {
  kind: 'dm' | 'friend_request' | 'friend_accepted' | 'mention' | 'profile' | 'settings_friends' | 'none';
  userName?: string;
  salonId?: string;
}

/** Extrait la cible de navigation depuis groupKey / message / metadata. */
export function parseNotificationTarget(
  type: string,
  groupKey?: string | null,
  message?: string,
  metadata?: Record<string, unknown> | null,
): NotificationTarget {
  const metaUser =
    (typeof metadata?.from_user === 'string' && metadata.from_user) ||
    (typeof metadata?.sender_name === 'string' && metadata.sender_name) ||
    undefined;

  if (groupKey) {
    if (groupKey.startsWith('friend-request:')) {
      return { kind: 'friend_request', userName: groupKey.slice('friend-request:'.length) || metaUser };
    }
    if (groupKey.startsWith('friend-accepted:')) {
      return { kind: 'profile', userName: groupKey.slice('friend-accepted:'.length) || metaUser };
    }
    if (groupKey.startsWith('dm:')) {
      return { kind: 'dm', userName: groupKey.slice('dm:'.length) || metaUser };
    }
    if (groupKey.startsWith('mention:')) {
      return { kind: 'mention', userName: groupKey.slice('mention:'.length) || metaUser };
    }
  }

  if (type === 'friend_request') {
    const fromMessage = message?.match(/^👋\s*(.+?)\s+vous a envoyé/i)?.[1]?.trim();
    return { kind: 'settings_friends', userName: metaUser || fromMessage };
  }
  if (type === 'friend_accepted') {
    const fromMessage = message?.match(/🤝\s*(.+?)\s+a accepté/i)?.[1]?.trim();
    return { kind: 'profile', userName: metaUser || fromMessage };
  }
  if (type === 'dm') {
    const fromMessage = message?.match(/^💬\s*(.+?)\s*:/i)?.[1]?.trim();
    return { kind: 'dm', userName: metaUser || fromMessage };
  }
  if (type === 'mention') {
    return { kind: 'mention', userName: metaUser };
  }

  return { kind: 'none' };
}

export function formatSupabaseError(error: unknown): string {
  if (!error || typeof error !== 'object') return 'Erreur inconnue';
  const e = error as { message?: string; details?: string; hint?: string; code?: string };
  return e.message || e.details || e.hint || e.code || 'Erreur inconnue';
}
