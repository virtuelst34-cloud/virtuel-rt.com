import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import LevelUpToast from '@/components/chat/LevelUpToast';

describe('LevelUpToast component', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should render without crashing', () => {
    const { container } = render(<LevelUpToast level={5} />);
    expect(container).toBeInTheDocument();
  });

  it('should display level number', () => {
    render(<LevelUpToast level={10} />);
    expect(screen.getByText(/Niveau 10 atteint/i)).toBeInTheDocument();
  });

  it('should have accessibility attributes', () => {
    render(<LevelUpToast level={5} />);
    const toast = screen.getByRole('alert');
    expect(toast).toHaveAttribute('aria-live', 'polite');
    expect(toast).toHaveAttribute('aria-atomic', 'true');
  });

  it('should call onDone after timeout', () => {
    const onDone = vi.fn();
    render(<LevelUpToast level={5} onDone={onDone} />);
    
    vi.advanceTimersByTime(3000);
    vi.advanceTimersByTime(400);
    
    expect(onDone).toHaveBeenCalled();
  });
});
