import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { hasAdminAccess, hasStaffAccess } from '../utils/founderCheck';
import type { UserProfile } from './UserContext';

interface UIContextType {
  showAdmin: boolean;
  setShowAdmin: React.Dispatch<React.SetStateAction<boolean>>;
  showProfile: boolean;
  setShowProfile: React.Dispatch<React.SetStateAction<boolean>>;
  openAdmin: (user: UserProfile | null) => void;
}

const UIContext = createContext<UIContextType | null>(null);

export function UIProvider({ children }: { children: ReactNode }) {
  const [showAdmin, setShowAdmin] = useState<boolean>(false);
  const [showProfile, setShowProfile] = useState<boolean>(false);

  // Ouverture sécurisée : staff (mod+) ou admin
  const openAdmin = useCallback((user: UserProfile | null) => {
    if (hasStaffAccess(user) || hasAdminAccess(user)) setShowAdmin(true);
  }, []);

  const value: UIContextType = {
    showAdmin, setShowAdmin,
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
