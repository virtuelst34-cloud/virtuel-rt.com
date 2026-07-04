import React, { useState } from 'react';

const QUICK_REACTIONS = ['👍', '❤️', '😂', '🔥', '🎉', '😮', '😢', '👏'];

interface QuickReactionsProps {
  onReaction: (emoji: string) => void;
  onClose?: () => void;
}

export function QuickReactions({ onReaction, onClose }: QuickReactionsProps) {
  const [isVisible, setIsVisible] = useState(true);

  const handleReaction = (emoji: string) => {
    onReaction(emoji);
    setIsVisible(false);
    onClose?.();
  };

  if (!isVisible) return null;

  return (
    <div className="bg-card border border-border rounded-xl shadow-lg p-2 animate-fade-in">
      <div className="grid grid-cols-4 gap-1">
        {QUICK_REACTIONS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => handleReaction(emoji)}
            className="w-10 h-10 text-2xl hover:bg-secondary rounded-lg transition-colors flex items-center justify-center"
            title={emoji}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}

interface QuickReactionButtonProps {
  onReaction: (emoji: string) => void;
}

export function QuickReactionButton({ onReaction }: QuickReactionButtonProps) {
  const [showPicker, setShowPicker] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setShowPicker(!showPicker)}
        className="p-2 hover:bg-secondary rounded-lg transition-colors"
        title="Réactions rapides"
      >
        <span className="text-xl">😊</span>
      </button>
      
      {showPicker && (
        <div className="absolute bottom-full left-0 mb-2 z-50">
          <QuickReactions
            onReaction={onReaction}
            onClose={() => setShowPicker(false)}
          />
        </div>
      )}
    </div>
  );
}
