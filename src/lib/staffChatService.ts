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
  created_at: string;
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
      return (data || []) as StaffMessage[];
    } catch (error) {
      console.error('Erreur chargement messages staff:', error);
      return [];
    }
  },

  async sendMessage(authorId: string | null, authorName: string, body: string): Promise<StaffMessage | null> {
    const trimmed = body.trim();
    if (!trimmed) return null;
    try {
      const { data, error } = await supabase
        .from('staff_messages')
        .insert({
          author_id: authorId,
          author_name: authorName,
          body: trimmed.slice(0, 2000),
        })
        .select()
        .maybeSingle();
      if (error) throw error;
      return data as StaffMessage;
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

  subscribe(onInsert: (msg: StaffMessage) => void, onDelete?: (id: string) => void): RealtimeChannel {
    return supabase
      .channel('staff_messages_realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'staff_messages' },
        (payload) => onInsert(payload.new as StaffMessage),
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
