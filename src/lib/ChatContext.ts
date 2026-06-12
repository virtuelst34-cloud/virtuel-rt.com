/**
 * ChatContext - Wrapper de compatibilité backward
 * Ré-exporte les contextes séparés pour une migration progressive
 * 
 * DÉPRÉCIÉ: Préférer les contextes individuels depuis @/lib/contexts
 * Exemples:
 *   - useUser()          au lieu de useChat().user
 *   - useMessages()      au lieu de useChat().salonMessages
 *   - useModeration()    au lieu de useChat().banUser
 *   - useNotifications() au lieu de useChat().addNotification
 *   - usePreferences()   au lieu de useChat().theme
 *   - useSalons()        au lieu de useChat().currentSalon
 *   - useUI()            au lieu de useChat().showAdmin
 *   - useXP()            au lieu de useChat().awardXP
 *   - useBadges()        au lieu de useChat().customBadges
 */

// Ré-exporter tous les contextes et hooks du nouveau système
export {
  ChatProvider,
  useChat,
  useUser,
  useMessages,
  useModeration,
  useNotifications,
  usePreferences,
  useSalons,
  useUI,
  useXP,
  useBadges,
} from '@/lib/contexts';
