import React, { memo } from 'react';
import type { AvatarStyle } from '@/lib/chatConfig';

interface AvatarFaceProps {
  style: AvatarStyle;
}

// Illustration de visage stylisé en SVG, varie selon le "look" de l'avatar
const AvatarFace = memo(function AvatarFace({ style }: AvatarFaceProps) {
  const { skin, hair, look, blush, glasses } = style;

  return (
    <svg viewBox="0 0 64 64" className="w-full h-full" aria-hidden="true">
      {/* Visage */}
      <circle cx="32" cy="34" r="20" fill={skin} />

      {/* Joues */}
      {blush && (
        <>
          <circle cx="20" cy="38" r="3.5" fill="#000" opacity="0.08" />
          <circle cx="44" cy="38" r="3.5" fill="#000" opacity="0.08" />
        </>
      )}

      {/* Yeux */}
      <circle cx="24" cy="32" r="2.2" fill="#2b2b2b" />
      <circle cx="40" cy="32" r="2.2" fill="#2b2b2b" />

      {/* Sourire */}
      <path d="M24 41 Q32 47 40 41" stroke="#2b2b2b" strokeWidth="2" fill="none" strokeLinecap="round" />

      {/* Cheveux / coiffe, dépend du look */}
      {look === 'short' && (
        <path d="M12 28 Q12 8 32 8 Q52 8 52 28 Q52 18 32 18 Q12 18 12 28 Z" fill={hair} />
      )}

      {look === 'long' && (
        <>
          <path d="M11 30 Q11 8 32 8 Q53 8 53 30 L53 48 Q47 40 47 30 Q47 18 32 18 Q17 18 17 30 Q17 40 11 48 Z" fill={hair} />
        </>
      )}

      {look === 'curly' && (
        <>
          <circle cx="16" cy="20" r="6" fill={hair} />
          <circle cx="24" cy="13" r="7" fill={hair} />
          <circle cx="34" cy="10" r="7.5" fill={hair} />
          <circle cx="44" cy="13" r="7" fill={hair} />
          <circle cx="50" cy="22" r="6" fill={hair} />
          <path d="M14 26 Q14 14 32 12 Q50 14 50 26 Q50 17 32 17 Q14 17 14 26 Z" fill={hair} />
        </>
      )}

      {look === 'bald' && null}

      {look === 'afro' && (
        <circle cx="32" cy="20" r="18" fill={hair} />
      )}

      {look === 'bun' && (
        <>
          <path d="M12 28 Q12 8 32 8 Q52 8 52 28 Q52 18 32 18 Q12 18 12 28 Z" fill={hair} />
          <circle cx="32" cy="7" r="6" fill={hair} />
        </>
      )}

      {look === 'cap' && (
        <>
          <path d="M11 27 Q11 9 32 9 Q53 9 53 27 L53 22 Q53 13 32 13 Q11 13 11 22 Z" fill={hair} />
          <rect x="30" y="10" width="22" height="5" rx="2.5" fill={hair} />
        </>
      )}

      {look === 'mohawk' && (
        <>
          <path d="M27 5 L37 5 L36 20 L28 20 Z" fill={hair} />
          <path d="M25 9 L30 16 L22 18 Z" fill={hair} opacity="0.85" />
          <path d="M39 9 L34 16 L42 18 Z" fill={hair} opacity="0.85" />
        </>
      )}

      {look === 'braids' && (
        <>
          <path d="M12 28 Q12 8 32 8 Q52 8 52 28 Q52 18 32 18 Q12 18 12 28 Z" fill={hair} />
          <rect x="10" y="26" width="6" height="20" rx="3" fill={hair} />
          <rect x="48" y="26" width="6" height="20" rx="3" fill={hair} />
        </>
      )}

      {look === 'beanie' && (
        <>
          <path d="M11 32 Q11 10 32 10 Q53 10 53 32 L53 26 Q53 13 32 13 Q11 13 11 26 Z" fill={hair} />
          <rect x="10" y="24" width="44" height="7" rx="3.5" fill={hair} opacity="0.6" />
          <circle cx="32" cy="11" r="3" fill={hair} opacity="0.6" />
        </>
      )}

      {look === 'bob' && (
        <path d="M11 30 Q11 8 32 8 Q53 8 53 30 L53 38 L46 38 L46 24 Q46 17 32 17 Q18 17 18 24 L18 38 L11 38 Z" fill={hair} />
      )}

      {look === 'spiky' && (
        <>
          <path d="M13 26 Q13 10 32 10 Q51 10 51 26 Q51 19 32 19 Q13 19 13 26 Z" fill={hair} />
          <path d="M14 14 L19 22 L23 13 Z" fill={hair} />
          <path d="M26 8 L31 19 L34 7 Z" fill={hair} />
          <path d="M38 9 L41 20 L46 12 Z" fill={hair} />
        </>
      )}

      {/* Lunettes */}
      {glasses && (
        <g stroke="#2b2b2b" strokeWidth="1.5" fill="none">
          <circle cx="24" cy="32" r="5" />
          <circle cx="40" cy="32" r="5" />
          <line x1="29" y1="32" x2="35" y2="32" />
        </g>
      )}
    </svg>
  );
});

export default AvatarFace;
