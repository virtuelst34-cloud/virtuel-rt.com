import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';

const UserContext = createContext(null);

const PROFILES_KEY = 'virtuel_rt_profiles';

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profiles, setProfiles] = useState({});
  const timerRef = useRef(null);

  // Charger les profils depuis localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(PROFILES_KEY);
      if (saved) {
        // Nettoyer les statuts fantômes : remettre tout le monde offline au chargement
        const parsed = JSON.parse(saved);
        const cleaned = Object.fromEntries(
          Object.entries(parsed).map(([k, v]) => [k, { ...v, status: 'offline' }])
        );
        setProfiles(cleaned);
      }
    } catch {}
  }, []);

  // Persister les profils avec debouncing
  useEffect(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
      } catch {}
    }, 300);
    return () => clearTimeout(timerRef.current);
  }, [profiles]);

  // Marquer offline à la fermeture de l'onglet
  useEffect(() => {
    const handleUnload = () => {
      setProfiles(prev => {
        if (!user) return prev;
        const updated = { ...prev, [user.name]: { ...prev[user.name], status: 'offline' } };
        try { localStorage.setItem(PROFILES_KEY, JSON.stringify(updated)); } catch {}
        return updated;
      });
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [user]);

  const login = useCallback((name, avatar, initials) => {
    const existingProfile = profiles[name];
    const profile = existingProfile || {
      name, avatar, initials, bio: '',
      xp: 0, level: 1, monthlyXP: 0,
      isBanned: false, isMuted: false, banReason: '',
      isPremium: false, isAdmin: false, status: 'online',
      joinedAt: new Date().toISOString(),
    };
    const updated = { ...profile, avatar, initials, status: 'online' };
    setProfiles(prev => ({ ...prev, [name]: updated }));
    setUser(updated);
  }, [profiles]);

  const logout = useCallback(() => {
    setUser(prev => {
      if (!prev) return null;
      setProfiles(p => ({ ...p, [prev.name]: { ...p[prev.name], status: 'offline' } }));
      return null;
    });
  }, []);

  const updateProfile = useCallback((updates) => {
    setUser(prev => {
      if (!prev) return prev;
      const updated = { ...prev, ...updates };
      setProfiles(p => ({ ...p, [prev.name]: updated }));
      return updated;
    });
  }, []);

  const setStatus = useCallback((status) => {
    updateProfile({ status });
  }, [updateProfile]);

  const setUserStatusAdmin = useCallback((name, status) => {
    setProfiles(prev => {
      const p = prev[name];
      if (!p) return prev;
      return { ...prev, [name]: { ...p, status } };
    });
  }, []);

  const value = {
    user, login, logout, updateProfile, setStatus, setUserStatusAdmin, profiles, setProfiles
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) throw new Error('useUser must be used inside UserProvider');
  return context;
}
