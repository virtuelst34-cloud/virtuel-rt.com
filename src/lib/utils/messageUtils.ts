import { Message as SupabaseMessage } from '../supabaseDb';

export interface ChatMessage {
  id: string;
  author_name: string;
  author_avatar: string;
  author_initials: string;
  text: string;
  timestamp?: string;
  created_date: string;
  reactions?: Record<string, string[]>;
  pinned?: boolean;
  is_system?: boolean;
  is_announcement?: boolean;
  replyTo?: Pick<ChatMessage, 'id' | 'author_name' | 'author_avatar' | 'author_initials' | 'text' | 'created_date'>;
  image_url?: string;
  edited?: boolean;
  edited_at?: string;
}

/** Convertit un message Supabase en message UI (reply_to conservé en ID interne). */
export function convertSupabaseMessage(supabaseMsg: SupabaseMessage): ChatMessage & { _replyToId?: string } {
  return {
    id: supabaseMsg.id,
    author_name: supabaseMsg.author_name,
    author_avatar: supabaseMsg.author_avatar,
    author_initials: supabaseMsg.author_initials,
    text: supabaseMsg.text,
    created_date: supabaseMsg.created_date,
    reactions: supabaseMsg.reactions || undefined,
    pinned: supabaseMsg.pinned || undefined,
    is_system: supabaseMsg.is_system || undefined,
    is_announcement: supabaseMsg.is_announcement || undefined,
    image_url: supabaseMsg.image_url || undefined,
    edited: supabaseMsg.edited || undefined,
    edited_at: supabaseMsg.edited_at || undefined,
    _replyToId: supabaseMsg.reply_to || undefined,
  };
}

/** Résout les références reply_to en objets replyTo affichables. */
export function resolveReplyReferences(messages: (ChatMessage & { _replyToId?: string })[]): ChatMessage[] {
  const byId = new Map(messages.map(m => [m.id, m]));

  return messages.map(({ _replyToId, ...message }) => {
    if (!_replyToId) return message;

    const parent = byId.get(_replyToId);
    if (!parent) return message;

    return {
      ...message,
      replyTo: {
        id: parent.id,
        author_name: parent.author_name,
        author_avatar: parent.author_avatar,
        author_initials: parent.author_initials,
        text: parent.text,
        created_date: parent.created_date,
      },
    };
  });
}

/** Mappe les mises à jour UI vers le schéma Supabase (évite d'envoyer replyTo côté client). */
export function toDbMessageUpdates(updates: Partial<ChatMessage>): Partial<SupabaseMessage> {
  const dbUpdates: Partial<SupabaseMessage> = {};

  if (updates.text !== undefined) dbUpdates.text = updates.text;
  if (updates.pinned !== undefined) dbUpdates.pinned = updates.pinned;
  if (updates.reactions !== undefined) dbUpdates.reactions = updates.reactions;
  if (updates.edited !== undefined) dbUpdates.edited = updates.edited;
  if (updates.edited_at !== undefined) dbUpdates.edited_at = updates.edited_at;
  if (updates.image_url !== undefined) dbUpdates.image_url = updates.image_url;

  return dbUpdates;
}

export function dedupeAndSortMessages(messages: ChatMessage[]): ChatMessage[] {
  const unique = messages.filter((m, i, arr) => arr.findIndex(x => x.id === m.id) === i);
  return unique.sort((a, b) => {
    if (a.is_announcement && !b.is_announcement) return -1;
    if (!a.is_announcement && b.is_announcement) return 1;
    return new Date(a.created_date).getTime() - new Date(b.created_date).getTime();
  });
}
