/** Types et helpers pour les notifications dédiées à l'Espace staff. */

export const STAFF_NOTIFICATION_TYPES = new Set([
  'staff_message',
  'staff_ban',
  'staff_report',
  'staff_alert',
  'moderation_alert',
]);

export type StaffNotificationType =
  | 'staff_message'
  | 'staff_ban'
  | 'staff_report'
  | 'staff_alert'
  | 'moderation_alert';

export function isStaffNotificationType(type: string | null | undefined): boolean {
  return !!type && STAFF_NOTIFICATION_TYPES.has(type);
}

/** Normalise un type / event_type vers une catégorie staff affichable. */
export function resolveStaffNotifCategory(
  type: string,
  metadata?: Record<string, unknown> | null,
): Exclude<StaffNotificationType, 'moderation_alert'> {
  if (type === 'staff_message' || type === 'staff_ban' || type === 'staff_report' || type === 'staff_alert') {
    return type;
  }
  const event =
    (typeof metadata?.event_type === 'string' && metadata.event_type) ||
    '';
  switch (event) {
    case 'ban':
    case 'unban':
    case 'mute':
    case 'unmute':
      return 'staff_ban';
    case 'new_report':
      return 'staff_report';
    case 'staff_message':
      return 'staff_message';
    default:
      return 'staff_alert';
  }
}

export function staffNotifLabel(category: string): string {
  switch (category) {
    case 'staff_message':
      return 'Chat staff';
    case 'staff_ban':
      return 'Modération';
    case 'staff_report':
      return 'Signalement';
    case 'staff_alert':
      return 'Alerte';
    default:
      return 'Staff';
  }
}
