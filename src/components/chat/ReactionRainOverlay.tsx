import React, { useEffect, useState } from 'react';
import type { ReactionRainDetail } from '@/lib/funFeatures';

interface Drop {
  id: number;
  emoji: string;
  left: number;
  delay: number;
  duration: number;
}

export default function ReactionRainOverlay({ burst }: { burst: ReactionRainDetail | null }) {
  const [drops, setDrops] = useState<Drop[]>([]);

  useEffect(() => {
    if (!burst) return;
    const next: Drop[] = Array.from({ length: 18 }, (_, i) => ({
      id: burst.at + i,
      emoji: burst.emoji,
      left: 5 + Math.random() * 90,
      delay: Math.random() * 0.6,
      duration: 1.4 + Math.random() * 1.2,
    }));
    setDrops(next);
    const t = setTimeout(() => setDrops([]), 2800);
    return () => clearTimeout(t);
  }, [burst]);

  if (!drops.length) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden" aria-hidden>
      {drops.map(d => (
        <span
          key={d.id}
          className="absolute text-2xl animate-[reaction-fall_linear_forwards]"
          style={{
            left: `${d.left}%`,
            top: '-10%',
            animationDelay: `${d.delay}s`,
            animationDuration: `${d.duration}s`,
          }}
        >
          {d.emoji}
        </span>
      ))}
      <style>{`
        @keyframes reaction-fall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(40deg); opacity: 0.15; }
        }
      `}</style>
    </div>
  );
}
