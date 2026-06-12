import { describe, it, expect } from 'vitest'
import { SALONS, SCENE_MEMBERS, EMOJIS, QUICK_REACTIONS, SALON_TYPES, SALON_EMOJIS_LIST, AVATAR_STYLES } from '@/lib/chatConfig'

describe('chatConfig utilities', () => {
  it('should export SALONS array', () => {
    expect(Array.isArray(SALONS)).toBe(true)
    expect(SALONS.length).toBeGreaterThan(0)
  })

  it('should export SCENE_MEMBERS mapping', () => {
    expect(typeof SCENE_MEMBERS).toBe('object')
    expect(Object.keys(SCENE_MEMBERS).length).toBeGreaterThan(0)
  })

  it('should export EMOJIS array', () => {
    expect(Array.isArray(EMOJIS)).toBe(true)
    expect(EMOJIS.length).toBeGreaterThan(0)
  })

  it('should export QUICK_REACTIONS array', () => {
    expect(Array.isArray(QUICK_REACTIONS)).toBe(true)
    expect(QUICK_REACTIONS.length).toBeGreaterThan(0)
  })

  it('should export SALON_TYPES array', () => {
    expect(Array.isArray(SALON_TYPES)).toBe(true)
    expect(SALON_TYPES.length).toBeGreaterThan(0)
  })

  it('should export SALON_EMOJIS_LIST array', () => {
    expect(Array.isArray(SALON_EMOJIS_LIST)).toBe(true)
    expect(SALON_EMOJIS_LIST.length).toBeGreaterThan(0)
  })

  it('should export AVATAR_STYLES mapping', () => {
    expect(typeof AVATAR_STYLES).toBe('object')
    expect(Object.keys(AVATAR_STYLES).length).toBeGreaterThan(0)
  })

  it('should have consistent salon IDs between SALONS and SCENE_MEMBERS', () => {
    const salonIds = SALONS.map(s => s.id)
    const sceneIds = Object.keys(SCENE_MEMBERS)
    sceneIds.forEach(id => {
      expect(salonIds).toContain(id)
    })
  })
})
