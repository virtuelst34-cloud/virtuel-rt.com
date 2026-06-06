import React, { createContext, useContext, useState, useCallback } from 'react';

const UIContext = createContext(null);

export function UIProvider({ children }) {
  const [showAdmin, setShowAdmin] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  // Ouverture sécurisée : nécessite que l'utilisateur soit admin
  const openAdmin = useCallback((user) => {
    if (user?.isAdmin) setShowAdmin(true);
  }, []);

  const value = {
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

export function useUI() {
  const context = useContext(UIContext);
  if (!context) throw new Error('useUI must be used inside UIProvider');
  return context;
}
