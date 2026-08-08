import { supabase } from './supabase';

export interface UserModerationRecord {
  user_name: string;
  is_banned: boolean;
  is_muted: boolean;
  ban_reason: string;
  moderated_by?: string | null;
  updated_at?: string;
}

const MODERATION_COLUMNS =
  'user_name, is_banned, is_muted, ban_reason, moderated_by, updated_at';

export async function fetchAllModeration(): Promise<UserModerationRecord[]> {
  const { data, error } = await supabase.from('user_moderation').select(MODERATION_COLUMNS);
  if (error) {
    console.error('Erreur chargement modération:', error);
    return [];
  }
  return data || [];
}

export async function fetchUserModeration(userName: string): Promise<UserModerationRecord | null> {
  const { data, error } = await supabase
    .from('user_moderation')
    .select(MODERATION_COLUMNS)
    .eq('user_name', userName)
    .maybeSingle();
  if (error) {
    console.error('Erreur modération utilisateur:', error);
    return null;
  }
  return data;
}

export async function upsertUserModeration(
  userName: string,
  updates: Partial<Pick<UserModerationRecord, 'is_banned' | 'is_muted' | 'ban_reason' | 'moderated_by'>>,
): Promise<UserModerationRecord | null> {
  const { data, error } = await supabase
    .from('user_moderation')
    .upsert({
      user_name: userName,
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .select(MODERATION_COLUMNS)
    .maybeSingle();

  if (error) {
    console.error('Erreur upsert modération:', error);
    return null;
  }
  return data;
}
