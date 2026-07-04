import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { supabase } from '../supabase';

interface TypingContextType {
  typingUsers: Record<string, Set<string>>; // salonId -> Set of usernames
  setTyping: (salonId: string, username: string, isTyping: boolean) => void;
  isUserTyping: (salonId: string, username: string) => boolean;
  getTypingUsers: (salonId: string) => string[];
}

const TypingContext = createContext<TypingContextType | null>(null);

const TYPING_TIMEOUT = 3000; // 3 seconds

export function TypingProvider({ children }: { children: ReactNode }) {
  const [typingUsers, setTypingUsers] = useState<Record<string, Set<string>>>({});

  const setTyping = useCallback((salonId: string, username: string, isTyping: boolean) => {
    if (isTyping) {
      setTypingUsers(prev => ({
        ...prev,
        [salonId]: new Set([...(prev[salonId] || []), username])
      }));

      // Auto-remove after timeout
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
  }, []);

  const isUserTyping = useCallback((salonId: string, username: string) => {
    return typingUsers[salonId]?.has(username) || false;
  }, [typingUsers]);

  const getTypingUsers = useCallback((salonId: string) => {
    return Array.from(typingUsers[salonId] || []);
  }, [typingUsers]);

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
