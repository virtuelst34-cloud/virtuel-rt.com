import { useMemo } from 'react';
import { useMessagesActions, useSalonMessages } from '@/lib/contexts';

/**
 * Hook personnalisé pour gérer les messages persistants d'un salon
 * Encapsule l'accès aux messages, messages épinglés, et opérations associées
 */
export function usePersistedMessages(salonId: string | null) {
  const messages = useSalonMessages(salonId);
  const { addMessage, deleteMessage, pinMessage } = useMessagesActions();

  const pinnedMessage = useMemo(() => {
    return messages?.find(m => m.pinned) || null;
  }, [messages]);

  return {
    messages: messages || [],
    pinnedMessage,
    addMessage,
    deleteMessage,
    pinMessage,
  };
}
