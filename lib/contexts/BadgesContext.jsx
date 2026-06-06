import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

const BadgesContext = createContext(null);

const BADGES_KEY = 'virtuel_st_custom_badges';

export function BadgesProvider({ children }) {
  const [customBadges, setCustomBadges] = useState([]);
  const timerRef = useRef(null);

  // Charger depuis localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(BADGES_KEY);
      if (saved) setCustomBadges(JSON.parse(saved));
    } catch {}
  }, []);

  // Persister avec debouncing
  useEffect(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(BADGES_KEY, JSON.stringify(customBadges));
      } catch {}
    }, 300);
    return () => clearTimeout(timerRef.current);
  }, [customBadges]);

  const value = {
    customBadges, setCustomBadges
  };

  return (
    <BadgesContext.Provider value={value}>
      {children}
    </BadgesContext.Provider>
  );
}

export function useBadges() {
  const context = useContext(BadgesContext);
  if (!context) throw new Error('useBadges must be used inside BadgesProvider');
  return context;
}
