import React from 'react';
import { useTyping, useSalons } from '@/lib/contexts';

export default function TypingIndicator() {
  const { getTypingUsers } = useTyping();
  const { currentSalon } = useSalons();

  if (!currentSalon) return null;

  const typingUsers = getTypingUsers(currentSalon);

  if (typingUsers.length === 0) return null;

  const text = typingUsers.length === 1
    ? `${typingUsers[0]} est en train d'écrire...`
    : typingUsers.length === 2
    ? `${typingUsers[0]} et ${typingUsers[1]} sont en train d'écrire...`
    : `${typingUsers.slice(0, 2).join(', ')} et ${typingUsers.length - 1} autres sont en train d'écrire...`;

  return (
    <div className="px-4 py-2 text-xs text-muted-foreground/70 italic animate-pulse">
      {text}
    </div>
  );
}
