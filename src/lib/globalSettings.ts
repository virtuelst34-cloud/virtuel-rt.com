import { supabase } from '@/lib/supabase';

export interface GlobalSettings {
  id?: string;
  default_theme: string;
  default_party_mode: boolean;
  default_accent_color: string;
  default_compact_mode: boolean;
  maintenance_mode: boolean;
  maintenance_message: string;
  allow_guest_access: boolean;
  allow_registration: boolean;
  max_users: number;
  enable_notifications: boolean;
  enable_presence: boolean;
  enable_dm: boolean;
  enable_voice: boolean;
  auto_cleanup_days: number;
}

export const DEFAULT_GLOBAL_SETTINGS: GlobalSettings = {
  default_theme: 'dark',
  default_party_mode: false,
  default_accent_color: 'purple',
  default_compact_mode: false,
  maintenance_mode: false,
  maintenance_message: 'Le site est en maintenance. Revenez plus tard.',
  allow_guest_access: true,
  allow_registration: true,
  max_users: 1000,
  enable_notifications: true,
  enable_presence: true,
  enable_dm: true,
  enable_voice: false,
  auto_cleanup_days: 30,
};

export async function fetchGlobalSettings(): Promise<GlobalSettings> {
  try {
    const { data, error } = await supabase
      .from('global_settings')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (error || !data) return DEFAULT_GLOBAL_SETTINGS;
    return { ...DEFAULT_GLOBAL_SETTINGS, ...(data as GlobalSettings) };
  } catch {
    return DEFAULT_GLOBAL_SETTINGS;
  }
}
