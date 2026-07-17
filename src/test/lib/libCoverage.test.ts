import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateMessage, messageSchema, userProfileSchema } from '@/lib/validation';
import { detectSpam, clearUserHistory } from '@/lib/antiSpam';
import { sanitizeHTML, sanitizeMessageText } from '@/lib/sanitizer';
import { exportToJSON, exportToText } from '@/lib/exportUtils';
import { searchMessages } from '@/lib/searchUtils';
import { streakService, STREAK_BONUSES } from '@/lib/streaks';
import { recordMessageSent, recordReaction } from '@/lib/userActivity';
import { messageRateLimiter } from '@/lib/rateLimiter';
import { getBadgeForLevel } from '@/lib/diamondBadges';

describe('validation', () => {
  it('accepte un message valide', () => {
    expect(validateMessage({ text: 'Bonjour!' }).success).toBe(true);
  });

  it('rejette script XSS', () => {
    const r = messageSchema.safeParse({ text: '<script>alert(1)</script>' });
    expect(r.success).toBe(false);
  });

  it('valide un profil', () => {
    const r = userProfileSchema.safeParse({ name: 'Alice', avatar: 'av1', initials: 'AL' });
    expect(r.success).toBe(true);
  });
});

describe('antiSpam', () => {
  beforeEach(() => clearUserHistory('spammer'));

  it('détecte les messages dupliqués', () => {
    const msg = 'same message';
    detectSpam('spammer', msg);
    detectSpam('spammer', msg);
    const r = detectSpam('spammer', msg);
    expect(r.isSpam).toBe(true);
  });
});

describe('sanitizer', () => {
  it('supprime les balises script', () => {
    expect(sanitizeHTML('<script>x</script>hello')).not.toContain('<script');
  });

  it('sanitizeMessageText échappe HTML', () => {
    expect(sanitizeMessageText('<b>hi</b>')).toContain('&lt;b&gt;hi');
  });
});

describe('exportUtils', () => {
  it('export JSON crée un lien de téléchargement', () => {
    const append = vi.spyOn(document.body, 'appendChild').mockImplementation(() => document.createElement('a'));
    vi.spyOn(document.body, 'removeChild').mockImplementation(() => document.createElement('a'));
    URL.createObjectURL = vi.fn(() => 'blob:test');
    URL.revokeObjectURL = vi.fn();

    exportToJSON([{
      id: '1', author_name: 'A', text: 'hi', created_date: new Date().toISOString(),
      author_avatar: 'av1', author_initials: 'A', salon: 'general',
    }], 'general');

    expect(append).toHaveBeenCalled();
    append.mockRestore();
  });
});

describe('searchUtils', () => {
  const msgs = [
    { id: '1', author_name: 'Bob', text: 'Bonjour tout le monde', created_date: '', author_avatar: 'av1', author_initials: 'B', salon: 'g' },
  ];

  it('filtre par texte', () => {
    const r = searchMessages(msgs, { query: 'Bonjour' });
    expect(r.length).toBe(1);
  });
});

describe('streaks', () => {
  it('STREAK_BONUSES contient des paliers', () => {
    expect(STREAK_BONUSES.length).toBeGreaterThan(3);
  });

  it('recordActivity incrémente le streak', () => {
    streakService.recordActivity('user-streak-test');
    const s = streakService.getUserStreak('user-streak-test');
    expect(s?.currentStreak).toBeGreaterThanOrEqual(1);
  });
});

describe('userActivity', () => {
  it('recordMessageSent et recordReaction ne lancent pas', () => {
    expect(() => recordMessageSent('u1')).not.toThrow();
    expect(() => recordReaction('u1')).not.toThrow();
  });
});

describe('rateLimiter', () => {
  it('messageRateLimiter autorise', () => {
    expect(messageRateLimiter.canRequest(`test-${Date.now()}`)).toBe(true);
  });
});

describe('diamondBadges', () => {
  it('getBadgeForLevel niveau 1', () => {
    expect(getBadgeForLevel(1, [])).toBeDefined();
  });
});
