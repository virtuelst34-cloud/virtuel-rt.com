import React, { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import { supabase } from '../supabase';
import { useUser } from './UserContext';

interface TypingContextType {
  typingUsers: Record<string, Set<string>>;
  setTyping: (salonId: string, username: string, isTyping: boolean) => void;
  isUserTyping: (salonId: string, username: string) => boolean;
  getTypingUsers: (salonId: string) => string[];
}

const TypingContext = createContext<TypingContextType | null>(null);

const TYPING_TIMEOUT = 3000;

export function TypingProvider({ children }: { children: ReactNode }) {
  const [typingUsers, setTypingUsers] = useState<Record<string, Set<string>>>({});
  const channelsRef = useRef<Map<string, ReturnType<typeof supabase.channel>>>(new Map());
  const { user } = useUser();

  const ensureChannel = useCallback((salonId: string) => {
    if (channelsRef.current.has(salonId)) return channelsRef.current.get(salonId)!;

    const channel = supabase
      .channel(`typing:${salonId}`)
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        const { username, isTyping } = payload as { username?: string; isTyping?: boolean };
        if (!username || username === user?.name) return;

        setTypingUsers(prev => {
          const salonTyping = new Set(prev[salonId] || []);
          if (isTyping) {
            salonTyping.add(username);
          } else {
            salonTyping.delete(username);
          }
          return { ...prev, [salonId]: salonTyping };
        });

        if (isTyping) {
          setTimeout(() => {
            setTypingUsers(prev => {
              const salonTyping = new Set(prev[salonId] || []);
              salonTyping.delete(username);
              return { ...prev, [salonId]: salonTyping };
            });
          }, TYPING_TIMEOUT);
        }
      })
      .subscribe();

    channelsRef.current.set(salonId, channel);
    return channel;
  }, [user?.name]);

  useEffect(() => {
    return () => {
      for (const channel of channelsRef.current.values()) {
        supabase.removeChannel(channel);
      }
      channelsRef.current.clear();
    };
  }, []);

  const setTyping = useCallback((salonId: string, username: string, isTyping: boolean) => {
    if (isTyping) {
      setTypingUsers(prev => ({
        ...prev,
        [salonId]: new Set([...(prev[salonId] || []), username]),
      }));

      setTimeout(() => {
        setTypingUsers(prev => {
          const salonTyping = prev[salonId];
          if (salonTyping) {
            salonTyping.delete(username);
            return { ...prev, [salonId]: salonTyping };
          }
          return prev;
        });
      }, TYPING_TIMEOUT);
    } else {
      setTypingUsers(prev => {
        const salonTyping = prev[salonId];
        if (salonTyping) {
          salonTyping.delete(username);
          return { ...prev, [salonId]: salonTyping };
        }
        return prev;
      });
    }

    const channel = ensureChannel(salonId);
    void channel.send({
      type: 'broadcast',
      event: 'typing',
      payload: { username, isTyping },
    });
  }, [ensureChannel]);

  const isUserTyping = useCallback((salonId: string, username: string) => {
    return typingUsers[salonId]?.has(username) || false;
  }, [typingUsers]);

  const getTypingUsers = useCallback((salonId: string) => {
    return Array.from(typingUsers[salonId] || []).filter(name => name !== user?.name);
  }, [typingUsers, user?.name]);

  return (
    <TypingContext.Provider value={{ typingUsers, setTyping, isUserTyping, getTypingUsers }}>
      {children}
    </TypingContext.Provider>
  );
}

export function useTyping() {
  const context = useContext(TypingContext);
  if (!context) {
    throw new Error('useTyping must be used within TypingProvider');
  }
  return context;
}
