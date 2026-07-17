import React, { memo } from 'react';
import type { AvatarStyle } from '@/lib/chatConfig';

interface AvatarFaceProps {
  style: AvatarStyle;
}

// Avatar multi-style - supporte plusieurs types de designs
const AvatarFace = memo(function AvatarFace({ style }: AvatarFaceProps) {
  const { styleType = 'human', skin, hair, look, blush, glasses, animalType, emojiType, modernType } = style;

  // Human avatar
  if (styleType === 'human') {
    return (
      <svg viewBox="0 0 64 64" className="w-full h-full" aria-hidden="true">
        <defs>
          <radialGradient id="face-gradient" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.1" />
          </radialGradient>
        </defs>
        <ellipse cx="32" cy="34" rx="18" ry="22" fill={skin} />
        <ellipse cx="32" cy="34" rx="18" ry="22" fill="url(#face-gradient)" />
        {blush && (
          <>
            <ellipse cx="22" cy="38" rx="4" ry="2.5" fill="#ffb6c1" opacity="0.25" />
            <ellipse cx="42" cy="38" rx="4" ry="2.5" fill="#ffb6c1" opacity="0.25" />
          </>
        )}
        <ellipse cx="24" cy="32" rx="3" ry="3.5" fill="#1a1a1a" />
        <ellipse cx="24" cy="31" rx="1" ry="1" fill="#ffffff" opacity="0.6" />
        <ellipse cx="40" cy="32" rx="3" ry="3.5" fill="#1a1a1a" />
        <ellipse cx="40" cy="31" rx="1" ry="1" fill="#ffffff" opacity="0.6" />
        <path d="M20 27 Q24 25 28 27" stroke={hair} strokeWidth="1.5" fill="none" opacity="0.6" strokeLinecap="round" />
        <path d="M36 27 Q40 25 44 27" stroke={hair} strokeWidth="1.5" fill="none" opacity="0.6" strokeLinecap="round" />
        <path d="M32 32 L32 38 L30 40" stroke="#000000" strokeWidth="1" opacity="0.15" fill="none" strokeLinecap="round" />
        <path d="M26 44 Q32 48 38 44" stroke="#1a1a1a" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        {look === 'short' && <path d="M14 30 Q14 12 32 10 Q50 12 50 30 Q50 20 32 20 Q14 20 14 30 Z" fill={hair} />}
        {look === 'long' && <path d="M13 32 Q13 12 32 10 Q51 12 51 32 L51 48 Q45 42 45 32 Q45 22 32 22 Q19 22 19 32 Q19 42 13 48 Z" fill={hair} />}
        {look === 'curly' && (
          <>
            <circle cx="18" cy="22" r="7" fill={hair} />
            <circle cx="26" cy="14" r="8" fill={hair} />
            <circle cx="36" cy="12" r="8.5" fill={hair} />
            <circle cx="46" cy="14" r="8" fill={hair} />
            <circle cx="52" cy="24" r="7" fill={hair} />
            <path d="M16 28 Q16 16 32 14 Q48 16 48 28 Q48 20 32 20 Q16 20 16 28 Z" fill={hair} />
          </>
        )}
        {look === 'afro' && <circle cx="32" cy="20" r="20" fill={hair} />}
        {look === 'bun' && (
          <>
            <path d="M14 30 Q14 12 32 10 Q50 12 50 30 Q50 20 32 20 Q14 20 14 30 Z" fill={hair} />
            <circle cx="32" cy="8" r="7" fill={hair} />
          </>
        )}
        {look === 'wavy' && (
          <>
            <path d="M14 30 Q14 12 32 10 Q50 12 50 30 Q50 20 32 20 Q14 20 14 30 Z" fill={hair} />
            <path d="M14 30 Q18 38 22 30 Q26 22 30 30 Q34 38 38 30 Q42 22 46 30 Q50 38 50 30" stroke={hair} strokeWidth="2.5" fill="none" opacity="0.4" />
          </>
        )}
        {look === 'bald' && (
          <ellipse cx="32" cy="18" rx="14" ry="6" fill="#ffffff" opacity="0.12" />
        )}
        {look === 'mohawk' && (
          <>
            <path d="M28 18 L30 6 L32 4 L34 6 L36 18 Z" fill={hair} />
            <path d="M30 10 L32 8 L34 10 L32 16 Z" fill={hair} opacity="0.85" />
          </>
        )}
        {look === 'braids' && (
          <>
            <path d="M14 30 Q14 12 32 10 Q50 12 50 30 Q50 20 32 20 Q14 20 14 30 Z" fill={hair} />
            <path d="M16 32 Q14 40 16 50 Q18 54 20 52 Q18 44 18 36" stroke={hair} strokeWidth="3" fill="none" strokeLinecap="round" />
            <path d="M48 32 Q50 40 48 50 Q46 54 44 52 Q46 44 46 36" stroke={hair} strokeWidth="3" fill="none" strokeLinecap="round" />
          </>
        )}
        {look === 'ponytail' && (
          <>
            <path d="M14 30 Q14 12 32 10 Q50 12 50 30 Q50 20 32 20 Q14 20 14 30 Z" fill={hair} />
            <ellipse cx="32" cy="6" rx="6" ry="8" fill={hair} />
          </>
        )}
        {look === 'undercut' && (
          <>
            <path d="M20 28 Q20 14 32 12 Q44 14 44 28 Q44 20 32 18 Q20 18 20 28 Z" fill={hair} />
            <rect x="14" y="26" width="36" height="6" fill={skin} opacity="0.3" rx="2" />
          </>
        )}
        {look === 'pixie' && (
          <>
            <path d="M16 28 Q18 14 32 12 Q46 14 48 28" fill={hair} />
            <path d="M14 24 L10 20 M18 18 L16 12 M26 14 L26 8 M38 14 L38 8 M46 18 L48 12 M50 24 L54 20" stroke={hair} strokeWidth="2.5" strokeLinecap="round" />
          </>
        )}
        {look === 'dreads' && (
          <>
            {[20, 26, 32, 38, 44].map((x, i) => (
              <path key={i} d={`M${x} 14 Q${x - 2} 24 ${x} 34 Q${x + 2} 44 ${x} 52`} stroke={hair} strokeWidth="3" fill="none" strokeLinecap="round" />
            ))}
          </>
        )}
        {look === 'slicked' && (
          <path d="M14 32 Q14 10 32 8 Q50 10 50 32 Q48 18 32 16 Q16 18 14 32 Z" fill={hair} />
        )}
        {glasses && (
          <g stroke="#1a1a1a" strokeWidth="1.3" fill="none" opacity="0.85">
            <rect x="19" y="28" width="10" height="8" rx="2" />
            <rect x="35" y="28" width="10" height="8" rx="2" />
            <line x1="29" y1="32" x2="35" y2="32" strokeWidth="1.5" />
            <path d="M19 32 Q14 30 14 26" strokeWidth="1.2" />
            <path d="M45 32 Q50 30 50 26" strokeWidth="1.2" />
          </g>
        )}
      </svg>
    );
  }

  // Minimal avatar
  if (styleType === 'minimal') {
    return (
      <svg viewBox="0 0 64 64" className="w-full h-full" aria-hidden="true">
        <circle cx="32" cy="32" r="24" fill="#ffffff" opacity="0.15" />
        <circle cx="32" cy="32" r="16" fill="#ffffff" opacity="0.25" />
        <circle cx="32" cy="32" r="8" fill="#ffffff" opacity="0.35" />
        <circle cx="32" cy="32" r="3" fill="#ffffff" opacity="0.5" />
      </svg>
    );
  }

  // Robot avatar
  if (styleType === 'robot') {
    return (
      <svg viewBox="0 0 64 64" className="w-full h-full" aria-hidden="true">
        <rect x="16" y="16" width="32" height="32" rx="8" fill="#ffffff" opacity="0.2" />
        <circle cx="24" cy="28" r="5" fill="#00ff88" opacity="0.8" />
        <circle cx="40" cy="28" r="5" fill="#00ff88" opacity="0.8" />
        <rect x="24" y="38" width="16" height="4" rx="2" fill="#ffffff" opacity="0.4" />
        <line x1="20" y1="16" x2="20" y2="12" stroke="#ffffff" strokeWidth="2" opacity="0.3" />
        <line x1="32" y1="16" x2="32" y2="12" stroke="#ffffff" strokeWidth="2" opacity="0.3" />
        <line x1="44" y1="16" x2="44" y2="12" stroke="#ffffff" strokeWidth="2" opacity="0.3" />
      </svg>
    );
  }

  // Animal avatar
  if (styleType === 'animal') {
    if (animalType === 'cat') {
      return (
        <svg viewBox="0 0 64 64" className="w-full h-full" aria-hidden="true">
          <circle cx="32" cy="34" r="18" fill="#ffffff" opacity="0.3" />
          <polygon points="18,20 14,10 24,16" fill="#ffffff" opacity="0.4" />
          <polygon points="46,20 50,10 40,16" fill="#ffffff" opacity="0.4" />
          <ellipse cx="24" cy="32" rx="4" ry="5" fill="#1a1a1a" />
          <ellipse cx="40" cy="32" rx="4" ry="5" fill="#1a1a1a" />
          <ellipse cx="24" cy="31" rx="1.5" ry="2" fill="#ffffff" opacity="0.7" />
          <ellipse cx="40" cy="31" rx="1.5" ry="2" fill="#ffffff" opacity="0.7" />
          <path d="M28 42 L32 46 L36 42" stroke="#1a1a1a" strokeWidth="2" fill="none" strokeLinecap="round" />
          <line x1="20" y1="26" x2="16" y2="24" stroke="#1a1a1a" strokeWidth="1" opacity="0.5" />
          <line x1="44" y1="26" x2="48" y2="24" stroke="#1a1a1a" strokeWidth="1" opacity="0.5" />
        </svg>
      );
    }
    if (animalType === 'dog') {
      return (
        <svg viewBox="0 0 64 64" className="w-full h-full" aria-hidden="true">
          <ellipse cx="32" cy="36" rx="20" ry="16" fill="#ffffff" opacity="0.3" />
          <ellipse cx="14" cy="28" rx="8" ry="12" fill="#ffffff" opacity="0.25" transform="rotate(-20 14 28)" />
          <ellipse cx="50" cy="28" rx="8" ry="12" fill="#ffffff" opacity="0.25" transform="rotate(20 50 28)" />
          <circle cx="24" cy="34" r="5" fill="#1a1a1a" />
          <circle cx="40" cy="34" r="5" fill="#1a1a1a" />
          <circle cx="24" cy="33" r="2" fill="#ffffff" opacity="0.7" />
          <circle cx="40" cy="33" r="2" fill="#ffffff" opacity="0.7" />
          <ellipse cx="32" cy="44" rx="8" ry="5" fill="#1a1a1a" opacity="0.3" />
        </svg>
      );
    }
    if (animalType === 'fox') {
      return (
        <svg viewBox="0 0 64 64" className="w-full h-full" aria-hidden="true">
          <polygon points="32,20 16,36 32,32 48,36" fill="#ffffff" opacity="0.3" />
          <polygon points="32,20 20,10 28,18" fill="#ffffff" opacity="0.4" />
          <polygon points="32,20 44,10 36,18" fill="#ffffff" opacity="0.4" />
          <ellipse cx="26" cy="30" rx="3" ry="4" fill="#1a1a1a" />
          <ellipse cx="38" cy="30" rx="3" ry="4" fill="#1a1a1a" />
          <ellipse cx="26" cy="29" rx="1" ry="1.5" fill="#ffffff" opacity="0.7" />
          <ellipse cx="38" cy="29" rx="1" ry="1.5" fill="#ffffff" opacity="0.7" />
          <path d="M28 40 L32 44 L36 40" stroke="#1a1a1a" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </svg>
      );
    }
    if (animalType === 'owl') {
      return (
        <svg viewBox="0 0 64 64" className="w-full h-full" aria-hidden="true">
          <ellipse cx="32" cy="36" rx="22" ry="20" fill="#ffffff" opacity="0.25" />
          <circle cx="22" cy="32" r="8" fill="#ffffff" opacity="0.3" />
          <circle cx="42" cy="32" r="8" fill="#ffffff" opacity="0.3" />
          <circle cx="22" cy="32" r="4" fill="#1a1a1a" />
          <circle cx="42" cy="32" r="4" fill="#1a1a1a" />
          <circle cx="22" cy="31" r="1.5" fill="#ffffff" opacity="0.8" />
          <circle cx="42" cy="31" r="1.5" fill="#ffffff" opacity="0.8" />
          <path d="M28 42 L32 46 L36 42" stroke="#1a1a1a" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </svg>
      );
    }
    if (animalType === 'bear') {
      return (
        <svg viewBox="0 0 64 64" className="w-full h-full" aria-hidden="true">
          <circle cx="32" cy="36" r="18" fill="#ffffff" opacity="0.3" />
          <circle cx="18" cy="22" r="6" fill="#ffffff" opacity="0.25" />
          <circle cx="46" cy="22" r="6" fill="#ffffff" opacity="0.25" />
          <circle cx="24" cy="34" r="4" fill="#1a1a1a" />
          <circle cx="40" cy="34" r="4" fill="#1a1a1a" />
          <circle cx="24" cy="33" r="1.5" fill="#ffffff" opacity="0.7" />
          <circle cx="40" cy="33" r="1.5" fill="#ffffff" opacity="0.7" />
          <ellipse cx="32" cy="44" rx="6" ry="4" fill="#1a1a1a" opacity="0.3" />
        </svg>
      );
    }
    if (animalType === 'rabbit') {
      return (
        <svg viewBox="0 0 64 64" className="w-full h-full" aria-hidden="true">
          <circle cx="32" cy="40" r="16" fill="#ffffff" opacity="0.3" />
          <ellipse cx="24" cy="20" rx="5" ry="18" fill="#ffffff" opacity="0.25" transform="rotate(-10 24 20)" />
          <ellipse cx="40" cy="20" rx="5" ry="18" fill="#ffffff" opacity="0.25" transform="rotate(10 40 20)" />
          <circle cx="26" cy="38" r="4" fill="#1a1a1a" />
          <circle cx="38" cy="38" r="4" fill="#1a1a1a" />
          <circle cx="26" cy="37" r="1.5" fill="#ffffff" opacity="0.7" />
          <circle cx="38" cy="37" r="1.5" fill="#ffffff" opacity="0.7" />
          <path d="M28 46 L32 50 L36 46" stroke="#1a1a1a" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </svg>
      );
    }
    if (animalType === 'panda') {
      return (
        <svg viewBox="0 0 64 64" className="w-full h-full" aria-hidden="true">
          <circle cx="32" cy="36" r="18" fill="#ffffff" opacity="0.35" />
          <circle cx="18" cy="22" r="6" fill="#ffffff" opacity="0.25" />
          <circle cx="46" cy="22" r="6" fill="#ffffff" opacity="0.25" />
          <ellipse cx="22" cy="34" rx="7" ry="8" fill="#1a1a1a" opacity="0.7" />
          <ellipse cx="42" cy="34" rx="7" ry="8" fill="#1a1a1a" opacity="0.7" />
          <circle cx="22" cy="33" r="2.5" fill="#ffffff" opacity="0.9" />
          <circle cx="42" cy="33" r="2.5" fill="#ffffff" opacity="0.9" />
          <ellipse cx="32" cy="44" rx="4" ry="3" fill="#1a1a1a" opacity="0.5" />
        </svg>
      );
    }
    if (animalType === 'lion') {
      return (
        <svg viewBox="0 0 64 64" className="w-full h-full" aria-hidden="true">
          <circle cx="32" cy="34" r="24" fill="#ffffff" opacity="0.2" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => {
            const rad = (angle * Math.PI) / 180;
            const x = 32 + Math.cos(rad) * 22;
            const y = 34 + Math.sin(rad) * 22;
            return <circle key={i} cx={x} cy={y} r="5" fill="#ffffff" opacity="0.25" />;
          })}
          <circle cx="32" cy="36" r="14" fill="#ffffff" opacity="0.35" />
          <circle cx="26" cy="34" r="3.5" fill="#1a1a1a" />
          <circle cx="38" cy="34" r="3.5" fill="#1a1a1a" />
          <path d="M28 44 Q32 48 36 44" stroke="#1a1a1a" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </svg>
      );
    }
    if (animalType === 'penguin') {
      return (
        <svg viewBox="0 0 64 64" className="w-full h-full" aria-hidden="true">
          <ellipse cx="32" cy="38" rx="16" ry="20" fill="#ffffff" opacity="0.3" />
          <ellipse cx="32" cy="40" rx="10" ry="14" fill="#ffffff" opacity="0.45" />
          <circle cx="26" cy="30" r="4" fill="#1a1a1a" />
          <circle cx="38" cy="30" r="4" fill="#1a1a1a" />
          <polygon points="32,36 28,42 36,42" fill="#f59e0b" opacity="0.9" />
          <ellipse cx="22" cy="48" rx="5" ry="3" fill="#f59e0b" opacity="0.7" transform="rotate(-20 22 48)" />
          <ellipse cx="42" cy="48" rx="5" ry="3" fill="#f59e0b" opacity="0.7" transform="rotate(20 42 48)" />
        </svg>
      );
    }
    if (animalType === 'frog') {
      return (
        <svg viewBox="0 0 64 64" className="w-full h-full" aria-hidden="true">
          <ellipse cx="32" cy="40" rx="20" ry="16" fill="#ffffff" opacity="0.3" />
          <circle cx="22" cy="24" r="8" fill="#ffffff" opacity="0.35" />
          <circle cx="42" cy="24" r="8" fill="#ffffff" opacity="0.35" />
          <circle cx="22" cy="24" r="4" fill="#1a1a1a" />
          <circle cx="42" cy="24" r="4" fill="#1a1a1a" />
          <circle cx="22" cy="23" r="1.5" fill="#ffffff" opacity="0.8" />
          <circle cx="42" cy="23" r="1.5" fill="#ffffff" opacity="0.8" />
          <path d="M26 46 Q32 50 38 46" stroke="#1a1a1a" strokeWidth="2" fill="none" strokeLinecap="round" />
        </svg>
      );
    }
  }

  // Emoji avatar
  if (styleType === 'emoji') {
    if (emojiType === 'happy') {
      return (
        <svg viewBox="0 0 64 64" className="w-full h-full" aria-hidden="true">
          <circle cx="32" cy="32" r="28" fill="#ffffff" opacity="0.2" />
          <circle cx="22" cy="28" r="5" fill="#1a1a1a" />
          <circle cx="42" cy="28" r="5" fill="#1a1a1a" />
          <path d="M18 42 Q32 54 46 42" stroke="#1a1a1a" strokeWidth="4" fill="none" strokeLinecap="round" />
        </svg>
      );
    }
    if (emojiType === 'cool') {
      return (
        <svg viewBox="0 0 64 64" className="w-full h-full" aria-hidden="true">
          <circle cx="32" cy="32" r="28" fill="#ffffff" opacity="0.2" />
          <rect x="12" y="24" width="18" height="8" rx="2" fill="#1a1a1a" />
          <rect x="34" y="24" width="18" height="8" rx="2" fill="#1a1a1a" />
          <path d="M18 42 Q32 50 46 42" stroke="#1a1a1a" strokeWidth="3" fill="none" strokeLinecap="round" />
        </svg>
      );
    }
    if (emojiType === 'love') {
      return (
        <svg viewBox="0 0 64 64" className="w-full h-full" aria-hidden="true">
          <circle cx="32" cy="32" r="28" fill="#ffffff" opacity="0.2" />
          <path d="M20 28 Q20 22 26 22 Q32 22 32 28 Q32 22 38 22 Q44 22 44 28 Q44 36 32 44 Q20 36 20 28" fill="#ff6b6b" opacity="0.8" />
        </svg>
      );
    }
    if (emojiType === 'surprised') {
      return (
        <svg viewBox="0 0 64 64" className="w-full h-full" aria-hidden="true">
          <circle cx="32" cy="32" r="28" fill="#ffffff" opacity="0.2" />
          <circle cx="22" cy="26" r="5" fill="#1a1a1a" />
          <circle cx="42" cy="26" r="5" fill="#1a1a1a" />
          <ellipse cx="32" cy="44" rx="6" ry="8" fill="#1a1a1a" />
        </svg>
      );
    }
    if (emojiType === 'thinking') {
      return (
        <svg viewBox="0 0 64 64" className="w-full h-full" aria-hidden="true">
          <circle cx="32" cy="32" r="28" fill="#ffffff" opacity="0.2" />
          <circle cx="22" cy="28" r="4" fill="#1a1a1a" />
          <circle cx="42" cy="28" r="4" fill="#1a1a1a" />
          <path d="M24 44 Q32 48 40 44" stroke="#1a1a1a" strokeWidth="2" fill="none" strokeLinecap="round" />
          <circle cx="50" cy="20" r="4" fill="#1a1a1a" opacity="0.5" />
          <circle cx="54" cy="14" r="2" fill="#1a1a1a" opacity="0.3" />
          <circle cx="56" cy="8" r="1" fill="#1a1a1a" opacity="0.2" />
        </svg>
      );
    }
    if (emojiType === 'wink') {
      return (
        <svg viewBox="0 0 64 64" className="w-full h-full" aria-hidden="true">
          <circle cx="32" cy="32" r="28" fill="#ffffff" opacity="0.2" />
          <circle cx="22" cy="28" r="5" fill="#1a1a1a" />
          <path d="M37 28 Q42 28 42 32 Q42 36 37 36" stroke="#1a1a1a" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M18 42 Q32 54 46 42" stroke="#1a1a1a" strokeWidth="4" fill="none" strokeLinecap="round" />
        </svg>
      );
    }
    if (emojiType === 'sad') {
      return (
        <svg viewBox="0 0 64 64" className="w-full h-full" aria-hidden="true">
          <circle cx="32" cy="32" r="28" fill="#ffffff" opacity="0.2" />
          <circle cx="22" cy="28" r="5" fill="#1a1a1a" />
          <circle cx="42" cy="28" r="5" fill="#1a1a1a" />
          <path d="M18 48 Q32 38 46 48" stroke="#1a1a1a" strokeWidth="3" fill="none" strokeLinecap="round" />
          <circle cx="46" cy="22" r="3" fill="#60a5fa" opacity="0.6" />
        </svg>
      );
    }
    if (emojiType === 'angry') {
      return (
        <svg viewBox="0 0 64 64" className="w-full h-full" aria-hidden="true">
          <circle cx="32" cy="32" r="28" fill="#ffffff" opacity="0.2" />
          <line x1="16" y1="22" x2="26" y2="26" stroke="#1a1a1a" strokeWidth="3" strokeLinecap="round" />
          <line x1="48" y1="22" x2="38" y2="26" stroke="#1a1a1a" strokeWidth="3" strokeLinecap="round" />
          <circle cx="22" cy="30" r="4" fill="#1a1a1a" />
          <circle cx="42" cy="30" r="4" fill="#1a1a1a" />
          <path d="M20 46 Q32 40 44 46" stroke="#1a1a1a" strokeWidth="3" fill="none" strokeLinecap="round" />
        </svg>
      );
    }
    if (emojiType === 'sleepy') {
      return (
        <svg viewBox="0 0 64 64" className="w-full h-full" aria-hidden="true">
          <circle cx="32" cy="32" r="28" fill="#ffffff" opacity="0.2" />
          <path d="M16 28 Q22 32 28 28" stroke="#1a1a1a" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M36 28 Q42 32 48 28" stroke="#1a1a1a" strokeWidth="3" fill="none" strokeLinecap="round" />
          <ellipse cx="32" cy="44" rx="4" ry="2" fill="#1a1a1a" />
          <text x="46" y="18" fontSize="8" fill="#1a1a1a" opacity="0.5">z</text>
          <text x="52" y="12" fontSize="6" fill="#1a1a1a" opacity="0.35">z</text>
        </svg>
      );
    }
  }

  // Abstract avatar
  if (styleType === 'abstract') {
    return (
      <svg viewBox="0 0 64 64" className="w-full h-full" aria-hidden="true">
        <defs>
          <linearGradient id="abstract-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.1" />
          </linearGradient>
        </defs>
        <circle cx="32" cy="32" r="28" fill="url(#abstract-grad)" />
        <path d="M20 32 Q32 16 44 32 Q32 48 20 32" fill="#ffffff" opacity="0.3" />
        <circle cx="32" cy="32" r="8" fill="#ffffff" opacity="0.4" />
        <circle cx="32" cy="32" r="4" fill="#ffffff" opacity="0.5" />
      </svg>
    );
  }

  // Neon avatar — cyberpunk glow
  if (styleType === 'neon') {
    const color = modernType === 'magenta' ? '#e879f9' : modernType === 'electric' ? '#60a5fa' : '#22d3ee';
    const glow = modernType === 'magenta' ? '#c026d3' : modernType === 'electric' ? '#3b82f6' : '#06b6d4';
    return (
      <svg viewBox="0 0 64 64" className="w-full h-full" aria-hidden="true">
        <defs>
          <filter id="neon-glow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <circle cx="32" cy="32" r="26" fill="none" stroke={glow} strokeWidth="1" opacity="0.3" />
        <circle cx="32" cy="32" r="22" fill="none" stroke={color} strokeWidth="2" opacity="0.6" filter="url(#neon-glow)" />
        <ellipse cx="32" cy="34" rx="14" ry="16" fill="none" stroke={color} strokeWidth="2.5" filter="url(#neon-glow)" />
        <circle cx="24" cy="30" r="3" fill={color} opacity="0.9" />
        <circle cx="40" cy="30" r="3" fill={color} opacity="0.9" />
        <path d="M24 42 Q32 48 40 42" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" filter="url(#neon-glow)" />
        {modernType === 'electric' && (
          <>
            <line x1="32" y1="8" x2="32" y2="14" stroke={color} strokeWidth="1.5" opacity="0.5" />
            <line x1="32" y1="50" x2="32" y2="56" stroke={color} strokeWidth="1.5" opacity="0.5" />
            <line x1="8" y1="32" x2="14" y2="32" stroke={color} strokeWidth="1.5" opacity="0.5" />
            <line x1="50" y1="32" x2="56" y2="32" stroke={color} strokeWidth="1.5" opacity="0.5" />
          </>
        )}
      </svg>
    );
  }

  // Geometric avatar — sharp angular modern
  if (styleType === 'geometric') {
    if (modernType === 'hex') {
      return (
        <svg viewBox="0 0 64 64" className="w-full h-full" aria-hidden="true">
          <polygon points="32,6 54,18 54,46 32,58 10,46 10,18" fill="#ffffff" opacity="0.12" stroke="#fbbf24" strokeWidth="2" />
          <polygon points="32,14 46,22 46,42 32,50 18,42 18,22" fill="#fbbf24" opacity="0.2" />
          <circle cx="32" cy="32" r="6" fill="#fbbf24" opacity="0.6" />
        </svg>
      );
    }
    if (modernType === 'prism') {
      return (
        <svg viewBox="0 0 64 64" className="w-full h-full" aria-hidden="true">
          <polygon points="32,8 52,52 12,52" fill="#ffffff" opacity="0.1" stroke="#fb7185" strokeWidth="2" />
          <polygon points="32,16 44,48 20,48" fill="#fb7185" opacity="0.25" />
          <line x1="32" y1="16" x2="32" y2="48" stroke="#ffffff" strokeWidth="1" opacity="0.3" />
        </svg>
      );
    }
    return (
      <svg viewBox="0 0 64 64" className="w-full h-full" aria-hidden="true">
        <polygon points="32,6 56,32 32,58 8,32" fill="#ffffff" opacity="0.1" stroke="#2dd4bf" strokeWidth="2" />
        <polygon points="32,14 48,32 32,50 16,32" fill="#2dd4bf" opacity="0.25" />
        <circle cx="32" cy="32" r="4" fill="#ffffff" opacity="0.5" />
      </svg>
    );
  }

  // Glass avatar — glassmorphism
  if (styleType === 'glass') {
    if (modernType === 'bubbles') {
      return (
        <svg viewBox="0 0 64 64" className="w-full h-full" aria-hidden="true">
          <circle cx="28" cy="28" r="14" fill="#ffffff" fillOpacity="0.15" stroke="#ffffff" strokeWidth="1" strokeOpacity="0.3" />
          <circle cx="40" cy="36" r="10" fill="#ffffff" fillOpacity="0.12" stroke="#ffffff" strokeWidth="1" strokeOpacity="0.25" />
          <circle cx="22" cy="40" r="8" fill="#ffffff" fillOpacity="0.1" stroke="#ffffff" strokeWidth="1" strokeOpacity="0.2" />
          <ellipse cx="28" cy="26" rx="6" ry="3" fill="#ffffff" opacity="0.25" transform="rotate(-30 28 26)" />
          <ellipse cx="40" cy="34" rx="4" ry="2" fill="#ffffff" opacity="0.2" transform="rotate(-20 40 34)" />
        </svg>
      );
    }
    return (
      <svg viewBox="0 0 64 64" className="w-full h-full" aria-hidden="true">
        <circle cx="32" cy="32" r="24" fill="#ffffff" fillOpacity="0.08" stroke="#ffffff" strokeWidth="1.5" strokeOpacity="0.35" />
        <circle cx="32" cy="32" r="18" fill="#ffffff" opacity="0.12" />
        <ellipse cx="26" cy="24" rx="10" ry="5" fill="#ffffff" opacity="0.2" transform="rotate(-25 26 24)" />
        <circle cx="32" cy="32" r="6" fill="#ffffff" opacity="0.3" />
      </svg>
    );
  }

  // Wave avatar — fluid organic blobs
  if (styleType === 'wave') {
    if (modernType === 'ripple') {
      return (
        <svg viewBox="0 0 64 64" className="w-full h-full" aria-hidden="true">
          <circle cx="32" cy="32" r="26" fill="none" stroke="#ffffff" strokeWidth="1" opacity="0.15" />
          <circle cx="32" cy="32" r="20" fill="none" stroke="#ffffff" strokeWidth="1.5" opacity="0.25" />
          <circle cx="32" cy="32" r="14" fill="none" stroke="#ffffff" strokeWidth="2" opacity="0.35" />
          <circle cx="32" cy="32" r="8" fill="#ffffff" opacity="0.4" />
          <path d="M8 32 Q16 24 24 32 Q32 40 40 32 Q48 24 56 32" stroke="#ffffff" strokeWidth="2" fill="none" opacity="0.3" />
        </svg>
      );
    }
    return (
      <svg viewBox="0 0 64 64" className="w-full h-full" aria-hidden="true">
        <path d="M12 40 C12 20, 28 12, 32 20 C36 12, 52 20, 52 40 C52 52, 32 58, 12 40 Z" fill="#ffffff" opacity="0.25" />
        <path d="M18 38 C18 24, 30 18, 32 24 C34 18, 46 24, 46 38 C46 46, 32 50, 18 38 Z" fill="#ffffff" opacity="0.35" />
        <circle cx="26" cy="32" r="3" fill="#ffffff" opacity="0.6" />
        <circle cx="38" cy="32" r="3" fill="#ffffff" opacity="0.6" />
      </svg>
    );
  }

  // Holographic avatar — iridescent prism
  if (styleType === 'holo') {
    if (modernType === 'shards') {
      return (
        <svg viewBox="0 0 64 64" className="w-full h-full" aria-hidden="true">
          <defs>
            <linearGradient id="holo-shard-1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.7" />
              <stop offset="50%" stopColor="#fbbf24" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#84cc16" stopOpacity="0.5" />
            </linearGradient>
          </defs>
          <polygon points="32,8 48,24 40,48 24,48 16,24" fill="url(#holo-shard-1)" />
          <polygon points="32,14 42,26 36,44 28,44 22,26" fill="#ffffff" opacity="0.15" />
          <line x1="32" y1="8" x2="32" y2="48" stroke="#ffffff" strokeWidth="0.5" opacity="0.3" />
          <line x1="16" y1="24" x2="48" y2="24" stroke="#ffffff" strokeWidth="0.5" opacity="0.2" />
        </svg>
      );
    }
    return (
      <svg viewBox="0 0 64 64" className="w-full h-full" aria-hidden="true">
        <defs>
          <linearGradient id="holo-rainbow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.8" />
            <stop offset="33%" stopColor="#ec4899" stopOpacity="0.7" />
            <stop offset="66%" stopColor="#06b6d4" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.8" />
          </linearGradient>
        </defs>
        <circle cx="32" cy="32" r="24" fill="url(#holo-rainbow)" />
        <ellipse cx="32" cy="28" rx="16" ry="6" fill="#ffffff" opacity="0.2" transform="rotate(-20 32 28)" />
        <circle cx="32" cy="32" r="8" fill="#ffffff" opacity="0.25" />
      </svg>
    );
  }

  // Wireframe avatar — 3D mesh
  if (styleType === 'wireframe') {
    const color = modernType === 'globe' ? '#38bdf8' : '#34d399';
    if (modernType === 'globe') {
      return (
        <svg viewBox="0 0 64 64" className="w-full h-full" aria-hidden="true">
          <ellipse cx="32" cy="32" rx="24" ry="24" fill="none" stroke={color} strokeWidth="1" opacity="0.5" />
          <ellipse cx="32" cy="32" rx="24" ry="12" fill="none" stroke={color} strokeWidth="0.8" opacity="0.35" />
          <ellipse cx="32" cy="32" rx="24" ry="6" fill="none" stroke={color} strokeWidth="0.6" opacity="0.25" />
          <ellipse cx="32" cy="32" rx="12" ry="24" fill="none" stroke={color} strokeWidth="0.8" opacity="0.35" />
          <ellipse cx="32" cy="32" rx="6" ry="24" fill="none" stroke={color} strokeWidth="0.6" opacity="0.25" />
          <line x1="8" y1="32" x2="56" y2="32" stroke={color} strokeWidth="0.8" opacity="0.3" />
        </svg>
      );
    }
    return (
      <svg viewBox="0 0 64 64" className="w-full h-full" aria-hidden="true">
        <circle cx="32" cy="32" r="22" fill="none" stroke={color} strokeWidth="1" opacity="0.4" />
        {[0, 30, 60, 90, 120, 150].map((angle, i) => {
          const rad = (angle * Math.PI) / 180;
          const x2 = 32 + Math.cos(rad) * 22;
          const y2 = 32 + Math.sin(rad) * 22;
          return <line key={i} x1="32" y1="32" x2={x2} y2={y2} stroke={color} strokeWidth="0.8" opacity="0.35" />;
        })}
        <circle cx="32" cy="32" r="8" fill="none" stroke={color} strokeWidth="1.2" opacity="0.6" />
        <circle cx="32" cy="32" r="3" fill={color} opacity="0.5" />
      </svg>
    );
  }

  // Pixel avatar
  if (styleType === 'pixel') {
    return (
      <svg viewBox="0 0 64 64" className="w-full h-full" aria-hidden="true">
        <rect x="16" y="16" width="8" height="8" fill="#ffffff" opacity="0.3" />
        <rect x="24" y="16" width="8" height="8" fill="#ffffff" opacity="0.4" />
        <rect x="32" y="16" width="8" height="8" fill="#ffffff" opacity="0.3" />
        <rect x="40" y="16" width="8" height="8" fill="#ffffff" opacity="0.3" />
        <rect x="16" y="24" width="8" height="8" fill="#ffffff" opacity="0.4" />
        <rect x="24" y="24" width="8" height="8" fill="#ffffff" opacity="0.5" />
        <rect x="32" y="24" width="8" height="8" fill="#ffffff" opacity="0.4" />
        <rect x="40" y="24" width="8" height="8" fill="#ffffff" opacity="0.4" />
        <rect x="24" y="32" width="8" height="8" fill="#ffffff" opacity="0.3" />
        <rect x="32" y="32" width="8" height="8" fill="#ffffff" opacity="0.3" />
        <rect x="40" y="32" width="8" height="8" fill="#ffffff" opacity="0.3" />
        <rect x="24" y="40" width="8" height="8" fill="#ffffff" opacity="0.2" />
        <rect x="32" y="40" width="8" height="8" fill="#ffffff" opacity="0.2" />
        <rect x="40" y="40" width="8" height="8" fill="#ffffff" opacity="0.2" />
      </svg>
    );
  }

  // Default fallback
  return (
    <svg viewBox="0 0 64 64" className="w-full h-full" aria-hidden="true">
      <circle cx="32" cy="32" r="28" fill="#ffffff" opacity="0.2" />
      <circle cx="32" cy="32" r="16" fill="#ffffff" opacity="0.3" />
      <circle cx="32" cy="32" r="8" fill="#ffffff" opacity="0.4" />
    </svg>
  );
});

export default AvatarFace;
