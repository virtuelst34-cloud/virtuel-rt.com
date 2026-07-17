import { supabase, Database } from './supabase';
import { messageRateLimiter } from './rateLimiter';
import { checkServerRateLimit, RateLimitAction } from './rateLimitService';

export interface Message {
  id: string;
  salon_id: string;
  author_name: string;
  author_avatar: string;
  author_initials: string;
  text: string;
  created_date: string;
  reactions?: Record<string, string[]>;
  pinned?: boolean;
  is_system?: boolean;
  is_announcement?: boolean;
  reply_to?: string;
  image_url?: string;
  edited?: boolean;
  edited_at?: string;
  created_at: string;
}

export interface MessageEventHandlers {
  onInsert: (message: Message) => void;
  onUpdate: (message: Message) => void;
  onDelete: (messageId: string) => void;
}

export interface Salon {
  id: string;
  name: string;
  type: string;
  icon: string;
  count?: number;
  live?: boolean;
  welcome: string;
  password?: string;
  created_at: string;
}

export interface XPEntry {
  id: string;
  user_name: string;
  xp: number;
  month: string;
  created_at: string;
}

export interface Preferences {
  id: string;
  user_name: string;
  theme: 'dark' | 'light';
  party_mode: boolean;
  is_premium: boolean;
  accent_color: string;
  compact_mode: boolean;
  created_at: string;
  updated_at: string;
}

export interface CustomBadge {
  id: string;
  name: string;
  icon: string;
  min_level: number;
  created_at: string;
}

export interface Report {
  id: string;
  target_id: string;
  target_type: 'message' | 'user';
  target_name?: string;
  target_content?: string;
  reason: string;
  description?: string;
  reporter: string;
  timestamp: string;
  created_at: string;
}

// Service de base de données Supabase
async function enforceRateLimit(action: RateLimitAction, userId: string): Promise<void> {
  const rateLimitKey = `${action}:${userId}`;
  if (!messageRateLimiter.canRequest(rateLimitKey)) {
    throw new Error('Trop de requêtes. Veuillez patienter avant de continuer.');
  }

  const server = await checkServerRateLimit(action, userId);
  if (!server.allowed) {
    throw new Error(server.error || 'Trop de requêtes. Veuillez patienter avant de continuer.');
  }
}

