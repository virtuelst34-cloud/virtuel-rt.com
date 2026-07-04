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
import { TypingProvider, useTyping } from './TypingContext';
import { CustomEmojisProvider, useCustomEmojis } from './CustomEmojisContext';
import { DMProvider, useDM } from './DMContext';
import { FriendsProvider, useFriends } from './FriendsContext';
import { MuteBlockProvider, useMuteBlock } from './MuteBlockContext';

/**
 * Fournisseur composite qui combine tous les contextes séparés.
 * Ordre d'imbrication (dépendances respectées) :
 *   NotificationsProvider → UserProvider → PreferencesProvider
 *   → MessagesProvider → TypingProvider → DMProvider
 *   → FriendsProvider → MuteBlockProvider
 *   → ModerationProvider → SalonsProvider → UIProvider
 *   → XPProvider → BadgesProvider → CustomEmojisProvider
 */
export function ChatProvider({ children }: { children: ReactNode }) {
  return (
    <NotificationsProvider>
      <UserProvider>
        <PreferencesProvider>
          <MessagesProvider>
            <TypingProvider>
              <DMProvider>
                <FriendsProvider>
                  <MuteBlockProvider>
                    <ModerationProvider>
                      <SalonsProvider>
                        <UIProvider>
                          <XPProvider>
                            <BadgesProvider>
                              <CustomEmojisProvider>
                                {children}
                              </CustomEmojisProvider>
                            </BadgesProvider>
                          </XPProvider>
                        </UIProvider>
                      </SalonsProvider>
                    </ModerationProvider>
                  </MuteBlockProvider>
                </FriendsProvider>
              </DMProvider>
            </TypingProvider>
          </MessagesProvider>
        </PreferencesProvider>
      </UserProvider>
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
export { useTyping, TypingProvider };
export { useCustomEmojis, CustomEmojisProvider };
export { useDM, DMProvider };
export { useFriends, FriendsProvider };
export { useMuteBlock, MuteBlockProvider };

/**
 * Hook de compatibilité backward — accès unifié à l'ancienne API useChat().
 * Clés exposées (sans collision, auditées) :
 *   UserContext      : user, supabaseUser, profiles, login, loginWithSupabase, logout, updateProfile, setStatus
 *   MessagesContext  : salonMessages, addMessage, getMessages, deleteMessage, pinMessage, currentSalonId
 *   ModerationContext: blockedUsers, banUser, unbanUser, muteUser, unmuteUser, blockUser, unblockUser, isBlocked, isUserBanned, isUserMuted, moderationLogs, reportedMessages
 *   NotificationsCtx : notifications, addNotification, markAllRead, clearNotifications, unreadCount
 *   PreferencesCtx   : theme, accentColor, toggleTheme, partyMode, togglePartyMode, isPremium, setPremium, compactMode, toggleCompactMode
 *   SalonsContext    : customSalons, currentSalon, addSalon, removeSalon, updateSalon, isSalonLocked, setCurrentSalon
 *   UIContext        : showAdmin, showProfile, openAdmin, closeAdmin, openProfile, closeProfile
 *   XPContext        : monthlyXP, awardXP, sounds, getTopUsers
 *   BadgesContext    : customBadges, addBadge, removeBadge, updateBadge
 *   DMContext        : (dm state & actions)
 *   TypingContext    : typingUsers, setTyping, isUserTyping, getTypingUsers
 *   CustomEmojisCtx : customEmojis, addCustomEmoji, removeCustomEmoji, getEmojisByCategory
 */
export function useChat() {
  const userCtx          = useUser();
  const messagesCtx      = useMessages();
  const moderationCtx    = useModeration();
  const notificationsCtx = useNotifications();
  const preferencesCtx   = usePreferences();
  const salonsCtx        = useSalons();
  const uiCtx            = useUI();
  const xpCtx            = useXP();
  const badgesCtx        = useBadges();
  const dmCtx            = useDM();
  const friendsCtx       = useFriends();
  const muteBlockCtx     = useMuteBlock();
  const typingCtx        = useTyping();
  const customEmojisCtx   = useCustomEmojis();

  return {
    ...userCtx,
    ...messagesCtx,
    ...moderationCtx,
    ...notificationsCtx,
    ...preferencesCtx,
    ...salonsCtx,
    ...uiCtx,
    ...xpCtx,
    ...badgesCtx,
    ...dmCtx,
    ...friendsCtx,
    ...muteBlockCtx,
    ...typingCtx,
    ...customEmojisCtx,
  };
}
