import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';

interface CustomBadge {
  id: string;
  label: string;
  color: string;
  glow: string;
  minLevel: number;
}

interface BadgesContextType {
  customBadges: CustomBadge[];
  setCustomBadges: React.Dispatch<React.SetStateAction<CustomBadge[]>>;
}

const BadgesContext = createContext<BadgesContextType | null>(null);

const BADGES_KEY = 'virtuel_rt_custom_badges';

export function BadgesProvider({ children }: { children: ReactNode }) {
  const [customBadges, setCustomBadges] = useState<CustomBadge[]>([]);
  const timerRef = useRef<number | null>(null);

  // Charger depuis localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(BADGES_KEY);
      if (saved) setCustomBadges(JSON.parse(saved));
    } catch {}
  }, []);

  // Persister avec debouncing
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(BADGES_KEY, JSON.stringify(customBadges));
      } catch {}
    }, 300);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [customBadges]);

  const value: BadgesContextType = {
    customBadges, setCustomBadges
  };

  return (
    <BadgesContext.Provider value={value}>
      {children}
    </BadgesContext.Provider>
  );
}

export function useBadges(): BadgesContextType {
  const context = useContext(BadgesContext);
  if (!context) throw new Error('useBadges must be used inside BadgesProvider');
  return context;
}
