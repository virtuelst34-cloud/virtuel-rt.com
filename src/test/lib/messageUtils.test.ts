import { describe, it, expect } from 'vitest';
import {
  convertSupabaseMessage,
  resolveReplyReferences,
  toDbMessageUpdates,
  dedupeAndSortMessages,
} from '@/lib/utils/messageUtils';

describe('messageUtils', () => {
  const baseSupabaseMessage = {
    id: 'msg-1',
    salon_id: 'libre',
    author_name: 'Alice',
    author_avatar: 'av1',
    author_initials: 'AL',
    text: 'Bonjour',
    created_date: '2026-01-01T10:00:00.000Z',
    created_at: '2026-01-01T10:00:00.000Z',
  };

  it('convertSupabaseMessage mappe les champs et conserve reply_to en ID interne', () => {
    const converted = convertSupabaseMessage({
      ...baseSupabaseMessage,
      reply_to: 'msg-parent',
      edited: true,
      edited_at: '2026-01-01T10:05:00.000Z',
    });

    expect(converted.id).toBe('msg-1');
    expect(converted._replyToId).toBe('msg-parent');
    expect(converted.edited).toBe(true);
    expect(converted).not.toHaveProperty('reply_to');
  });

  it('resolveReplyReferences attache le message parent', () => {
    const parent = convertSupabaseMessage(baseSupabaseMessage);
    const child = convertSupabaseMessage({
      ...baseSupabaseMessage,
      id: 'msg-2',
      text: 'Réponse',
      reply_to: 'msg-1',
    });

    const resolved = resolveReplyReferences([parent, child]);

    expect(resolved[1].replyTo).toEqual({
      id: 'msg-1',
      author_name: 'Alice',
      author_avatar: 'av1',
      author_initials: 'AL',
      text: 'Bonjour',
      created_date: '2026-01-01T10:00:00.000Z',
    });
    expect(resolved[1]).not.toHaveProperty('_replyToId');
  });

  it('resolveReplyReferences ignore un parent manquant', () => {
    const orphan = convertSupabaseMessage({
      ...baseSupabaseMessage,
      reply_to: 'missing-id',
    });

    const resolved = resolveReplyReferences([orphan]);
    expect(resolved[0].replyTo).toBeUndefined();
  });

  it('toDbMessageUpdates n\'envoie pas replyTo', () => {
    const db = toDbMessageUpdates({
      text: 'modifié',
      edited: true,
      edited_at: '2026-01-01T11:00:00.000Z',
      replyTo: {
        id: 'x',
        author_name: 'Bob',
        author_avatar: 'av2',
        author_initials: 'BO',
        text: 'parent',
        created_date: '2026-01-01T09:00:00.000Z',
      },
    });

    expect(db).toEqual({
      text: 'modifié',
      edited: true,
      edited_at: '2026-01-01T11:00:00.000Z',
    });
    expect(db).not.toHaveProperty('replyTo');
  });

  it('dedupeAndSortMessages garde les annonces en tête', () => {
    const sorted = dedupeAndSortMessages([
      { ...baseSupabaseMessage, id: 'b', created_date: '2026-01-01T11:00:00.000Z', is_announcement: false } as any,
      { ...baseSupabaseMessage, id: 'a', created_date: '2026-01-01T09:00:00.000Z', is_announcement: true } as any,
      { ...baseSupabaseMessage, id: 'a', created_date: '2026-01-01T09:00:00.000Z', is_announcement: true } as any,
    ]);

    expect(sorted.map(m => m.id)).toEqual(['a', 'b']);
  });
});
