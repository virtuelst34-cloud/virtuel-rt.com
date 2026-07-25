import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { hasAdminAccess, hasStaffAccess } from '../utils/founderCheck';
import type { UserProfile } from './UserContext';

interface UIContextType {
  showAdmin: boolean;
  setShowAdmin: React.Dispatch<React.SetStateAction<boolean>>;
  adminInitialTab: string | null;
  setAdminInitialTab: React.Dispatch<React.SetStateAction<string | null>>;
  showProfile: boolean;
  setShowProfile: React.Dispatch<React.SetStateAction<boolean>>;
  openAdmin: (user: UserProfile | null, initialTab?: string) => void;
}

const UIContext = createContext<UIContextType | null>(null);

export function UIProvider({ children }: { children: ReactNode }) {
  const [showAdmin, setShowAdmin] = useState<boolean>(false);
  const [adminInitialTab, setAdminInitialTab] = useState<string | null>(null);
  const [showProfile, setShowProfile] = useState<boolean>(false);

  // Ouverture sécurisée : staff (mod+) ou admin
  const openAdmin = useCallback((user: UserProfile | null, initialTab?: string) => {
    if (hasStaffAccess(user) || hasAdminAccess(user)) {
      setAdminInitialTab(initialTab || null);
      setShowAdmin(true);
    }
  }, []);

  const value: UIContextType = {
    showAdmin, setShowAdmin,
    adminInitialTab, setAdminInitialTab,
    showProfile, setShowProfile,
    openAdmin,
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
