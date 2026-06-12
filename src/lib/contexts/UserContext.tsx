import React, { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';

interface UserProfile {
  name: string;
  avatar: string;
  initials: string;
  bio: string;
  xp: number;
  level: number;
  monthlyXP: number;
  isBanned: boolean;
  isMuted: boolean;
  banReason: string;
  isPremium: boolean;
  isAdmin: boolean;
  status: 'online' | 'away' | 'busy' | 'offline';
  joinedAt: string;
  statusText?: string;
}

interface UserContextType {
  user: UserProfile | null;
  login: (name: string, avatar: string, initials: string) => void;
  logout: () => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
  setStatus: (status: UserProfile['status']) => void;
  setUserStatusAdmin: (name: string, status: UserProfile['status']) => void;
  profiles: Record<string, UserProfile>;
  setProfiles: React.Dispatch<React.SetStateAction<Record<string, UserProfile>>>;
}

const UserContext = createContext<UserContextType | null>(null);

const PROFILES_KEY = 'virtuel_st_profiles';

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [profiles, setProfiles] = useState<Record<string, UserProfile>>({});
  const timerRef = useRef<number | null>(null);

  // Charger les profils depuis localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(PROFILES_KEY);
      if (saved) {
        // Nettoyer les statuts fantômes : remettre tout le monde offline au chargement
        const parsed = JSON.parse(saved) as Record<string, UserProfile>;
        const cleaned = Object.fromEntries(
          Object.entries(parsed).map(([k, v]) => [k, { ...v, status: 'offline' as const }])
        );
        setProfiles(cleaned);
      }
    } catch {}
  }, []);

  // Persister les profils avec debouncing
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
      } catch {}
    }, 300);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [profiles]);

  // Marquer offline à la fermeture de l'onglet
  useEffect(() => {
    const handleUnload = () => {
      if (!user) return;
      setProfiles(prev => {
        const updated = { ...prev, [user.name]: { ...prev[user.name], status: 'offline' as const } };
        try { localStorage.setItem(PROFILES_KEY, JSON.stringify(updated)); } catch {}
        return updated;
      });
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [user]);

  const login = useCallback((name: string, avatar: string, initials: string) => {
    const existingProfile = profiles[name];
    const profile: UserProfile = existingProfile || {
      name, avatar, initials, bio: '',
      xp: 0, level: 1, monthlyXP: 0,
      isBanned: false, isMuted: false, banReason: '',
      isPremium: false, isAdmin: true, status: 'online',
      joinedAt: new Date().toISOString(),
    };
    const updated = { ...profile, avatar, initials, status: 'online' as const };
    setProfiles(prev => ({ ...prev, [name]: updated }));
    setUser(updated);
  }, [profiles]);

  const logout = useCallback(() => {
    setUser(prev => {
      if (!prev) return null;
      setProfiles(p => ({ ...p, [prev.name]: { ...p[prev.name], status: 'offline' as const } }));
      return null;
    });
  }, []);

  const updateProfile = useCallback((updates: Partial<UserProfile>) => {
    setUser(prev => {
      if (!prev) return prev;
      const updated = { ...prev, ...updates };
      setProfiles(p => ({ ...p, [prev.name]: updated }));
      return updated;
    });
  }, []);

  const setStatus = useCallback((status: UserProfile['status']) => {
    updateProfile({ status });
  }, [updateProfile]);

  const setUserStatusAdmin = useCallback((name: string, status: UserProfile['status']) => {
    setProfiles(prev => {
      const p = prev[name];
      if (!p) return prev;
      return { ...prev, [name]: { ...p, status } };
    });
  }, []);

  const value: UserContextType = {
    user, login, logout, updateProfile, setStatus, setUserStatusAdmin, profiles, setProfiles
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser(): UserContextType {
  const context = useContext(UserContext);
  if (!context) throw new Error('useUser must be used inside UserProvider');
  return context;
}
