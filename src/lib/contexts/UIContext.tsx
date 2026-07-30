import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { hasAdminAccess, hasStaffAccess } from '../utils/founderCheck';
import type { UserProfile } from './UserContext';

export type StaffChatTab = 'notifications' | 'chat' | 'tools';

export interface StaffChatIntent {
  tab?: StaffChatTab;
  messageId?: string | null;
  targetUser?: string | null;
}

interface UIContextType {
  showAdmin: boolean;
  setShowAdmin: React.Dispatch<React.SetStateAction<boolean>>;
  adminInitialTab: string | null;
  setAdminInitialTab: React.Dispatch<React.SetStateAction<string | null>>;
  showProfile: boolean;
  setShowProfile: React.Dispatch<React.SetStateAction<boolean>>;
  openAdmin: (user: UserProfile | null, initialTab?: string) => void;
  showStaffChat: boolean;
  setShowStaffChat: React.Dispatch<React.SetStateAction<boolean>>;
  staffChatIntent: StaffChatIntent | null;
  openStaffChat: (user: UserProfile | null, intent?: StaffChatIntent) => void;
  clearStaffChatIntent: () => void;
}

const UIContext = createContext<UIContextType | null>(null);

export function UIProvider({ children }: { children: ReactNode }) {
  const [showAdmin, setShowAdmin] = useState<boolean>(false);
  const [adminInitialTab, setAdminInitialTab] = useState<string | null>(null);
  const [showProfile, setShowProfile] = useState<boolean>(false);
  const [showStaffChat, setShowStaffChat] = useState(false);
  const [staffChatIntent, setStaffChatIntent] = useState<StaffChatIntent | null>(null);

  const openAdmin = useCallback((user: UserProfile | null, initialTab?: string) => {
    if (hasStaffAccess(user) || hasAdminAccess(user)) {
      setAdminInitialTab(initialTab || null);
      setShowAdmin(true);
    }
  }, []);

  const openStaffChat = useCallback((user: UserProfile | null, intent?: StaffChatIntent) => {
    if (!hasStaffAccess(user)) return;
    setStaffChatIntent(intent || { tab: 'chat' });
    setShowStaffChat(true);
  }, []);

  const clearStaffChatIntent = useCallback(() => {
    setStaffChatIntent(null);
  }, []);

  const value: UIContextType = {
    showAdmin, setShowAdmin,
    adminInitialTab, setAdminInitialTab,
    showProfile, setShowProfile,
    openAdmin,
    showStaffChat, setShowStaffChat,
    staffChatIntent,
    openStaffChat,
    clearStaffChatIntent,
  };

  return (
    <UIContext.Provider value={value}>
      {children}
    </UIContext.Provider>
  );
}

export function useUI(): UIContextType {
  const context = useContext(UIContext);
  if (!context) throw new Error('useUI must be used inside UIProvider');
  return context;
}
