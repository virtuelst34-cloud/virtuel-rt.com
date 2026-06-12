import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import UserProfileView from '@/components/chat/UserProfileView';
import { TestProviders } from '@/test/utils/testProviders';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <TestProviders>{children}</TestProviders>
);

describe('UserProfileView component', () => {
  const mockOnClose = vi.fn();
  const mockOnOpenDM = vi.fn();

  it('should render without crashing', () => {
    const { container } = render(
      <UserProfileView targetName="TestUser" onClose={mockOnClose} onOpenDM={mockOnOpenDM} />,
      { wrapper }
    );
    expect(container).toBeInTheDocument();
  });

  it('should display user name', () => {
    render(
      <UserProfileView targetName="TestUser" onClose={mockOnClose} onOpenDM={mockOnOpenDM} />,
      { wrapper }
    );
    expect(screen.getByText('TestUser')).toBeInTheDocument();
  });

  it('should have accessibility attributes', () => {
    render(
      <UserProfileView targetName="TestUser" onClose={mockOnClose} onOpenDM={mockOnOpenDM} />,
      { wrapper }
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('should call onClose when close button is clicked', () => {
    render(
      <UserProfileView targetName="TestUser" onClose={mockOnClose} onOpenDM={mockOnOpenDM} />,
      { wrapper }
    );
    const closeButton = screen.getByLabelText('Fermer le profil');
    closeButton.click();
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should call onOpenDM when message button is clicked', () => {
    render(
      <UserProfileView targetName="TestUser" onClose={mockOnClose} onOpenDM={mockOnOpenDM} />,
      { wrapper }
    );
    const messageButton = screen.getByLabelText(/Envoyer un message à TestUser/i);
    messageButton.click();
    expect(mockOnOpenDM).toHaveBeenCalledWith('TestUser');
  });

  it('should have progress bar with accessibility attributes', () => {
    render(
      <UserProfileView targetName="TestUser" onClose={mockOnClose} onOpenDM={mockOnOpenDM} />,
      { wrapper }
    );
    const progressbar = screen.getByRole('progressbar');
    expect(progressbar).toHaveAttribute('aria-label');
    expect(progressbar).toHaveAttribute('aria-valuemin', '0');
    expect(progressbar).toHaveAttribute('aria-valuemax', '100');
  });
});
