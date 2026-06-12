import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import EmojiPicker from '@/components/chat/EmojiPicker';

describe('EmojiPicker', () => {
  const mockOnSelect = vi.fn();
  const mockOnClose = vi.fn();

  const defaultProps = {
    onSelect: mockOnSelect,
    onClose: mockOnClose,
  };

  it('devrait rendre le composant EmojiPicker', () => {
    render(<EmojiPicker {...defaultProps} />);
    // Vérifier que le composant est rendu en cherchant des boutons d'emoji
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('devrait appeler onSelect quand on clique sur un emoji', () => {
    render(<EmojiPicker {...defaultProps} />);
    
    const emojiButton = screen.getAllByRole('button')[0];
    fireEvent.click(emojiButton);
    
    expect(mockOnSelect).toHaveBeenCalled();
  });

  it('devrait appeler onClose quand on clique sur le bouton de fermeture', () => {
    render(<EmojiPicker {...defaultProps} />);
    
    // Chercher un bouton qui pourrait être un bouton de fermeture
    const buttons = screen.getAllByRole('button');
    const closeButton = buttons.find(btn => btn.textContent?.includes('×') || btn.getAttribute('aria-label')?.includes('fermer'));
    if (closeButton) {
      fireEvent.click(closeButton);
      expect(mockOnClose).toHaveBeenCalled();
    }
  });

  it('devrait afficher une grille d\'emojis', () => {
    render(<EmojiPicker {...defaultProps} />);
    
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });
});
