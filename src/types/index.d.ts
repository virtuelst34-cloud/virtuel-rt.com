/**
 * Types et interfaces pour l'application chat
 * Migration vers TypeScript recommandée (see ../jsconfig.json)
 */

// ── User & Profiles ────────────────────────────
export interface UserProfile {
  name: string;
  avatar: string;
  initials: string;
  bio?: string;
  xp: number;
  level: number;
  monthlyXP?: number;
  isBanned?: boolean;
  isMuted?: boolean;
  banReason?: string;
  isPremium?: boolean;
  status?: 'online' | 'away' | 'busy' | 'offline';
  joinedAt?: string;
}

export interface User extends UserProfile {
  isPremium?: boolean;
}

// ── Messages ──────────────────────────────────
export interface ChatMessage {
  id: string;
  author_name: string;
  author_avatar: string;
  author_initials: string;
  text: string;
  created_date: string;
  reactions?: Record<string, string[]>;
  pinned?: boolean;
  is_system?: boolean;
  is_announcement?: boolean;
  image_url?: string;
}

export interface SalonMessages {
  [salonId: string]: ChatMessage[];
}

// ── Notifications ─────────────────────────────
export interface Notification {
  id: string;
  type: 'message' | 'dm' | 'levelup' | 'premium' | 'system' | 'mod' | 'report' | 'block';
  message: string;
  timestamp?: string;
  read?: boolean;
}

// ── Preferences ───────────────────────────────
export type ThemeType = 'dark' | 'light';

export interface Preferences {
  theme: ThemeType;
  partyMode: boolean;
  isPremium: boolean;
}

// ── Context Types ─────────────────────────────
export interface ChatContextValue {
  // User
  user: User | null;
  login: (name: string, avatar: string, initials: string) => void;
  updateProfile: (updates: Partial<User>) => void;
  setStatus: (status: string) => void;
  profiles: Record<string, UserProfile>;
  setProfiles: (profiles: Record<string, UserProfile>) => void;

  // Messages
  salonMessages: SalonMessages;
  addMessage: (salonId: string, message: ChatMessage) => void;
  getMessages: (salonId: string) => ChatMessage[];
  deleteMessage: (salonId: string, messageId: string) => void;
  pinMessage: (salonId: string, messageId: string) => void;
  monthlyXP: Record<string, number>;

  // Notifications
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  markAllRead: () => void;
  clearNotifications: () => void;
  unreadCount: number;

  // Moderation
  blockedUsers: string[];
  blockUser: (name: string) => void;
  unblockUser: (name: string) => void;
  isBlocked: (name: string) => boolean;
  banUser: (name: string, reason?: string) => void;
  unbanUser: (name: string) => void;
  muteUser: (name: string) => void;
  unmuteUser: (name: string) => void;
  isUserBanned: (name: string) => boolean;
  isUserMuted: (name: string) => boolean;

  // Preferences
  theme: ThemeType;
  toggleTheme: () => void;
  partyMode: boolean;
  togglePartyMode: () => void;
  isPremium: boolean;
  activatePremium: () => void;
}
