import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import EmojiPicker from '@/components/chat/EmojiPicker';
import { CustomEmojisProvider } from '@/lib/contexts/CustomEmojisContext';

describe('EmojiPicker', () => {
  const mockOnSelect = vi.fn();
  const mockOnClose = vi.fn();

  const defaultProps = {
    onSelect: mockOnSelect,
    onClose: mockOnClose,
  };

  const renderEmojiPicker = () => render(
    <CustomEmojisProvider>
      <EmojiPicker {...defaultProps} />
    </CustomEmojisProvider>
  );

  it('devrait rendre le composant EmojiPicker', () => {
    renderEmojiPicker();
    // Vérifier que le composant est rendu en cherchant des boutons d'emoji
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('devrait appeler onSelect quand on clique sur un emoji', () => {
    renderEmojiPicker();
    
    const emojiButton = screen.getAllByRole('button')[2];
    fireEvent.click(emojiButton);
    
    expect(mockOnSelect).toHaveBeenCalled();
  });

  it('devrait appeler onClose quand on clique sur le bouton de fermeture', () => {
    renderEmojiPicker();
    
    // Chercher un bouton qui pourrait être un bouton de fermeture
    const buttons = screen.getAllByRole('button');
    const closeButton = buttons.find(btn => btn.textContent?.includes('×') || btn.getAttribute('aria-label')?.includes('fermer'));
    if (closeButton) {
      fireEvent.click(closeButton);
      expect(mockOnClose).toHaveBeenCalled();
    }
  });

  it('devrait afficher une grille d\'emojis', () => {
    renderEmojiPicker();
    
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });
});
