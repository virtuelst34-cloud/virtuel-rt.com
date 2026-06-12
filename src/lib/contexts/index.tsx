import React, { ReactNode } from 'react';
import { UserProvider, useUser } from './UserContext';
import { MessagesProvider, useMessages } from './MessagesContext';
import { ModerationProvider, useModeration } from './ModerationContext';
import { NotificationsProvider, useNotifications } from './NotificationsContext';
import { PreferencesProvider, usePreferences } from './PreferencesContext';
import { SalonsProvider, useSalons } from './SalonsContext';
import { UIProvider, useUI } from './UIContext';
import { XPProvider, useXP } from './XPContext';
import { BadgesProvider, useBadges } from './BadgesContext';

/**
 * Fournisseur composite qui combine tous les contextes séparés
 * Ordre important: NotificationsProvider et PreferencesProvider en premier,
 * XPProvider avant les autres qui en dépendent
 */
import { DMProvider, useDM } from './DMContext';

export function ChatProvider({ children }: { children: ReactNode }) {
  return (
    <NotificationsProvider>
      <PreferencesProvider>
        <UserProvider>
          <MessagesProvider>
            <DMProvider>
              <ModerationProvider>
                <SalonsProvider>
                  <UIProvider>
                    <XPProvider>
                      <BadgesProvider>
                        {children}
                      </BadgesProvider>
                    </XPProvider>
                  </UIProvider>
                </SalonsProvider>
              </ModerationProvider>
            </DMProvider>
          </MessagesProvider>
        </UserProvider>
      </PreferencesProvider>
    </NotificationsProvider>
  );
}

// Réexporter tous les hooks pour un accès facile
export { useUser, UserProvider };
export { useMessages, MessagesProvider };
export { useModeration, ModerationProvider };
export { useNotifications, NotificationsProvider };
export { usePreferences, PreferencesProvider };
export { useSalons, SalonsProvider };
export { useUI, UIProvider };
export { useXP, XPProvider };
export { useBadges, BadgesProvider };
export { useDM, DMProvider };

/**
 * Hook de compatibilité backward qui combine tous les contextes
 * Pour un accès unifié à l'ancienne API `useChat()`
 */
export function useChat() {
  const userCtx = useUser();
  const messagesCtx = useMessages();
  const moderationCtx = useModeration();
  const notificationsCtx = useNotifications();
  const preferencesCtx = usePreferences();
  const salonsCtx = useSalons();
  const uiCtx = useUI();
  const xpCtx = useXP();
  const badgesCtx = useBadges();
  const dmCtx = useDM();

  return {
    // User & Profils
    ...userCtx,
    // Messages
    ...messagesCtx,
    // Moderation
    ...moderationCtx,
    // Notifications
    ...notificationsCtx,
    // Preferences
    ...preferencesCtx,
    // Salons
    ...salonsCtx,
    // UI
    ...uiCtx,
    // XP
    ...xpCtx,
    // Badges
    ...badgesCtx,
    // DM
    ...dmCtx,
  };
}
