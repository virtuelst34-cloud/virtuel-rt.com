/**
 * Gestion du thème avec mode sombre automatique
 * 
 * Détecte les préférences système et permet le basculement manuel
 */

import React from 'react';

export type ThemeMode = 'light' | 'dark' | 'auto';

class ThemeManager {
  private currentMode: ThemeMode = 'auto';
  private listeners: Set<(isDark: boolean) => void> = new Set();

  constructor() {
    this.loadFromStorage();
    this.applyTheme();
    this.watchSystemPreference();
  }

  /**
   * Charge le mode depuis le localStorage
   */
  private loadFromStorage(): void {
    const stored = localStorage.getItem('theme-mode');
    if (stored && ['light', 'dark', 'auto'].includes(stored)) {
      this.currentMode = stored as ThemeMode;
    }
  }

  /**
   * Sauvegarde le mode dans le localStorage
   */
  private saveToStorage(): void {
    localStorage.setItem('theme-mode', this.currentMode);
  }

  /**
   * Détecte si le système préfère le mode sombre
   */
  private systemPrefersDark(): boolean {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return false;
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  /**
   * Applique le thème au document
   */
  private applyTheme(): void {
    const isDark = this.isDark();
    
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Notifier les listeners
    this.listeners.forEach(listener => listener(isDark));
  }

  /**
   * Surveille les changements de préférence système
   */
  private watchSystemPreference(): void {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = () => {
      if (this.currentMode === 'auto') {
        this.applyTheme();
      }
    };

    // Pour les navigateurs modernes
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      // Fallback pour les anciens navigateurs
      mediaQuery.addListener(handleChange);
    }
  }

  /**
   * Détermine si le mode sombre est actif
   */
  isDark(): boolean {
    if (this.currentMode === 'auto') {
      return this.systemPrefersDark();
    }
    return this.currentMode === 'dark';
  }

  /**
   * Définit le mode du thème
   */
  setMode(mode: ThemeMode): void {
    this.currentMode = mode;
    this.saveToStorage();
    this.applyTheme();
  }

  /**
   * Bascule le thème (light <-> dark)
   */
  toggle(): void {
    if (this.currentMode === 'auto') {
      this.setMode(this.systemPrefersDark() ? 'light' : 'dark');
    } else {
      this.setMode(this.currentMode === 'light' ? 'dark' : 'light');
    }
  }

  /**
   * Obtient le mode actuel
   */
  getMode(): ThemeMode {
    return this.currentMode;
  }

  /**
   * S'abonne aux changements de thème
   */
  subscribe(listener: (isDark: boolean) => void): () => void {
    this.listeners.add(listener);
    
    // Appeler immédiatement avec l'état actuel
    listener(this.isDark());

    // Retourner une fonction de désabonnement
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Obtient les heures de transition (pour le mode automatique basé sur l'heure)
   */
  getTransitionHours(): { start: number; end: number } {
    const stored = localStorage.getItem('theme-transition-hours');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        return { start: parsed.start || 20, end: parsed.end || 6 };
      } catch {
        // Ignorer les erreurs de parsing
      }
    }
    return { start: 20, end: 6 }; // 20h à 6h par défaut
  }

  /**
   * Définit les heures de transition
   */
  setTransitionHours(start: number, end: number): void {
    localStorage.setItem('theme-transition-hours', JSON.stringify({ start, end }));
  }

  /**
   * Détermine si on doit être en mode sombre basé sur l'heure actuelle
   */
  shouldBeDarkByTime(): boolean {
    const { start, end } = this.getTransitionHours();
    const currentHour = new Date().getHours();

    if (start < end) {
      // Ex: 6h à 20h (jour)
      return currentHour < start || currentHour >= end;
    } else {
      // Ex: 20h à 6h (nuit)
      return currentHour >= start || currentHour < end;
    }
  }

  /**
   * Active le mode automatique basé sur l'heure
   */
  enableTimeBasedAuto(): void {
    const isDark = this.shouldBeDarkByTime();
    document.documentElement.classList.toggle('dark', isDark);
  }
}

export const themeManager = new ThemeManager();

// Hook React pour utiliser le thème
export function useTheme() {
  const [isDark, setIsDark] = React.useState(() => themeManager.isDark());

  React.useEffect(() => {
    const unsubscribe = themeManager.subscribe((dark) => {
      setIsDark(dark);
    });

    return unsubscribe;
  }, []);

  return {
    isDark,
    mode: themeManager.getMode(),
    setMode: (mode: ThemeMode) => themeManager.setMode(mode),
    toggle: () => themeManager.toggle()
  };
}
