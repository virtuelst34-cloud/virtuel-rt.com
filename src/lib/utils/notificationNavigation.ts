export interface NotificationTarget {
  kind:
    | 'dm'
    | 'friend_request'
    | 'friend_accepted'
    | 'mention'
    | 'profile'
    | 'settings_friends'
    | 'settings_profile'
    | 'settings_premium'
    | 'staff_chat'
    | 'staff_tools'
    | 'staff_modhub'
    | 'staff_moderation'
    | 'none';
  userName?: string;
  salonId?: string;
  messageId?: string;
  eventType?: string;
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
    (typeof metadata?.author_name === 'string' && metadata.author_name) ||
    (typeof metadata?.target === 'string' && metadata.target) ||
    undefined;

  const metaMessageId =
    (typeof metadata?.message_id === 'string' && metadata.message_id) ||
    undefined;

  const metaSalonId =
    (typeof metadata?.salon_id === 'string' && metadata.salon_id) ||
    (typeof metadata?.salonId === 'string' && metadata.salonId) ||
    undefined;

  const eventType =
    (typeof metadata?.event_type === 'string' && metadata.event_type) ||
    undefined;

  if (groupKey) {
    if (groupKey.startsWith('friend-request:')) {
      return { kind: 'friend_request', userName: groupKey.slice('friend-request:'.length) || metaUser };
    }
    if (groupKey.startsWith('friend-accepted:')) {
      return { kind: 'profile', userName: groupKey.slice('friend-accepted:'.length) || metaUser };
    }
    if (groupKey.startsWith('dm:')) {
      const target: NotificationTarget = { kind: 'dm', userName: groupKey.slice('dm:'.length) || metaUser };
      if (metaMessageId) target.messageId = metaMessageId;
      return target;
    }
    if (groupKey.startsWith('reaction:')) {
      const rest = groupKey.slice('reaction:'.length);
      const colon = rest.indexOf(':');
      const target: NotificationTarget = { kind: 'mention', userName: metaUser };
      if (colon > 0) {
        target.salonId = rest.slice(0, colon) || metaSalonId;
        target.messageId = rest.slice(colon + 1) || metaMessageId;
      } else {
        target.messageId = rest || metaMessageId;
        if (metaSalonId) target.salonId = metaSalonId;
      }
      return target;
    }
    if (groupKey.startsWith('mention:')) {
      const rest = groupKey.slice('mention:'.length);
      const colon = rest.indexOf(':');
      const target: NotificationTarget = { kind: 'mention' };
      if (colon > 0) {
        target.salonId = rest.slice(0, colon) || metaSalonId;
        target.userName = rest.slice(colon + 1) || metaUser;
      } else {
        target.userName = rest || metaUser;
        if (metaSalonId) target.salonId = metaSalonId;
      }
      if (metaMessageId) target.messageId = metaMessageId;
      return target;
    }
    if (groupKey.startsWith('staff_message:')) {
      return {
        kind: 'staff_chat',
        messageId: groupKey.slice('staff_message:'.length) || metaMessageId,
        userName: metaUser,
      };
    }
    if (groupKey.startsWith('moderation:')) {
      const evt = groupKey.slice('moderation:'.length) || eventType || '';
      if (evt === 'ban' || evt === 'unban' || evt === 'mute' || evt === 'unmute') {
        return { kind: 'staff_moderation', userName: metaUser, eventType: evt };
      }
      if (evt === 'new_report') {
        return { kind: 'staff_tools', userName: metaUser, eventType: evt };
      }
      return { kind: 'staff_modhub', userName: metaUser, eventType: evt };
    }
  }

  if (type === 'staff_message') {
    return { kind: 'staff_chat', messageId: metaMessageId, userName: metaUser };
  }
  if (type === 'staff_ban') {
    return { kind: 'staff_moderation', userName: metaUser, eventType };
  }
  if (type === 'staff_report') {
    return { kind: 'staff_tools', userName: metaUser, eventType: eventType || 'new_report' };
  }
  if (type === 'staff_alert' || type === 'moderation_alert') {
    if (eventType === 'ban' || eventType === 'unban' || eventType === 'mute' || eventType === 'unmute') {
      return { kind: 'staff_moderation', userName: metaUser, eventType };
    }
    if (eventType === 'new_report') {
      return { kind: 'staff_tools', userName: metaUser, eventType };
    }
    if (eventType === 'staff_message') {
      return { kind: 'staff_chat', messageId: metaMessageId, userName: metaUser };
    }
    return { kind: 'staff_modhub', userName: metaUser, eventType };
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
    const target: NotificationTarget = { kind: 'dm', userName: metaUser || fromMessage };
    if (metaMessageId) target.messageId = metaMessageId;
    return target;
  }
  if (type === 'mention') {
    const target: NotificationTarget = { kind: 'mention', userName: metaUser };
    if (metaSalonId) target.salonId = metaSalonId;
    if (metaMessageId) target.messageId = metaMessageId;
    return target;
  }
  if (type === 'levelup' || type === 'achievement') {
    return { kind: 'settings_profile' };
  }
  if (type === 'premium') {
    return { kind: 'settings_premium' };
  }
  if (type === 'system' && metaSalonId) {
    const target: NotificationTarget = { kind: 'mention', salonId: metaSalonId, userName: metaUser };
    if (metaMessageId) target.messageId = metaMessageId;
    return target;
  }
  if (type === 'report') {
    return { kind: 'none' };
  }

  return { kind: 'none' };
}

/** True si un clic doit naviguer quelque part (hors actions inline). */
export function isNavigableNotification(
  type: string,
  groupKey?: string | null,
  message?: string,
  metadata?: Record<string, unknown> | null,
): boolean {
  const kind = parseNotificationTarget(type, groupKey, message, metadata).kind;
  return kind !== 'none';
}

export function formatSupabaseError(error: unknown): string {
  if (!error || typeof error !== 'object') return 'Erreur inconnue';
  const e = error as { message?: string; details?: string; hint?: string; code?: string };
  return e.message || e.details || e.hint || e.code || 'Erreur inconnue';
}
