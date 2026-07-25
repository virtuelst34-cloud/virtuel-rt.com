import { describe, expect, it } from 'vitest';
import { DEFAULT_BANNED_WORDS, findBannedWord, mergeBannedWords } from '@/lib/bannedWords';
import { AGE_ACK_STORAGE_KEY, hasAgeAcknowledged, setAgeAcknowledged } from '@/lib/ageGate';

describe('bannedWords — mineurs / exploitation', () => {
  it('bloque des termes liés à l’exploitation de mineurs', () => {
    expect(findBannedWord('c’est un pédophile ici')).toBeTruthy();
    expect(findBannedWord('child porn link')).toBeTruthy();
    expect(findBannedWord('porno enfant')).toBeTruthy();
    expect(findBannedWord('lolicon art')).toBeTruthy();
  });

  it('ne bloque pas une phrase anodine', () => {
    expect(findBannedWord('Bonjour tout le monde, bienvenue !')).toBeNull();
  });

  it('mergeBannedWords ajoute les nouveaux mots par défaut', () => {
    const merged = mergeBannedWords(['customword']);
    expect(merged).toContain('customword');
    expect(merged).toContain('pédophile');
    expect(merged.length).toBeGreaterThan(DEFAULT_BANNED_WORDS.length);
  });
});

describe('ageGate', () => {
  it('stocke et lit l’accusé 18+', () => {
    localStorage.removeItem(AGE_ACK_STORAGE_KEY);
    expect(hasAgeAcknowledged()).toBe(false);
    setAgeAcknowledged();
    expect(hasAgeAcknowledged()).toBe(true);
  });
});
