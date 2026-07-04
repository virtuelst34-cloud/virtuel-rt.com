import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL or Anon Key is missing. Please configure them in .env.local');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: localStorage,
  },
});

// Types pour la base de données
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          name: string;
          avatar: string;
          initials: string;
          status: 'online' | 'offline' | 'away' | 'busy';
          level: number;
          xp: number;
          is_premium: boolean;
          email?: string;
          email_confirmed_at?: string;
          is_founder: boolean;
          is_direction: boolean;
          is_master_op: boolean;
          is_iridescent?: boolean;
          created_at: string;
          updated_at: string;
          bio?: string;
          status_text?: string;
          age?: number;
          city?: string;
          gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
        };
        Insert: {
          id?: string;
          name: string;
          avatar: string;
          initials: string;
          status?: 'online' | 'offline' | 'away' | 'busy';
          level?: number;
          xp?: number;
          is_premium?: boolean;
          email?: string;
          email_confirmed_at?: string;
          is_founder?: boolean;
          is_direction?: boolean;
          is_master_op?: boolean;
          is_iridescent?: boolean;
          created_at?: string;
          updated_at?: string;
          bio?: string;
          status_text?: string;
          age?: number;
          city?: string;
          gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
        };
        Update: {
          id?: string;
          name?: string;
          avatar?: string;
          initials?: string;
          status?: 'online' | 'offline' | 'away' | 'busy';
          level?: number;
          xp?: number;
          is_premium?: boolean;
          email?: string;
          email_confirmed_at?: string;
          is_founder?: boolean;
          is_direction?: boolean;
          is_master_op?: boolean;
          is_iridescent?: boolean;
          updated_at?: string;
          bio?: string;
          status_text?: string;
          age?: number;
          city?: string;
          gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
        };
      };
      messages: {
        Row: {
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
        };
        Insert: {
          id?: string;
          salon_id: string;
          author_name: string;
          author_avatar: string;
          author_initials: string;
          text: string;
          created_date?: string;
          reactions?: Record<string, string[]>;
          pinned?: boolean;
          is_system?: boolean;
          is_announcement?: boolean;
          reply_to?: string;
          image_url?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          salon_id?: string;
          author_name?: string;
          author_avatar?: string;
          author_initials?: string;
          text?: string;
          reactions?: Record<string, string[]>;
          pinned?: boolean;
          is_system?: boolean;
          is_announcement?: boolean;
          reply_to?: string;
          image_url?: string;
        };
      };
      salons: {
        Row: {
          id: string;
          name: string;
          type: string;
          icon: string;
          count?: number;
          live?: boolean;
          welcome: string;
          password?: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          type: string;
          icon: string;
          count?: number;
          live?: boolean;
          welcome: string;
          password?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          type?: string;
          icon?: string;
          count?: number;
          live?: boolean;
          welcome?: string;
          password?: string;
        };
      };
      xp_monthly: {
        Row: {
          id: string;
          user_name: string;
          xp: number;
          month: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_name: string;
          xp: number;
          month: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_name?: string;
          xp?: number;
          month?: string;
        };
      };
      preferences: {
        Row: {
          id: string;
          user_name: string;
          theme: 'dark' | 'light';
          party_mode: boolean;
          is_premium: boolean;
          accent_color: string;
          compact_mode: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_name: string;
          theme?: 'dark' | 'light';
          party_mode?: boolean;
          is_premium?: boolean;
          accent_color?: string;
          compact_mode?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_name?: string;
          theme?: 'dark' | 'light';
          party_mode?: boolean;
          is_premium?: boolean;
          accent_color?: string;
          compact_mode?: boolean;
          updated_at?: string;
        };
      };
      custom_badges: {
        Row: {
          id: string;
          name: string;
          icon: string;
          min_level: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          icon: string;
          min_level: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          icon?: string;
          min_level?: number;
        };
      };
      reports: {
        Row: {
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
        };
        Insert: {
          id?: string;
          target_id: string;
          target_type: 'message' | 'user';
          target_name?: string;
          target_content?: string;
          reason: string;
          description?: string;
          reporter: string;
          timestamp?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          target_id?: string;
          target_type?: 'message' | 'user';
          target_name?: string;
          target_content?: string;
          reason?: string;
          description?: string;
          reporter?: string;
          timestamp?: string;
        };
      };
      permissions: {
        Row: {
          id: string;
          section: string;
          action: string;
          user_identifier: string;
          identifier_type: 'user_type' | 'badge';
          allowed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          section: string;
          action: string;
          user_identifier: string;
          identifier_type?: 'user_type' | 'badge';
          allowed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          section?: string;
          action?: string;
          user_identifier?: string;
          identifier_type?: 'user_type' | 'badge';
          allowed?: boolean;
          updated_at?: string;
        };
      };
      salon_settings: {
        Row: {
          id: string;
          salon_id: string;
          welcome_message?: string;
          welcome_enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          salon_id: string;
          welcome_message?: string;
          welcome_enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          salon_id?: string;
          welcome_message?: string;
          welcome_enabled?: boolean;
          updated_at?: string;
        };
      };
    };
  };
}
