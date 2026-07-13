import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ChatInput from '@/components/chat/ChatInput';
import { TestProviders } from '@/test/utils/testProviders';

describe('ChatInput keyboard navigation', () => {
  const mockOnSend = vi.fn();
  const mockOnTyping = vi.fn();
  const mockOnCancelReply = vi.fn();

  const defaultProps = {
    onSend: mockOnSend,
    onTyping: mockOnTyping,
    disabled: false,
    replyTo: null,
    onCancelReply: mockOnCancelReply,
    members: [],
  };

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <TestProviders>{children}</TestProviders>
  );

  it('should send message on Enter key', () => {
    render(<ChatInput {...defaultProps} />, { wrapper });

    const textarea = screen.getByPlaceholderText(/Envoyer un message/i);
    fireEvent.change(textarea, { target: { value: 'Test message' } });
    fireEvent.keyDown(textarea, { key: 'Enter' });

    expect(mockOnSend).toHaveBeenCalledWith('Test message', null, null, null);
  });

  it('should be focusable with Tab key', () => {
    render(<ChatInput {...defaultProps} />, { wrapper });

    const textarea = screen.getByPlaceholderText(/Envoyer un message/i);
    textarea.focus();
    expect(document.activeElement).toBe(textarea);
  });
});