export const supabaseDbService = {
  // Messages
  async getMessages(salonId: string, limit: number = 200, offset: number = 0): Promise<Message[]> {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('salon_id', salonId)
        .order('created_at', { ascending: true })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Erreur lors de la récupération des messages:', error);
      return [];
    }
  },

  async addMessage(message: Omit<Message, 'id' | 'created_at'>): Promise<Message | null> {
    await enforceRateLimit('message', message.author_name);

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert(message)
        .select()
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Erreur lors de l\'ajout du message:', error);
      return null;
    }
  },

  async deleteMessage(messageId: string): Promise<void> {
    try {
      await supabase.from('messages').delete().eq('id', messageId);
    } catch (error) {
      console.error('Erreur lors de la suppression du message:', error);
    }
  },

  async updateMessage(messageId: string, updates: Partial<Message>, actorName?: string): Promise<void> {
    if (updates.reactions !== undefined && actorName) {
      await enforceRateLimit('reaction', actorName);
    }

    try {
      const { reactions, ...otherUpdates } = updates;

      if (reactions) {
        const { error } = await supabase.rpc('update_message_reaction', {
          message_id: messageId,
          new_reactions: reactions,
        });
        if (error) throw error;
      }

      if (Object.keys(otherUpdates).length > 0) {
        const { error } = await supabase.from('messages').update(otherUpdates).eq('id', messageId);
        if (error) throw error;
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour du message:', error);
      throw error;
    }
  },

  // Salons
  async getSalons(): Promise<Salon[]> {
    try {
      const { data, error } = await supabase.from('salons').select('*');
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Erreur lors de la récupération des salons:', error);
      return [];
    }
  },

  async addSalon(salon: Omit<Salon, 'created_at'>, creatorName?: string): Promise<Salon | null> {
    if (creatorName) {
      await enforceRateLimit('salon_create', creatorName);
    }

    const { data, error } = await supabase
      .from('salons')
      .insert(salon)
      .select()
      .maybeSingle();

    if (error) {
      console.error('Erreur lors de l\'ajout du salon:', error);
      throw error;
    }

    return data;
  },

  async deleteSalon(salonId: string): Promise<void> {
    try {
      await supabase.from('salons').delete().eq('id', salonId);
    } catch (error) {
      console.error('Erreur lors de la suppression du salon:', error);
    }
  },

  // XP
  async getMonthlyXP(userName: string, month: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('xp_monthly')
        .select('xp')
        .eq('user_name', userName)
        .eq('month', month)
        .maybeSingle();

      if (error) throw error;
      return data?.xp || 0;
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'XP mensuel:', error);
      return 0;
    }
  },

  async updateMonthlyXP(userName: string, month: string, xp: number): Promise<void> {
    try {
      const { data: existing } = await supabase
        .from('xp_monthly')
        .select('id')
        .eq('user_name', userName)
        .eq('month', month)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('xp_monthly')
          .update({ xp })
          .eq('id', existing.id);
      } else {
        await supabase.from('xp_monthly').insert({
          user_name: userName,
          month,
          xp,
        });
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'XP mensuel:', error);
    }
  },

  async getAllMonthlyXP(month: string): Promise<Record<string, number>> {
    try {
      const { data, error } = await supabase
        .from('xp_monthly')
        .select('user_name, xp')
        .eq('month', month);

      if (error) throw error;
      const map: Record<string, number> = {};
      for (const row of data || []) {
        map[row.user_name] = row.xp || 0;
      }
      return map;
    } catch (error) {
      console.error('Erreur lors du chargement XP mensuel global:', error);
      return {};
    }
  },

  async searchMessages(
    query: string,
    options: { salonId?: string; authorName?: string; limit?: number } = {},
  ): Promise<Message[]> {
    const trimmed = query.trim();
    if (!trimmed) return [];

    try {
      let request = supabase
        .from('messages')
        .select('*')
        .ilike('text', `%${trimmed}%`)
        .order('created_at', { ascending: false })
        .limit(options.limit ?? 100);

      if (options.salonId) {
        request = request.eq('salon_id', options.salonId);
      }
      if (options.authorName) {
        request = request.eq('author_name', options.authorName);
      }

      const { data, error } = await request;
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Erreur recherche messages:', error);
      return [];
    }
  },

  async getMessageCountsBySalon(salonIds: string[]): Promise<Record<string, number>> {
    if (salonIds.length === 0) return {};

    try {
      const entries = await Promise.all(
        salonIds.map(async (salonId) => {
          const { count, error } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('salon_id', salonId);
          return [salonId, error ? 0 : (count ?? 0)] as const;
        })
      );
      return Object.fromEntries(entries);
    } catch (error) {
      console.error('Erreur comptage messages par salon:', error);
      return {};
    }
  },

  async unlockAchievement(userName: string, achievementId: string): Promise<void> {
    try {
      await supabase.from('user_achievements').upsert({
        user_name: userName,
        achievement_id: achievementId,
        unlocked_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Erreur sync achievement:', error);
    }
  },

  async getUserAchievementsFromDb(userName: string): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('user_achievements')
        .select('achievement_id')
        .eq('user_name', userName);
      if (error) throw error;
      return (data || []).map(r => r.achievement_id);
    } catch (error) {
      console.error('Erreur chargement achievements:', error);
      return [];
    }
  },

  // Préférences
  async getPreferences(userName: string): Promise<Preferences | null> {
    try {
      const { data, error } = await supabase
        .from('preferences')
        .select('*')
        .eq('user_name', userName)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Erreur lors de la récupération des préférences:', error);
      return null;
    }
  },

  async updatePreferences(userName: string, updates: Partial<Preferences>): Promise<void> {
    const { error } = await supabase
      .from('preferences')
      .upsert(
        { user_name: userName, ...updates },
        { onConflict: 'user_name' },
      );

    if (error) throw error;
  },

  // Badges personnalisés
  async getCustomBadges(): Promise<CustomBadge[]> {
    try {
      const { data, error } = await supabase.from('custom_badges').select('*');
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Erreur lors de la récupération des badges:', error);
      return [];
    }
  },

  async addCustomBadge(badge: Omit<CustomBadge, 'id' | 'created_at'>): Promise<CustomBadge | null> {
    try {
      const { data, error } = await supabase
        .from('custom_badges')
        .insert(badge)
        .select()
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Erreur lors de l\'ajout du badge:', error);
      return null;
    }
  },

  // Rapports
  async addReport(report: Omit<Report, 'id' | 'created_at'>): Promise<Report | null> {
    try {
      const { data, error } = await supabase
        .from('reports')
        .insert(report)
        .select()
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Erreur lors de l\'ajout du rapport:', error);
      return null;
    }
  },

  // Realtime subscription pour les messages (insert, update, delete)
  subscribeToMessages(salonId: string, handlers: MessageEventHandlers) {
    return supabase
      .channel(`messages:${salonId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `salon_id=eq.${salonId}`,
        },
        (payload) => {
          handlers.onInsert(payload.new as Message);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `salon_id=eq.${salonId}`,
        },
        (payload) => {
          handlers.onUpdate(payload.new as Message);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
          filter: `salon_id=eq.${salonId}`,
        },
        (payload) => {
          const oldRow = payload.old as { id?: string };
          if (oldRow.id) handlers.onDelete(oldRow.id);
        }
      )
      .subscribe();
  },

  // Realtime subscription pour les profils utilisateurs
  subscribeToProfiles(callback: (profile: any) => void) {
    return supabase
      .channel('profiles')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
        },
        (payload) => {
          callback(payload.new);
        }
      )
      .subscribe();
  },

  async notifyUserByName(
    targetName: string,
    type: string,
    message: string,
    groupKey?: string,
  ): Promise<void> {
    try {
      await supabase.rpc('notify_user_by_name', {
        p_target_name: targetName,
        p_type: type,
        p_message: message,
        p_group_key: groupKey ?? null,
      });
    } catch (error) {
      console.error('Erreur notification utilisateur:', error);
    }
  },
};
