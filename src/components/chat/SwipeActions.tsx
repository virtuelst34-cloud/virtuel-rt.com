import React, { useState, useRef, TouchEvent } from 'react';
import { Reply, Trash2, User, ChevronLeft, ChevronRight } from 'lucide-react';

export interface SwipeAction {
  icon: React.ReactNode;
  label: string;
  color: string;
  action: () => void;
}

interface SwipeableMessageProps {
  children: React.ReactNode;
  onReply?: () => void;
  onDelete?: () => void;
  onProfile?: () => void;
  canDelete?: boolean;
  canReply?: boolean;
  canViewProfile?: boolean;
}

export function SwipeableMessage({
  children,
  onReply,
  onDelete,
  onProfile,
  canDelete = true,
  canReply = true,
  canViewProfile = true
}: SwipeableMessageProps) {
  const [translateX, setTranslateX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const SWIPE_THRESHOLD = 100;
  const MAX_SWIPE = 150;

  const handleTouchStart = (e: TouchEvent) => {
    setIsDragging(true);
    setStartX(e.touches[0].clientX);
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isDragging) return;

    const currentX = e.touches[0].clientX;
    const diff = currentX - startX;
    
    // Limiter le swipe
    const clampedDiff = Math.max(-MAX_SWIPE, Math.min(MAX_SWIPE, diff));
    setTranslateX(clampedDiff);
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;

    setIsDragging(false);

    // Swipe vers la droite (répondre)
    if (translateX > SWIPE_THRESHOLD && canReply && onReply) {
      onReply();
    }
    // Swipe vers la gauche (supprimer)
    else if (translateX < -SWIPE_THRESHOLD && canDelete && onDelete) {
      onDelete();
    }
    // Swipe long vers la gauche (profil)
    else if (translateX < -SWIPE_THRESHOLD * 1.5 && canViewProfile && onProfile) {
      onProfile();
    }

    setTranslateX(0);
  };

  const getLeftAction = () => {
    if (canReply && onReply) {
      return {
        icon: <Reply className="w-5 h-5" />,
        label: 'Répondre',
        color: 'bg-blue-500'
      };
    }
    return null;
  };

  const getRightAction = () => {
    if (canDelete && onDelete) {
      return {
        icon: <Trash2 className="w-5 h-5" />,
        label: 'Supprimer',
        color: 'bg-red-500'
      };
    }
    if (canViewProfile && onProfile) {
      return {
        icon: <User className="w-5 h-5" />,
        label: 'Profil',
        color: 'bg-purple-500'
      };
    }
    return null;
  };

  const leftAction = getLeftAction();
  const rightAction = getRightAction();

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Actions de fond */}
      <div className="absolute inset-0 flex">
        {/* Action gauche (répondre) */}
        {leftAction && (
          <div
            className={`flex items-center justify-center gap-2 ${leftAction.color} text-white transition-all duration-200`}
            style={{
              width: `${Math.max(0, translateX)}px`,
              opacity: translateX / MAX_SWIPE
            }}
          >
            {leftAction.icon}
            <span className="text-sm font-medium">{leftAction.label}</span>
          </div>
        )}

        {/* Action droite (supprimer/profil) */}
        {rightAction && (
          <div
            className={`flex-1 flex items-center justify-end gap-2 ${rightAction.color} text-white transition-all duration-200`}
            style={{
              opacity: Math.abs(translateX) / MAX_SWIPE
            }}
          >
            <span className="text-sm font-medium">{rightAction.label}</span>
            {rightAction.icon}
          </div>
        )}
      </div>

      {/* Contenu */}
      <div
        className="relative bg-card transition-transform duration-200"
        style={{
          transform: `translateX(${translateX}px)`
        }}
      >
        {children}
      </div>
    </div>
  );
}

// Version desktop avec boutons visibles
interface DesktopSwipeActionsProps {
  children: React.ReactNode;
  onReply?: () => void;
  onDelete?: () => void;
  onProfile?: () => void;
  canDelete?: boolean;
  canReply?: boolean;
  canViewProfile?: boolean;
}

export function DesktopSwipeActions({
  children,
  onReply,
  onDelete,
  onProfile,
  canDelete = true,
  canReply = true,
  canViewProfile = true
}: DesktopSwipeActionsProps) {
  const [showActions, setShowActions] = useState(false);

  return (
    <div
      className="relative group"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Actions flottantes */}
      {showActions && (
        <div className="absolute right-0 top-1/2 -translate-y-1/2 flex gap-1 z-10">
          {canReply && onReply && (
            <button
              onClick={onReply}
              className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              title="Répondre"
            >
              <Reply className="w-4 h-4" />
            </button>
          )}
          {canViewProfile && onProfile && (
            <button
              onClick={onProfile}
              className="p-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
              title="Voir le profil"
            >
              <User className="w-4 h-4" />
            </button>
          )}
          {canDelete && onDelete && (
            <button
              onClick={onDelete}
              className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              title="Supprimer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {children}
    </div>
  );
}

// Composant détectant si on est sur mobile ou desktop
export function ResponsiveSwipeActions(props: SwipeableMessageProps) {
  const [isMobile, setIsMobile] = useState(true);

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (isMobile) {
    return <SwipeableMessage {...props} />;
  }

  return <DesktopSwipeActions {...props} />;
}
