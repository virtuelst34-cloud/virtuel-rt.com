/**
 * Service d'alertes de modération (app / email / SMS via file + Edge Function).
 */
import { supabase } from './supabase';

export type ModerationAlertEventType =
  | 'new_report'
  | 'ban'
  | 'unban'
  | 'mute'
  | 'unmute'
  | 'content_flag'
  | 'appeal'
  | 'test'
  | 'merci_modo';

export type AlertChannel = 'app' | 'email' | 'sms';
export type AlertQueueStatus =
  | 'pending'
  | 'processing'
  | 'sent'
  | 'failed'
  | 'skipped'
  | 'provider_missing';

export interface ModerationAlertSettings {
  id?: string;
  enable_app_alerts: boolean;
  enable_email_alerts: boolean;
  enable_sms_alerts: boolean;
  auto_notify_on_report: boolean;
  auto_notify_on_ban: boolean;
  auto_notify_on_mute: boolean;
  auto_notify_on_content_flag: boolean;
  auto_notify_on_appeal: boolean;
  recipient_roles: string[];
  alert_cooldown_seconds: number;
}

export interface ModerationAlertQueueItem {
  id: string;
  event_type: ModerationAlertEventType;
  channel: AlertChannel;
  recipient_user_id: string | null;
  recipient_email: string | null;
  recipient_phone: string | null;
  recipient_name: string | null;
  subject: string | null;
  body: string;
  payload: Record<string, unknown>;
  status: AlertQueueStatus;
  error_message: string | null;
  attempts: number;
  created_at: string;
  processed_at: string | null;
}

export interface ModerationAlertLog {
  id: string;
  event_type: string;
  channels: string[];
  message: string;
  payload: Record<string, unknown>;
  recipients_count: number;
  created_by: string | null;
  created_at: string;
}

export interface StaffReport {
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
  status: 'pending' | 'in_progress' | 'resolved' | 'dismissed';
  handled_by?: string | null;
  handled_at?: string | null;
  staff_notes?: string | null;
}

export const DEFAULT_ALERT_SETTINGS: ModerationAlertSettings = {
  enable_app_alerts: true,
  enable_email_alerts: true,
  enable_sms_alerts: false,
  auto_notify_on_report: true,
  auto_notify_on_ban: true,
  auto_notify_on_mute: false,
  auto_notify_on_content_flag: true,
  auto_notify_on_appeal: true,
  recipient_roles: ['founder', 'direction', 'master_op', 'moderator'],
  alert_cooldown_seconds: 30,
};

export const moderationAlertService = {
  async getSettings(): Promise<ModerationAlertSettings> {
    try {
      const { data, error } = await supabase
        .from('moderation_alert_settings')
        .select('*')
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!data) return { ...DEFAULT_ALERT_SETTINGS };
      return { ...DEFAULT_ALERT_SETTINGS, ...data };
    } catch (error) {
      console.error('Erreur chargement paramètres alertes:', error);
      return { ...DEFAULT_ALERT_SETTINGS };
    }
  },

  async saveSettings(settings: ModerationAlertSettings): Promise<boolean> {
    try {
      const { id, ...payload } = settings;
      const row = { ...payload, updated_at: new Date().toISOString() };
      if (id) {
        const { error } = await supabase
          .from('moderation_alert_settings')
          .update(row)
          .eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('moderation_alert_settings').insert(row);
        if (error) throw error;
      }
      return true;
    } catch (error) {
      console.error('Erreur sauvegarde paramètres alertes:', error);
      return false;
    }
  },

  async dispatch(
    eventType: ModerationAlertEventType,
    message: string,
    payload: Record<string, unknown> = {},
    createdBy?: string,
  ): Promise<number> {
    try {
      const { data, error } = await supabase.rpc('dispatch_moderation_alert', {
        p_event_type: eventType,
        p_message: message,
        p_payload: payload,
        p_created_by: createdBy ?? null,
      });
      if (error) throw error;
      // Traiter la file email/SMS (best-effort)
      void this.processQueue();
      return typeof data === 'number' ? data : 0;
    } catch (error) {
      console.error('Erreur dispatch alerte modération:', error);
      return 0;
    }
  },

  async processQueue(): Promise<{ processed: number; providerStatus: Record<string, string> }> {
    try {
      const { data, error } = await supabase.functions.invoke('moderation-alerts', {
        body: { action: 'process_queue' },
      });
      if (error) {
        console.warn('Edge Function moderation-alerts indisponible:', error.message);
        return { processed: 0, providerStatus: { edge: 'unavailable' } };
      }
      return {
        processed: data?.processed ?? 0,
        providerStatus: data?.providerStatus ?? {},
      };
    } catch (error) {
      console.warn('Impossible d\'invoquer moderation-alerts:', error);
      return { processed: 0, providerStatus: { edge: 'error' } };
    }
  },

  async fetchQueue(limit = 50): Promise<ModerationAlertQueueItem[]> {
    try {
      const { data, error } = await supabase
        .from('moderation_alert_queue')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data || []) as ModerationAlertQueueItem[];
    } catch (error) {
      console.error('Erreur lecture file alertes:', error);
      return [];
    }
  },

  async fetchLog(limit = 50): Promise<ModerationAlertLog[]> {
    try {
      const { data, error } = await supabase
        .from('moderation_alert_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data || []) as ModerationAlertLog[];
    } catch (error) {
      console.error('Erreur lecture journal alertes:', error);
      return [];
    }
  },

  async fetchReports(status?: StaffReport['status']): Promise<StaffReport[]> {
    try {
      let query = supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (status) query = query.eq('status', status);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as StaffReport[];
    } catch (error) {
      console.error('Erreur lecture signalements:', error);
      return [];
    }
  },

  async updateReport(
    id: string,
    updates: Partial<Pick<StaffReport, 'status' | 'handled_by' | 'handled_at' | 'staff_notes'>>,
  ): Promise<boolean> {
    try {
      const { error } = await supabase.from('reports').update(updates).eq('id', id);
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Erreur mise à jour signalement:', error);
      return false;
    }
  },

  async getProviderStatus(): Promise<Record<string, string>> {
    try {
      const { data, error } = await supabase.functions.invoke('moderation-alerts', {
        body: { action: 'provider_status' },
      });
      if (error) {
        return {
          email: 'edge_unavailable',
          sms: 'edge_unavailable',
          note: error.message || 'Fonction Edge indisponible',
        };
      }
      return data?.providerStatus ?? { email: 'unknown', sms: 'unknown' };
    } catch {
      return { email: 'edge_unavailable', sms: 'edge_unavailable' };
    }
  },
};
