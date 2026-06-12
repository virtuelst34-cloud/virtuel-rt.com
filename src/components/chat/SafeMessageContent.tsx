import React, { memo } from 'react';
import { sanitizeImageUrl } from '@/lib/sanitizer';

interface SafeMessageContentProps {
  text: string;
  imageUrl?: string;
  isSystem?: boolean;
  currentUserName?: string;
}

// Rend le texte avec les mentions @nom en surbrillance
function renderWithMentions(text: string, currentUserName: string) {
  const parts = text.split(/(@\w+)/g);
  return parts.map((part, i) => {
    if (part.startsWith('@')) {
      const name = part.slice(1);
      const isMe = name === currentUserName;
      return (
        <span key={i}
          className={`font-semibold rounded px-0.5 ${
            isMe
              ? 'bg-primary/25 text-primary'
              : 'bg-white/10 text-purple-300'
          }`}>
          {part}
        </span>
      );
    }
    return part;
  });
}

const SafeMessageContent = memo(function SafeMessageContent({ text, imageUrl, isSystem = false, currentUserName = '' }: SafeMessageContentProps) {
  const safeText     = typeof text === 'string' ? text : '';
  const safeImageUrl = imageUrl ? sanitizeImageUrl(imageUrl) : null;

  if (isSystem) return <span>{safeText}</span>;

  return (
    <div className="space-y-2">
      {safeText && <p className="break-words">{renderWithMentions(safeText, currentUserName)}</p>}
      {safeImageUrl && (
        <img
          src={safeImageUrl}
          alt="Message image"
          loading="lazy"
          className="rounded-lg max-w-[300px] max-h-[400px] object-cover"
          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
      )}
    </div>
  );
});

export default SafeMessageContent;
