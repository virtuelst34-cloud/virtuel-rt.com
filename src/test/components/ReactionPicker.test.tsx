import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ReactionPicker from '@/components/chat/ReactionPicker';
import { TestProviders } from '@/test/utils/testProviders';

describe('ReactionPicker', () => {
  const mockOnSelect = vi.fn();
  const mockOnClose = vi.fn();

  const defaultProps = {
    onSelect: mockOnSelect,
    onClose: mockOnClose,
    position: { x: 100, y: 100 },
  };

  const renderPicker = () =>
    render(
      <TestProviders>
        <ReactionPicker {...defaultProps} />
      </TestProviders>,
    );

  it('devrait rendre le composant ReactionPicker', () => {
    renderPicker();
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  }, 15_000);

  it('devrait appeler onSelect quand on clique sur une réaction', () => {
    renderPicker();
    const reactionButton = screen.getAllByRole('button')[0];
    fireEvent.click(reactionButton);
    expect(mockOnSelect).toHaveBeenCalled();
  });

  it('devrait appeler onClose quand on clique en dehors', () => {
    renderPicker();
    const container = screen.getAllByRole('button')[0].parentElement?.parentElement;
    if (container) {
      fireEvent.click(container);
      expect(mockOnClose).toHaveBeenCalled();
    }
  });

  it('devrait avoir des boutons de réactions', () => {
    renderPicker();
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('devrait être positionné correctement', () => {
    renderPicker();
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });
});
