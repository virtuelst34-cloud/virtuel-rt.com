import { useChat } from '@/lib/ChatContext';
import { useMemo } from 'react';

/**
 * Hook personnalisé pour gérer les messages persistants d'un salon
 * Encapsule l'accès aux messages, messages épinglés, et opérations associées
 */
export function usePersistedMessages(salonId: string | null) {
  const { getMessages, addMessage, deleteMessage, pinMessage } = useChat();
  
  // Récupère tous les messages du salon
  const messages = salonId ? getMessages(salonId) : [];
  
  // Compute le message épinglé (ne recalcule que si messages change)
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
