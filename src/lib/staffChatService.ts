/**
 * Espace de discussion staff (modérateurs / direction / fondateur).
 */
import { supabase } from './supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface StaffMessage {
  id: string;
  author_id: string | null;
  author_name: string;
  body: string;
  file_url?: string | null;
  file_name?: string | null;
  reactions?: Record<string, string[]>;
  created_at: string;
}

export interface StaffMessageAttachment {
  fileUrl: string;
  fileName?: string | null;
}

export const staffChatService = {
  async fetchMessages(limit = 100): Promise<StaffMessage[]> {
    try {
      const { data, error } = await supabase
        .from('staff_messages')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(limit);
      if (error) throw error;
      return ((data || []) as StaffMessage[]).map(normalizeStaffMessage);
    } catch (error) {
      console.error('Erreur chargement messages staff:', error);
      return [];
    }
  },

  async sendMessage(
    authorId: string | null,
    authorName: string,
    body: string,
    attachment?: StaffMessageAttachment | null,
  ): Promise<StaffMessage | null> {
    const trimmed = body.trim();
    const fileUrl = attachment?.fileUrl?.trim() || null;
    const fileName = attachment?.fileName?.trim() || null;
    if (!trimmed && !fileUrl) return null;
    try {
      const { data, error } = await supabase
        .from('staff_messages')
        .insert({
          author_id: authorId,
          author_name: authorName,
          body: (trimmed || (fileUrl ? '📎 Fichier' : '')).slice(0, 2000),
          file_url: fileUrl,
          file_name: fileName,
          reactions: {},
        })
        .select()
        .maybeSingle();
      if (error) throw error;
      return data ? normalizeStaffMessage(data as StaffMessage) : null;
    } catch (error) {
      console.error('Erreur envoi message staff:', error);
      return null;
    }
  },

  async deleteMessage(id: string): Promise<boolean> {
    try {
      const { error } = await supabase.from('staff_messages').delete().eq('id', id);
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Erreur suppression message staff:', error);
      return false;
    }
  },

  /**
   * Bascule une réaction emoji pour un utilisateur (persistance Supabase).
   */
  async toggleReaction(
    messageId: string,
    emoji: string,
    userName: string,
  ): Promise<Record<string, string[]> | null> {
    try {
      const { data, error } = await supabase.rpc('update_staff_message_reaction', {
        p_message_id: messageId,
        p_emoji: emoji,
        p_user_name: userName,
      });
      if (error) throw error;
      return (data || {}) as Record<string, string[]>;
    } catch (error) {
      console.error('Erreur réaction message staff:', error);
      // Fallback si la RPC n'est pas encore déployée : update client-side
      try {
        const { data: row, error: fetchErr } = await supabase
          .from('staff_messages')
          .select('reactions')
          .eq('id', messageId)
          .maybeSingle();
        if (fetchErr) throw fetchErr;
        const reactions: Record<string, string[]> = {
          ...(((row?.reactions as Record<string, string[]>) || {})),
        };
        const users = [...(reactions[emoji] || [])];
        const idx = users.indexOf(userName);
        if (idx >= 0) users.splice(idx, 1);
        else users.push(userName);
        if (users.length === 0) delete reactions[emoji];
        else reactions[emoji] = users;
        const { error: updErr } = await supabase
          .from('staff_messages')
          .update({ reactions })
          .eq('id', messageId);
        if (updErr) throw updErr;
        return reactions;
      } catch (fallbackError) {
        console.error('Erreur fallback réaction staff:', fallbackError);
        return null;
      }
    }
  },

  subscribe(
    onInsert: (msg: StaffMessage) => void,
    onDelete?: (id: string) => void,
    onUpdate?: (msg: StaffMessage) => void,
  ): RealtimeChannel {
    return supabase
      .channel('staff_messages_realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'staff_messages' },
        (payload) => onInsert(normalizeStaffMessage(payload.new as StaffMessage)),
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'staff_messages' },
        (payload) => {
          if (onUpdate) onUpdate(normalizeStaffMessage(payload.new as StaffMessage));
        },
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'staff_messages' },
        (payload) => {
          const old = payload.old as { id?: string };
          if (old?.id && onDelete) onDelete(old.id);
        },
      )
      .subscribe();
  },
};

function normalizeStaffMessage(msg: StaffMessage): StaffMessage {
  return {
    ...msg,
    body: msg.body ?? '',
    file_url: msg.file_url ?? null,
    file_name: msg.file_name ?? null,
    reactions: msg.reactions && typeof msg.reactions === 'object' ? msg.reactions : {},
  };
}
