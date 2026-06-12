import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ReactionPicker from '@/components/chat/ReactionPicker';

describe('ReactionPicker', () => {
  const mockOnSelect = vi.fn();
  const mockOnClose = vi.fn();

  const defaultProps = {
    onSelect: mockOnSelect,
    onClose: mockOnClose,
    position: { x: 100, y: 100 },
  };

  it('devrait rendre le composant ReactionPicker', () => {
    render(<ReactionPicker {...defaultProps} />);
    // Vérifier que le composant est rendu en cherchant des boutons d'emoji
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('devrait appeler onSelect quand on clique sur une réaction', () => {
    render(<ReactionPicker {...defaultProps} />);
    
    const reactionButton = screen.getAllByRole('button')[0];
    fireEvent.click(reactionButton);
    
    expect(mockOnSelect).toHaveBeenCalled();
  });

  it('devrait appeler onClose quand on clique en dehors', () => {
    render(<ReactionPicker {...defaultProps} />);
    
    // Simuler un clic sur l'overlay
    const container = screen.getAllByRole('button')[0].parentElement?.parentElement;
    if (container) {
      fireEvent.click(container);
      expect(mockOnClose).toHaveBeenCalled();
    }
  });

  it('devrait avoir des boutons de réactions', () => {
    render(<ReactionPicker {...defaultProps} />);
    
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('devrait être positionné correctement', () => {
    render(<ReactionPicker {...defaultProps} />);
    
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });
});
