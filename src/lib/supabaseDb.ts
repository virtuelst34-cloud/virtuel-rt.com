import { supabase, Database } from './supabase';
import { apiRateLimiter, messageRateLimiter } from './rateLimiter';

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
  created_at: string;
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
    // Rate limiting pour les messages
    const rateLimitKey = `message:${message.author_name}`;
    if (!messageRateLimiter.canRequest(rateLimitKey)) {
      console.warn('Rate limit exceeded for messages:', message.author_name);
      throw new Error('Trop de messages. Veuillez attendre avant de continuer.');
    }

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

  async updateMessage(messageId: string, updates: Partial<Message>): Promise<void> {
    try {
      await supabase.from('messages').update(updates).eq('id', messageId);
    } catch (error) {
      console.error('Erreur lors de la mise à jour du message:', error);
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

  async addSalon(salon: Omit<Salon, 'id' | 'created_at'>): Promise<Salon | null> {
    try {
      const { data, error } = await supabase
        .from('salons')
        .insert(salon)
        .select()
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Erreur lors de l\'ajout du salon:', error);
      return null;
    }
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
    try {
      const { data: existing } = await supabase
        .from('preferences')
        .select('id')
        .eq('user_name', userName)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('preferences')
          .update(updates)
          .eq('id', existing.id);
      } else {
        await supabase.from('preferences').insert({
          user_name: userName,
          ...updates,
        });
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour des préférences:', error);
    }
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

  // Realtime subscription pour les messages
  subscribeToMessages(salonId: string, callback: (message: Message) => void) {
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
          callback(payload.new as Message);
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
};
