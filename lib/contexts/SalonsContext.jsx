import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useNotifications } from './NotificationsContext';

const SalonsContext = createContext(null);

const SALONS_KEY = 'virtuel_rt_custom_salons';
const HIDDEN_SALONS_KEY = 'virtuel_rt_hidden_salons';

export function SalonsProvider({ children }) {
  const [customSalons, setCustomSalons] = useState([]);
  const [hiddenSalons, setHiddenSalons] = useState([]);
  const [currentSalon, setCurrentSalonRaw] = useState(null);

  // Nettoyer currentSalon quand il est mis à null (déconnexion ou quitter)
  const setCurrentSalon = useCallback((id) => {
    setCurrentSalonRaw(id);
  }, []);

  // Reset du salon courant à chaque montage (pas de salon fantôme persistant)
  useEffect(() => {
    setCurrentSalonRaw(null);
  }, []);
  const { addNotification } = useNotifications();
  const customTimerRef = useRef(null);
  const hiddenTimerRef = useRef(null);

  // Charger depuis localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SALONS_KEY);
      if (saved) setCustomSalons(JSON.parse(saved));
      const savedHidden = localStorage.getItem(HIDDEN_SALONS_KEY);
      if (savedHidden) setHiddenSalons(JSON.parse(savedHidden));
    } catch {}
  }, []);

  // Persister avec debouncing
  useEffect(() => {
    clearTimeout(customTimerRef.current);
    customTimerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(SALONS_KEY, JSON.stringify(customSalons));
      } catch {}
    }, 300);
    return () => clearTimeout(customTimerRef.current);
  }, [customSalons]);

  useEffect(() => {
    clearTimeout(hiddenTimerRef.current);
    hiddenTimerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(HIDDEN_SALONS_KEY, JSON.stringify(hiddenSalons));
      } catch {}
    }, 300);
    return () => clearTimeout(hiddenTimerRef.current);
  }, [hiddenSalons]);

  const addSalon = useCallback((salon) => {
    setCustomSalons(prev => [...prev, salon]);
    addNotification({ type: 'system', message: `✅ Salon « ${salon.name} » créé.` });
  }, [addNotification]);

  const deleteSalon = useCallback((salonId) => {
    setCustomSalons(prev => prev.filter(s => s.id !== salonId));
    setHiddenSalons(prev => prev.includes(salonId) ? prev : [...prev, salonId]);
  }, []);

  const value = {
    customSalons, setCustomSalons, hiddenSalons, setHiddenSalons,
    currentSalon, setCurrentSalon,
    addSalon, deleteSalon
  };

  return (
    <SalonsContext.Provider value={value}>
      {children}
    </SalonsContext.Provider>
  );
}

export function useSalons() {
  const context = useContext(SalonsContext);
  if (!context) throw new Error('useSalons must be used inside SalonsProvider');
  return context;
}
