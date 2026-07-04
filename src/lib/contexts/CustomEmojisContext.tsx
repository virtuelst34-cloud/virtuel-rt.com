import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface CustomEmoji {
  id: string;
  name: string;
  url: string;
  category?: string;
  addedBy: string;
  addedAt: string;
}

interface CustomEmojisContextType {
  customEmojis: CustomEmoji[];
  addCustomEmoji: (emoji: Omit<CustomEmoji, 'id' | 'addedAt'>) => void;
  removeCustomEmoji: (id: string) => void;
  getEmojisByCategory: (category?: string) => CustomEmoji[];
}

const CustomEmojisContext = createContext<CustomEmojisContextType | null>(null);

export function CustomEmojisProvider({ children }: { children: ReactNode }) {
  const [customEmojis, setCustomEmojis] = useState<CustomEmoji[]>([]);

  const addCustomEmoji = useCallback((emoji: Omit<CustomEmoji, 'id' | 'addedAt'>) => {
    const newEmoji: CustomEmoji = {
      ...emoji,
      id: `custom-${Date.now()}`,
      addedAt: new Date().toISOString(),
    };
    setCustomEmojis(prev => [...prev, newEmoji]);
  }, []);

  const removeCustomEmoji = useCallback((id: string) => {
    setCustomEmojis(prev => prev.filter(e => e.id !== id));
  }, []);

  const getEmojisByCategory = useCallback((category?: string) => {
    if (!category) return customEmojis;
    return customEmojis.filter(e => e.category === category);
  }, [customEmojis]);

  return (
    <CustomEmojisContext.Provider value={{ customEmojis, addCustomEmoji, removeCustomEmoji, getEmojisByCategory }}>
      {children}
    </CustomEmojisContext.Provider>
  );
}

export function useCustomEmojis(): CustomEmojisContextType {
  const context = useContext(CustomEmojisContext);
  if (!context) {
    throw new Error('useCustomEmojis must be used within CustomEmojisProvider');
  }
  return context;
}
