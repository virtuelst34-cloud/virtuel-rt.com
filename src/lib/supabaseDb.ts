import { supabase, Database } from './supabase';
import { messageRateLimiter } from './rateLimiter';
import { checkServerRateLimit, RateLimitAction } from './rateLimitService';
import { getStoredGuestToken } from './guestAuthService';

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
  sort_order?: number;
  description?: string;
  created_by?: string | null;
  category_id?: string | null;
  subcategory?: string;
  is_coquin?: boolean;
  created_at: string;
}

export interface SalonCategoryRow {
  id: string;
  name: string;
  emoji: string;
  description: string;
  sort_order: number;
  subcategories: string[];
  is_coquin: boolean;
  created_at?: string;
  updated_at?: string;
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
  status?: 'pending' | 'in_progress' | 'resolved' | 'dismissed';
  handled_by?: string | null;
  handled_at?: string | null;
  staff_notes?: string | null;
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
      // Newest-first page, then reverse for chronological UI. Avoid select('*') bloat.
      const { data, error } = await supabase
        .from('messages')
        .select(
          'id, salon_id, author_name, author_avatar, author_initials, text, created_date, reactions, pinned, is_system, is_announcement, reply_to, image_url, edited, edited_at, created_at',
        )
        .eq('salon_id', salonId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      return (data || []).slice().reverse();
    } catch (error) {
      console.error('Erreur lors de la récupération des messages:', error);
      return [];
    }
  },

  async addMessage(message: Omit<Message, 'id' | 'created_at'>): Promise<Message | null> {
    await enforceRateLimit('message', message.author_name);

    try {
      // RPC forces author_name = current_actor_name (guest token in same TX)
      const { data, error } = await supabase.rpc('insert_own_message', {
        p_salon_id: message.salon_id,
        p_author_name: message.author_name,
        p_author_avatar: message.author_avatar,
        p_author_initials: message.author_initials,
        p_text: message.text,
        p_created_date: message.created_date,
        p_reactions: message.reactions ?? {},
        p_pinned: message.pinned ?? false,
        p_is_system: message.is_system ?? false,
        p_is_announcement: message.is_announcement ?? false,
        p_reply_to: message.reply_to ?? null,
        p_image_url: message.image_url ?? null,
        p_guest_token: getStoredGuestToken(),
      });

      if (error) throw error;
      return data as Message | null;
    } catch (error) {
      console.error('Erreur lors de l\'ajout du message:', error);
      return null;
    }
  },

  async deleteMessage(messageId: string): Promise<void> {
    try {
      const { error } = await supabase.rpc('delete_own_message', {
        p_message_id: messageId,
        p_guest_token: getStoredGuestToken(),
      });
      if (error) throw error;
    } catch (error) {
      console.error('Erreur lors de la suppression du message:', error);
    }
  },

  async updateMessage(messageId: string, updates: Partial<Message>, actorName?: string): Promise<void> {
    if (updates.reactions !== undefined && actorName) {
      await enforceRateLimit('reaction', actorName);
    }

    try {
      const { reactions, pinned, ...otherUpdates } = updates;

      if (reactions) {
        const { error } = await supabase.rpc('update_message_reaction', {
          message_id: messageId,
          new_reactions: reactions,
          p_guest_token: getStoredGuestToken(),
        });
        if (error) throw error;
      }

      if (pinned !== undefined) {
        const { error } = await supabase.rpc('set_message_pinned', {
          p_message_id: messageId,
          p_pinned: !!pinned,
          p_guest_token: getStoredGuestToken(),
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
      const { data, error } = await supabase
        .from('salons')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Erreur lors de la récupération des salons:', error);
      return [];
    }
  },

  async getSalonDisplayOrder(): Promise<Record<string, number>> {
    try {
      const { data, error } = await supabase
        .from('salon_display_order')
        .select('salon_id, sort_order');
      if (error) throw error;
      const map: Record<string, number> = {};
      for (const row of data || []) {
        map[row.salon_id] = row.sort_order;
      }
      return map;
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'ordre des salons:', error);
      return {};
    }
  },

  async setSalonDisplayOrder(orderedIds: string[]): Promise<void> {
    const rows = orderedIds.map((salon_id, index) => ({
      salon_id,
      sort_order: index * 10,
      updated_at: new Date().toISOString(),
    }));
    const { error } = await supabase
      .from('salon_display_order')
      .upsert(rows, { onConflict: 'salon_id' });
    if (error) {
      console.error('Erreur lors de la sauvegarde de l\'ordre des salons:', error);
      throw error;
    }
  },

  async addSalon(salon: Omit<Salon, 'created_at'>, creatorName?: string): Promise<Salon | null> {
    if (creatorName) {
      await enforceRateLimit('salon_create', creatorName);
    }

    const payload = {
      ...salon,
      created_by: salon.created_by ?? creatorName ?? null,
      sort_order: salon.sort_order ?? 1000 + Date.now() % 100000,
      description: salon.description ?? '',
    };

    const { data, error } = await supabase
      .from('salons')
      .insert(payload)
      .select()
      .maybeSingle();

    if (error) {
      console.error('Erreur lors de l\'ajout du salon:', error);
      throw error;
    }

    if (data?.id != null) {
      try {
        await supabase.from('salon_display_order').upsert({
          salon_id: data.id,
          sort_order: data.sort_order ?? 1000,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'salon_id' });
      } catch { /* ignore order sync */ }
    }

    return data;
  },

  async updateSalon(salonId: string, updates: Partial<Omit<Salon, 'id' | 'created_at'>>): Promise<Salon | null> {
    const { data, error } = await supabase
      .from('salons')
      .update(updates)
      .eq('id', salonId)
      .select()
      .maybeSingle();

    if (error) {
      console.error('Erreur lors de la mise à jour du salon:', error);
      throw error;
    }

    if (updates.sort_order !== undefined) {
      try {
        await supabase.from('salon_display_order').upsert({
          salon_id: salonId,
          sort_order: updates.sort_order,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'salon_id' });
      } catch { /* ignore */ }
    }

    return data;
  },

  async getSalonCategories(): Promise<SalonCategoryRow[]> {
    try {
      const { data, error } = await supabase
        .from('salon_categories')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data || []).map((row: SalonCategoryRow & { subcategories?: string[] | null }) => ({
        ...row,
        subcategories: Array.isArray(row.subcategories) ? row.subcategories : [],
      }));
    } catch (error) {
      console.error('Erreur lors de la récupération des catégories:', error);
      return [];
    }
  },

  async upsertSalonCategory(category: Omit<SalonCategoryRow, 'created_at' | 'updated_at'>): Promise<SalonCategoryRow | null> {
    const payload = {
      ...category,
      subcategories: category.subcategories || [],
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await supabase
      .from('salon_categories')
      .upsert(payload, { onConflict: 'id' })
      .select()
      .maybeSingle();
    if (error) {
      console.error('Erreur lors de la sauvegarde de la catégorie:', error);
      throw error;
    }
    return data;
  },

  async deleteSalonCategory(categoryId: string): Promise<void> {
    const { error } = await supabase.from('salon_categories').delete().eq('id', categoryId);
    if (error) {
      console.error('Erreur lors de la suppression de la catégorie:', error);
      throw error;
    }
  },

  async deleteSalon(salonId: string): Promise<void> {
    try {
      await supabase.from('salons').delete().eq('id', salonId);
      await supabase.from('salon_display_order').delete().eq('salon_id', salonId);
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
      const { error } = await supabase.from('xp_monthly').upsert(
        { user_name: userName, month, xp },
        { onConflict: 'user_name,month' },
      );
      if (error) throw error;
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
    // Never send is_premium from client — RPC + trigger enforce actor + premium mirror
    const { error } = await supabase.rpc('upsert_own_preferences', {
      p_user_name: userName,
      p_theme: updates.theme ?? null,
      p_party_mode: updates.party_mode ?? null,
      p_accent_color: updates.accent_color ?? null,
      p_compact_mode: updates.compact_mode ?? null,
      p_guest_token: getStoredGuestToken(),
    });

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

  /** Staff only — grant/revoke Premium (profiles.is_premium). */
  async adminSetPremium(userName: string, premium: boolean, premiumUntil?: string | null): Promise<boolean> {
    const { data, error } = await supabase.rpc('admin_set_premium', {
      p_user_name: userName,
      p_premium: premium,
      ...(premiumUntil !== undefined ? { p_premium_until: premiumUntil } : {}),
    });
    if (error) {
      console.error('Erreur admin_set_premium:', error);
      throw error;
    }
    return !!data;
  },

  /** Staff only — search profiles by pseudo for Premium Profils tab. */
  async adminSearchProfiles(query: string, limit = 20): Promise<Array<{
    id: string;
    name: string;
    avatar: string;
    initials: string;
    is_premium: boolean;
    premium_until: string | null;
    level: number;
    xp: number;
  }>> {
    const { data, error } = await supabase.rpc('admin_search_profiles', {
      p_query: query,
      p_limit: limit,
    });
    if (error) throw error;
    return (data || []) as Array<{
      id: string;
      name: string;
      avatar: string;
      initials: string;
      is_premium: boolean;
      premium_until: string | null;
      level: number;
      xp: number;
    }>;
  },

  async adminCreatePremiumCode(opts: {
    code: string;
    durationDays?: number | null;
    maxUses?: number;
    expiresAt?: string | null;
    note?: string | null;
  }): Promise<string> {
    const { data, error } = await supabase.rpc('admin_create_premium_code', {
      p_code: opts.code,
      p_duration_days: opts.durationDays ?? null,
      p_max_uses: opts.maxUses ?? 1,
      p_expires_at: opts.expiresAt ?? null,
      p_note: opts.note ?? null,
    });
    if (error) throw error;
    return data as string;
  },

  async adminListPremiumCodes(): Promise<Array<{
    id: string;
    code: string;
    duration_days: number | null;
    max_uses: number;
    use_count: number;
    active: boolean;
    expires_at: string | null;
    note: string | null;
    created_at: string;
  }>> {
    const { data, error } = await supabase.rpc('admin_list_premium_codes');
    if (error) throw error;
    return (data || []) as Array<{
      id: string;
      code: string;
      duration_days: number | null;
      max_uses: number;
      use_count: number;
      active: boolean;
      expires_at: string | null;
      note: string | null;
      created_at: string;
    }>;
  },

  async adminDeactivatePremiumCode(id: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('admin_deactivate_premium_code', { p_id: id });
    if (error) throw error;
    return !!data;
  },

  async adminListPremiumRedemptions(codeId?: string | null): Promise<Array<{
    id: string;
    code_id: string;
    code: string;
    user_id: string;
    user_name: string | null;
    redeemed_at: string;
  }>> {
    const { data, error } = await supabase.rpc('admin_list_premium_redemptions', {
      p_code_id: codeId ?? null,
    });
    if (error) throw error;
    return (data || []) as Array<{
      id: string;
      code_id: string;
      code: string;
      user_id: string;
      user_name: string | null;
      redeemed_at: string;
    }>;
  },

  async redeemPremiumCode(code: string): Promise<{ ok: boolean; premium_until: string | null; permanent: boolean }> {
    const { data, error } = await supabase.rpc('redeem_premium_code', { p_code: code });
    if (error) throw error;
    return data as { ok: boolean; premium_until: string | null; permanent: boolean };
  },

  async staffSetFeaturedSalon(salonId: string | null): Promise<boolean> {
    const { data, error } = await supabase.rpc('staff_set_featured_salon', {
      p_salon_id: salonId,
    });
    if (error) throw error;
    return !!data;
  },

  async sendMerciModo(targetName: string): Promise<{ ok: boolean; staff_notified?: number }> {
    const { data, error } = await supabase.rpc('send_merci_modo', {
      p_target_name: targetName,
    });
    if (error) throw error;
    return data as { ok: boolean; staff_notified?: number };
  },
};
