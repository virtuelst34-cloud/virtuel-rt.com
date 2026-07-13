import React, { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import { supabase } from '../supabase';
import { supabaseAuthService, UserProfile as SupabaseUserProfile } from '../supabaseAuth';
import { presenceService } from '../presenceService';
import { useNotifications } from './NotificationsContext';
import { recordLogin } from '../userActivity';
import { mapSupabaseProfile } from '../utils/profileBadges';
import {
  registerGuestSession,
  validateGuestSession,
  getStoredGuestToken,
  clearGuestToken,
} from '../guestAuthService';
import { saveGuestProfileCache, loadGuestProfileCache } from '../utils/prefsStorage';

export interface UserProfile {
  id?: string;
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
  status: 'online' | 'away' | 'busy' | 'offline' | 'invisible';
  joinedAt: string;
  statusText?: string;
  email?: string;
  emailVerified?: boolean;
  isFounder?: boolean;
  isDirection?: boolean;
  isMasterOp?: boolean;
  isIridescent?: boolean;
  specialBadges?: string[];
  age?: number;
  city?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
}

interface UserContextType {
  user: UserProfile | null;
  supabaseUser: SupabaseUserProfile | null;
  login: (name: string, avatar: string, initials: string) => Promise<{ success: boolean; error?: string }>;
  loginWithSupabase: (supabaseUser: SupabaseUserProfile) => void;
  logout: () => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
  setStatus: (status: UserProfile['status']) => void;
  setUserStatusAdmin: (name: string, status: UserProfile['status']) => void;
  profiles: Record<string, UserProfile>;
  setProfiles: React.Dispatch<React.SetStateAction<Record<string, UserProfile>>>;
}

const UserContext = createContext<UserContextType | null>(null);

const GUEST_SESSION_KEY = 'virtuel_rt_guest_session';
const GUEST_SESSION_DURATION = 30 * 60 * 1000;

function mergeGuestProfile(base: UserProfile, cached: Record<string, unknown> | null): UserProfile {
  if (!cached || cached.name !== base.name) return base;
  return {
    ...base,
    bio: typeof cached.bio === 'string' ? cached.bio : base.bio,
    avatar: typeof cached.avatar === 'string' ? cached.avatar : base.avatar,
    initials: typeof cached.initials === 'string' ? cached.initials : base.initials,
    statusText: typeof cached.statusText === 'string' ? cached.statusText : base.statusText,
    age: typeof cached.age === 'number' ? cached.age : base.age,
    city: typeof cached.city === 'string' ? cached.city : base.city,
    gender: (cached.gender as UserProfile['gender']) || base.gender,
    status: (cached.status as UserProfile['status']) || base.status,
  };
}

function buildGuestProfile(name: string, avatar: string, initials: string): UserProfile {
  const base: UserProfile = {
    name,
    avatar,
    initials,
    bio: '',
    xp: 0,
    level: 1,
    monthlyXP: 0,
    isBanned: false,
    isMuted: false,
    banReason: '',
    isPremium: false,
    isAdmin: false,
    status: 'online',
    joinedAt: new Date().toISOString(),
    statusText: '',
  };
  return mergeGuestProfile(base, loadGuestProfileCache());
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUserProfile | null>(null);
  const [profiles, setProfiles] = useState<Record<string, UserProfile>>({});
  const isMountedRef = useRef(true);
  const { addNotification } = useNotifications();

  const trackLogin = useCallback((userId: string) => {
    recordLogin(userId, (achievement) => {
      addNotification({
        type: 'achievement',
        message: `${achievement.icon} Succès débloqué : ${achievement.name}`,
      });
    });
  }, [addNotification]);

  const saveGuestSession = useCallback((guestUser: UserProfile) => {
    try {
      localStorage.setItem(GUEST_SESSION_KEY, JSON.stringify({ user: guestUser, timestamp: Date.now() }));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de la session invité:', error);
    }
  }, []);

  const restoreGuestUser = useCallback((guestUser: UserProfile) => {
    if (!isMountedRef.current) return;
    setUser(guestUser);
    setProfiles(prev => ({ ...prev, [guestUser.name]: guestUser }));
    trackLogin(guestUser.name);
    void presenceService.initialize(guestUser.name).then(() => {
      presenceService.setOnline(guestUser.name, undefined, {
        name: guestUser.name,
        avatar: guestUser.avatar,
        initials: guestUser.initials,
        status: guestUser.status || 'online',
      });
    });
  }, [trackLogin]);

  const loadGuestSession = useCallback(async (): Promise<boolean> => {
    const token = getStoredGuestToken();
    if (token) {
      const validated = await validateGuestSession(token);
      if (validated.success && validated.guestName) {
        const guestUser = buildGuestProfile(
          validated.guestName,
          validated.avatar || 'av1',
          validated.initials || validated.guestName.slice(0, 2).toUpperCase(),
        );
        saveGuestSession(guestUser);
        restoreGuestUser(guestUser);
        return true;
      }
      clearGuestToken();
    }

    try {
      const guestSessionData = localStorage.getItem(GUEST_SESSION_KEY);
      if (guestSessionData && isMountedRef.current) {
        const session = JSON.parse(guestSessionData);
        if (Date.now() - session.timestamp < GUEST_SESSION_DURATION) {
          restoreGuestUser(session.user);
          return true;
        }
        localStorage.removeItem(GUEST_SESSION_KEY);
      }
    } catch (error) {
      console.error('Erreur lors du chargement de la session invité:', error);
    }
    return false;
  }, [restoreGuestUser, saveGuestSession]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const loadSession = async () => {
      try {
        const currentUser = await supabaseAuthService.getCurrentUser();
        if (currentUser) {
          setSupabaseUser(currentUser);
          const mappedUser = mapSupabaseProfile({
            ...currentUser,
            status: currentUser.status === 'offline' ? 'online' : currentUser.status,
          });
          setUser(mappedUser);
          setProfiles(prev => ({ ...prev, [mappedUser.name]: mappedUser }));
          trackLogin(currentUser.id);
          void presenceService.initialize(currentUser.name).then(() => {
            presenceService.setOnline(currentUser.name, undefined, {
              name: currentUser.name,
              avatar: currentUser.avatar,
              initials: currentUser.initials,
              status: currentUser.status || 'online',
            });
          });
        } else {
          await loadGuestSession();
        }
      } catch (error) {
        console.error('Erreur lors du chargement de la session:', error);
        await loadGuestSession();
      }
    };

    void loadSession();

    const { data: { subscription } } = supabaseAuthService.onAuthStateChange((profile) => {
      if (profile) {
        setSupabaseUser(profile);
        const mappedUser = mapSupabaseProfile({
          ...profile,
          status: profile.status === 'offline' ? 'online' : profile.status,
        });
        setUser(mappedUser);
        setProfiles(prev => ({ ...prev, [mappedUser.name]: mappedUser }));
      } else {
        setSupabaseUser(null);
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [loadGuestSession, trackLogin]);

  useEffect(() => {
    const channel = supabase
      .channel('profiles_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        async (payload) => {
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            const updatedProfile = payload.new as SupabaseUserProfile;
            const mappedProfile = mapSupabaseProfile(updatedProfile);
            setProfiles(prev => ({ ...prev, [mappedProfile.name]: mappedProfile }));
            if (user && user.name === mappedProfile.name) {
              setUser(mappedProfile);
            }
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const login = useCallback(async (name: string, avatar: string, initials: string) => {
    const trimmed = name.trim();
    const result = await registerGuestSession(trimmed, avatar, initials);
    if (!result.success) {
      return { success: false, error: result.error || 'Impossible de créer la session invité' };
    }

    const guestName = result.guestName || trimmed;
    const profile = buildGuestProfile(
      guestName,
      result.avatar || avatar,
      result.initials || initials,
    );

    setProfiles(prev => ({ ...prev, [guestName]: profile }));
    setUser(profile);
    saveGuestSession(profile);
    trackLogin(guestName);

    void presenceService.initialize(guestName).then(() => {
      presenceService.setOnline(guestName, undefined, {
        name: guestName,
        avatar: profile.avatar,
        initials: profile.initials,
        status: profile.status,
      });
    });

    return { success: true };
  }, [saveGuestSession, trackLogin]);

  const loginWithSupabase = useCallback((sbUser: SupabaseUserProfile) => {
    clearGuestToken();
    setSupabaseUser(sbUser);
    const mappedUser = mapSupabaseProfile(sbUser);
    setUser(mappedUser);
    setProfiles(prev => ({ ...prev, [mappedUser.name]: mappedUser }));
    void presenceService.initialize(sbUser.id).then(() => {
      presenceService.setOnline(sbUser.id, undefined, {
        name: sbUser.name,
        avatar: sbUser.avatar,
        initials: sbUser.initials,
        status: sbUser.status || 'online',
      });
    });
  }, []);

  useEffect(() => {
    const userId = supabaseUser?.id || user?.name;
    if (!userId) return;

    const markOffline = () => {
      void presenceService.setOffline(userId);
    };

    const heartbeat = window.setInterval(() => {
      void presenceService.touch(userId, user?.status || 'online');
    }, 30000);

    window.addEventListener('pagehide', markOffline);
    window.addEventListener('beforeunload', markOffline);

    return () => {
      window.clearInterval(heartbeat);
      window.removeEventListener('pagehide', markOffline);
      window.removeEventListener('beforeunload', markOffline);
    };
  }, [supabaseUser?.id, user?.name, user?.status]);

  const logout = useCallback(async () => {
    const userId = supabaseUser?.id || user?.name;
    if (userId) {
      presenceService.setOffline(userId);
    }

    if (user && !supabaseUser) {
      saveGuestProfileCache(user as unknown as Record<string, unknown>);
    }

    if (supabaseUser) {
      await supabaseAuthService.signOut(supabaseUser.id);
    }
    setUser(null);
    setSupabaseUser(null);
    localStorage.removeItem(GUEST_SESSION_KEY);
    clearGuestToken();
  }, [supabaseUser, user]);

  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    if (!user) return;

    const updated = { ...user, ...updates };
    setUser(updated);
    setProfiles(p => ({ ...p, [updated.name]: updated }));

    if (!supabaseUser) {
      saveGuestSession(updated);
      saveGuestProfileCache(updated as unknown as Record<string, unknown>);
    }

    const presenceUserId = supabaseUser?.id || updated.name;
    void presenceService.updateStatus(presenceUserId, (updated.status || 'online') as UserProfile['status'], {
      name: updated.name,
      avatar: updated.avatar,
      initials: updated.initials,
    });

    if (supabaseUser) {
      try {
        await supabaseAuthService.updateProfile(supabaseUser.id, {
          name: updated.name,
          avatar: updated.avatar,
          initials: updated.initials,
          bio: updated.bio,
          status: updated.status,
          status_text: updated.statusText,
          level: updated.level,
          xp: updated.xp,
          is_premium: updated.isPremium,
          age: updated.age,
          city: updated.city,
          gender: updated.gender,
        });
      } catch (err) {
        console.error('Erreur lors de la mise à jour du profil:', err);
      }
    }
  }, [user, supabaseUser, saveGuestSession]);

  const setStatus = useCallback((status: UserProfile['status']) => {
    updateProfile({ status });

    if (supabaseUser) {
      if (status === 'offline') {
        presenceService.setOffline(supabaseUser.id);
      } else {
        presenceService.updateStatus(supabaseUser.id, status, {
          name: user?.name || '',
          avatar: user?.avatar || 'av1',
          initials: user?.initials || '',
        });
      }
    } else if (user) {
      if (status === 'offline') {
        presenceService.setOffline(user.name);
      } else {
        presenceService.updateStatus(user.name, status, {
          name: user.name,
          avatar: user.avatar,
          initials: user.initials,
        });
      }
    }
  }, [updateProfile, supabaseUser, user]);

  const setUserStatusAdmin = useCallback((name: string, status: UserProfile['status']) => {
    setProfiles(prev => {
      const p = prev[name];
      if (!p) return prev;
      return { ...prev, [name]: { ...p, status } };
    });
  }, []);

  const value: UserContextType = {
    user,
    supabaseUser,
    login,
    loginWithSupabase,
    logout,
    updateProfile,
    setStatus,
    setUserStatusAdmin,
    profiles,
    setProfiles,
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
