import { describe, it, expect } from 'vitest'
import { parseNotificationTarget, formatSupabaseError } from '@/lib/utils/notificationNavigation'
import { isValidUuid } from '@/lib/utils/uuid'

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
