import React, { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import { supabase } from '../supabase';
import { supabaseAuthService, UserProfile as SupabaseUserProfile } from '../supabaseAuth';
import { presenceService } from '../presenceService';
import { useNotifications } from './NotificationsContext';
import { recordLogin } from '../userActivity';

export interface UserProfile {
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
  email?: string;
  emailVerified?: boolean;
  isFounder?: boolean;
  isDirection?: boolean;
  isMasterOp?: boolean;
  isIridescent?: boolean;
  age?: number;
  city?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
}

interface UserContextType {
  user: UserProfile | null;
  supabaseUser: SupabaseUserProfile | null;
  login: (name: string, avatar: string, initials: string) => void;
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
const GUEST_SESSION_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds

function profileFromSupabase(profile: SupabaseUserProfile): UserProfile {
  return {
    name: profile.name,
    avatar: profile.avatar,
    initials: profile.initials,
    bio: profile.bio || '',
    xp: profile.xp,
    level: profile.level,
    monthlyXP: 0,
    isBanned: false,
    isMuted: false,
    banReason: '',
    isPremium: profile.is_premium,
    isAdmin: !!(profile as any).is_admin || !!profile.is_founder || !!profile.is_direction || !!profile.is_master_op || !!(profile as any).special_badges?.includes('founder'),
    status: profile.status,
    joinedAt: profile.created_at,
    statusText: profile.status_text || '',
    email: profile.email,
    emailVerified: profile.email_confirmed_at ? true : false,
    isFounder: profile.is_founder,
    isDirection: profile.is_direction,
    isMasterOp: profile.is_master_op,
    isIridescent: profile.is_iridescent || false,
    age: profile.age,
    city: profile.city,
    gender: profile.gender,
  };
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

  // Charger la session invité depuis localStorage
  const loadGuestSession = useCallback(() => {
    try {
      const guestSessionData = localStorage.getItem(GUEST_SESSION_KEY);
      if (guestSessionData && isMountedRef.current) {
        const session = JSON.parse(guestSessionData);
        const now = Date.now();
        
        // Vérifier si la session est encore valide (30 minutes)
        if (now - session.timestamp < GUEST_SESSION_DURATION) {
          // Restaurer la session invité
          if (isMountedRef.current) {
            setUser(session.user);
            setProfiles(prev => ({ ...prev, [session.user.name]: session.user }));
            trackLogin(session.user.name);
            
            // Initialiser le service de présence
            console.log('[UserContext] Initialisation du service de présence pour invité:', session.user.name);
            presenceService.initialize(session.user.name).then(() => {
              presenceService.setOnline(session.user.name, undefined, { 
                name: session.user.name, 
                avatar: session.user.avatar, 
                initials: session.user.initials,
                status: session.user.status || 'online',
              });
            }).catch(err => {
              console.error('[UserContext] Erreur initialisation présence invité:', err);
            });
          }
          return true;
        } else {
          // Session expirée, supprimer
          localStorage.removeItem(GUEST_SESSION_KEY);
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement de la session invité:', error);
    }
    return false;
  }, [trackLogin]);

  // Sauvegarder la session invité dans localStorage
  const saveGuestSession = useCallback((guestUser: UserProfile) => {
    try {
      const session = {
        user: guestUser,
        timestamp: Date.now(),
      };
      localStorage.setItem(GUEST_SESSION_KEY, JSON.stringify(session));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de la session invité:', error);
    }
  }, []);

  // Nettoyage lors du démontage
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Charger la session Supabase au démarrage
  useEffect(() => {
    const loadSession = async () => {
      try {
        console.log('Chargement de la session Supabase...');
        const currentUser = await supabaseAuthService.getCurrentUser();
        console.log('Utilisateur Supabase chargé:', currentUser);
        if (currentUser) {
          setSupabaseUser(currentUser);
          const mappedUser = profileFromSupabase(currentUser);
          setUser(mappedUser);
          setProfiles(prev => ({ ...prev, [mappedUser.name]: mappedUser }));
          trackLogin(currentUser.id);
          
          // Initialiser le service de présence
          console.log('[UserContext] Initialisation du service de présence pour utilisateur Supabase:', currentUser.id);
          presenceService.initialize(currentUser.id).then(() => {
            console.log('[UserContext] Service initialisé, mise en ligne...');
            presenceService.setOnline(currentUser.id, undefined, { name: currentUser.name, avatar: currentUser.avatar, initials: currentUser.initials, status: currentUser.status });
          }).catch(err => {
            console.error('[UserContext] Erreur initialisation présence:', err);
          });
        } else {
          console.log('Aucun utilisateur Supabase, chargement session invité');
          // Essayer de charger la session invité
          loadGuestSession();
        }
      } catch (error) {
        console.error('Erreur lors du chargement de la session:', error);
        // En cas d'erreur, essayer de charger la session invité
        loadGuestSession();
      }
    };

    loadSession();

    // Écouter les changements d'authentification
    const { data: { subscription } } = supabaseAuthService.onAuthStateChange((profile) => {
      console.log('Changement d\'authentification:', profile);
      if (profile) {
        setSupabaseUser(profile);
        const mappedUser = profileFromSupabase(profile);
        setUser(mappedUser);
        setProfiles(prev => ({ ...prev, [mappedUser.name]: mappedUser }));
      } else {
        setSupabaseUser(null);
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // S'abonner aux changements de profils en temps réel
  useEffect(() => {
    const channel = supabase
      .channel('profiles_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
        },
        async (payload) => {
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            const updatedProfile = payload.new as SupabaseUserProfile;
            setProfiles(prev => ({
              ...prev,
              [updatedProfile.name]: {
                name: updatedProfile.name,
                avatar: updatedProfile.avatar,
                initials: updatedProfile.initials,
                bio: updatedProfile.bio || '',
                xp: updatedProfile.xp,
                level: updatedProfile.level,
                monthlyXP: 0,
                isBanned: false,
                isMuted: false,
                banReason: '',
                isPremium: updatedProfile.is_premium,
                isAdmin: !!updatedProfile.is_admin || !!updatedProfile.is_founder || !!updatedProfile.is_direction || !!updatedProfile.is_master_op,
                status: updatedProfile.status,
                joinedAt: updatedProfile.created_at,
                statusText: updatedProfile.status_text || '',
                email: updatedProfile.email,
                emailVerified: updatedProfile.email_confirmed_at ? true : false,
                isFounder: updatedProfile.is_founder,
                isDirection: updatedProfile.is_direction,
                isMasterOp: updatedProfile.is_master_op,
                isIridescent: updatedProfile.is_iridescent || false,
                age: updatedProfile.age,
                city: updatedProfile.city,
                gender: updatedProfile.gender,
              },
            }));

            // Mettre à jour l'utilisateur actuel si c'est lui
            if (user && user.name === updatedProfile.name) {
              setUser({
                name: updatedProfile.name,
                avatar: updatedProfile.avatar,
                initials: updatedProfile.initials,
                bio: updatedProfile.bio || '',
                xp: updatedProfile.xp,
                level: updatedProfile.level,
                monthlyXP: 0,
                isBanned: false,
                isMuted: false,
                banReason: '',
                isPremium: updatedProfile.is_premium,
                isAdmin: !!updatedProfile.is_admin || !!updatedProfile.is_founder || !!updatedProfile.is_direction || !!updatedProfile.is_master_op,
                status: updatedProfile.status,
                joinedAt: updatedProfile.created_at,
                statusText: updatedProfile.status_text || '',
                email: updatedProfile.email,
                emailVerified: updatedProfile.email_confirmed_at ? true : false,
                isFounder: updatedProfile.is_founder,
                isDirection: updatedProfile.is_direction,
                isMasterOp: updatedProfile.is_master_op,
                isIridescent: updatedProfile.is_iridescent || false,
                age: updatedProfile.age,
                city: updatedProfile.city,
                gender: updatedProfile.gender,
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const login = useCallback((name: string, avatar: string, initials: string) => {
    console.log('[UserContext] login appelé avec:', { name, avatar, initials });
    
    // Pour le mode invité/local, garder le comportement actuel
    const existingProfile = profiles[name];
    const profile: UserProfile = existingProfile || {
      name, avatar, initials, bio: '',
      xp: 0, level: 1, monthlyXP: 0,
      isBanned: false, isMuted: false, banReason: '',
      isPremium: false, isAdmin: false, status: 'online',
      joinedAt: new Date().toISOString(),
    };
    const updated = { ...profile, avatar, initials, status: 'online' as const };
    setProfiles(prev => ({ ...prev, [name]: updated }));
    setUser(updated);
    trackLogin(name);
    
    // Sauvegarder la session invité
    saveGuestSession(updated);

    console.log('[UserContext] Initialisation du service de présence pour:', name);
    // Initialiser le service de présence avec les données utilisateur
    presenceService.initialize(name).then(() => {
      console.log('[UserContext] Service initialisé, mise en ligne...');
      presenceService.setOnline(name, undefined, { name, avatar, initials, status: updated.status });
    }).catch(err => {
      console.error('[UserContext] Erreur initialisation présence:', err);
    });
  }, [profiles, saveGuestSession, trackLogin]);

  const loginWithSupabase = useCallback((sbUser: SupabaseUserProfile) => {
    setSupabaseUser(sbUser);
    setUser({
      name: sbUser.name,
      avatar: sbUser.avatar,
      initials: sbUser.initials,
      bio: sbUser.bio || '',
      xp: sbUser.xp,
      level: sbUser.level,
      monthlyXP: 0,
      isBanned: false,
      isMuted: false,
      banReason: '',
      isPremium: sbUser.is_premium,
      isAdmin: !!sbUser.is_admin || !!sbUser.is_founder || !!sbUser.is_direction || !!sbUser.is_master_op,
      status: sbUser.status,
      joinedAt: sbUser.created_at,
      statusText: sbUser.status_text || '',
      email: sbUser.email,
      emailVerified: sbUser.email_confirmed_at ? true : false,
      isFounder: sbUser.is_founder,
      isDirection: sbUser.is_direction,
      isMasterOp: sbUser.is_master_op,
      isIridescent: sbUser.is_iridescent || false,
      age: sbUser.age,
      city: sbUser.city,
      gender: sbUser.gender,
    });
    setProfiles(prev => ({
      ...prev,
      [sbUser.name]: {
        name: sbUser.name,
        avatar: sbUser.avatar,
        initials: sbUser.initials,
        bio: sbUser.bio || '',
        xp: sbUser.xp,
        level: sbUser.level,
        monthlyXP: 0,
        isBanned: false,
        isMuted: false,
        banReason: '',
        isPremium: sbUser.is_premium,
        isAdmin: !!sbUser.is_admin || !!sbUser.is_founder || !!sbUser.is_direction || !!sbUser.is_master_op,
        status: sbUser.status,
        joinedAt: sbUser.created_at,
        statusText: sbUser.status_text || '',
        email: sbUser.email,
        emailVerified: sbUser.email_confirmed_at ? true : false,
        isFounder: sbUser.is_founder,
        isDirection: sbUser.is_direction,
        isMasterOp: sbUser.is_master_op,
        isIridescent: sbUser.is_iridescent || false,
        age: sbUser.age,
        city: sbUser.city,
        gender: sbUser.gender,
      },
    }));

    // Initialiser le service de présence avec les données utilisateur
    presenceService.initialize(sbUser.id).then(() => {
      presenceService.setOnline(sbUser.id, undefined, { name: sbUser.name, avatar: sbUser.avatar, initials: sbUser.initials, status: sbUser.status });
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
  }, [supabaseUser?.id, user?.name]);

  const logout = useCallback(async () => {
    // Déconnecter le service de présence
    const userId = supabaseUser?.id || user?.name;
    if (userId) {
      presenceService.setOffline(userId);
    }
    
    if (supabaseUser) {
      await supabaseAuthService.signOut(supabaseUser.id);
    }
    setUser(null);
    setSupabaseUser(null);
    // Supprimer la session invité
    localStorage.removeItem(GUEST_SESSION_KEY);
  }, [supabaseUser, user]);

  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    setUser(prev => {
      if (!prev) return prev;
      const updated = { ...prev, ...updates };
      setProfiles(p => ({ ...p, [prev.name]: updated }));

      if (!supabaseUser) {
        saveGuestSession(updated);
      }

      const presenceUserId = supabaseUser?.id || updated.name;
      void presenceService.updateStatus(presenceUserId, updated.status || 'online', {
        name: updated.name,
        avatar: updated.avatar,
        initials: updated.initials,
      });

      // Synchroniser avec Supabase si l'utilisateur est connecté
      if (supabaseUser) {
        supabaseAuthService.updateProfile(supabaseUser.id, {
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
        }).catch(err => console.error('Erreur lors de la mise à jour du profil:', err));
      }

      return updated;
    });
  }, [supabaseUser, saveGuestSession]);

  const setStatus = useCallback((status: UserProfile['status']) => {
    updateProfile({ status });
    
    // Mettre à jour la présence Supabase
    if (supabaseUser) {
      if (status === 'offline') {
        presenceService.setOffline(supabaseUser.id);
      } else {
        presenceService.updateStatus(supabaseUser.id, status, {
          name: user?.name || '',
          avatar: user?.avatar || 'av1',
          initials: user?.initials || ''
        });
      }
    } else if (user) {
      // Pour les invités, utiliser le nom comme identifiant
      if (status === 'offline') {
        presenceService.setOffline(user.name);
      } else {
        presenceService.updateStatus(user.name, status, {
          name: user.name,
          avatar: user.avatar,
          initials: user.initials
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
    user, supabaseUser, login, loginWithSupabase, logout, updateProfile, setStatus, setUserStatusAdmin, profiles, setProfiles
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
