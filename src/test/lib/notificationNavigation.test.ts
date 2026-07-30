import { describe, it, expect } from 'vitest'
import { parseNotificationTarget, formatSupabaseError } from '@/lib/utils/notificationNavigation'
import { isValidUuid } from '@/lib/utils/uuid'
import { isStaffNotificationType, resolveStaffNotifCategory } from '@/lib/utils/staffNotifications'

describe('parseNotificationTarget', () => {
  it('ouvre un DM depuis groupKey dm:', () => {
    expect(parseNotificationTarget('dm', 'dm:Alice', '💬 Alice: salut')).toEqual({
      kind: 'dm',
      userName: 'Alice',
    })
  })

  it('ouvre les paramètres amis pour une demande', () => {
    expect(parseNotificationTarget('friend_request', 'friend-request:Bob')).toEqual({
      kind: 'friend_request',
      userName: 'Bob',
    })
  })

  it('extrait l’expéditeur depuis le message sans groupKey', () => {
    expect(parseNotificationTarget('friend_request', null, '👋 Createur vous a envoyé une demande d\'ami')).toEqual({
      kind: 'settings_friends',
      userName: 'Createur',
    })
  })

  it('ouvre le profil après acceptation', () => {
    expect(parseNotificationTarget('friend_accepted', 'friend-accepted:Eve')).toEqual({
      kind: 'profile',
      userName: 'Eve',
    })
  })

  it('ouvre le chat staff pour staff_message', () => {
    expect(
      parseNotificationTarget('staff_message', 'staff_message:abc-123', '💬 Mod: salut', {
        message_id: 'abc-123',
        author_name: 'Mod',
      }),
    ).toEqual({
      kind: 'staff_chat',
      messageId: 'abc-123',
      userName: 'Mod',
    })
  })

  it('ouvre la modération pour un ban', () => {
    expect(
      parseNotificationTarget('staff_ban', 'moderation:ban', '🔨 Alice banni', {
        event_type: 'ban',
        target: 'Alice',
      }),
    ).toEqual({
      kind: 'staff_moderation',
      userName: 'Alice',
      eventType: 'ban',
    })
  })

  it('ouvre les outils staff pour un signalement', () => {
    expect(
      parseNotificationTarget('staff_report', 'moderation:new_report', 'Nouveau signalement', {
        event_type: 'new_report',
        target: 'Bob',
      }),
    ).toEqual({
      kind: 'staff_tools',
      userName: 'Bob',
      eventType: 'new_report',
    })
  })

  it('ouvre le Centre modo pour une alerte générique', () => {
    expect(
      parseNotificationTarget('moderation_alert', 'moderation:appeal', 'Appel', {
        event_type: 'appeal',
      }),
    ).toEqual({
      kind: 'staff_modhub',
      eventType: 'appeal',
      userName: undefined,
    })
  })

  it('ouvre une mention vers le salon', () => {
    expect(
      parseNotificationTarget('mention', 'mention:lobby:Alice', '@ Alice vous a mentionné', {
        salon_id: 'lobby',
        author_name: 'Alice',
      }),
    ).toEqual({
      kind: 'mention',
      salonId: 'lobby',
      userName: 'Alice',
    })
  })

  it('ouvre le profil pour levelup / achievement', () => {
    expect(parseNotificationTarget('levelup')).toEqual({ kind: 'settings_profile' })
    expect(parseNotificationTarget('achievement')).toEqual({ kind: 'settings_profile' })
  })
})

describe('staffNotifications helpers', () => {
  it('détecte les types staff', () => {
    expect(isStaffNotificationType('staff_message')).toBe(true)
    expect(isStaffNotificationType('moderation_alert')).toBe(true)
    expect(isStaffNotificationType('dm')).toBe(false)
  })

  it('mappe moderation_alert vers une catégorie', () => {
    expect(resolveStaffNotifCategory('moderation_alert', { event_type: 'mute' })).toBe('staff_ban')
    expect(resolveStaffNotifCategory('moderation_alert', { event_type: 'new_report' })).toBe('staff_report')
  })
})

describe('formatSupabaseError / isValidUuid', () => {
  it('formate une erreur Supabase', () => {
    expect(formatSupabaseError({ message: 'invalid input syntax for type uuid: ""', code: '22P02' }))
      .toContain('invalid input syntax')
  })

  it('rejette les UUID vides ou invalides', () => {
    expect(isValidUuid('')).toBe(false)
    expect(isValidUuid('123')).toBe(false)
    expect(isValidUuid('550e8400-e29b-41d4-a716-446655440000')).toBe(true)
  })
})
