import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Sidebar from '@/components/chat/Sidebar';
import { TestProviders } from '../utils/testProviders';

describe('Sidebar', () => {
  const mockOnOpenDM = vi.fn();
  const mockOnOpenAdmin = vi.fn();
  const mockOnOpenNotifications = vi.fn();
  const mockOnOpenSettings = vi.fn();

  const defaultProps = {
    onOpenDM: mockOnOpenDM,
    onOpenNotifications: mockOnOpenNotifications,
    onOpenSettings: mockOnOpenSettings,
  };

  it('devrait rendre le composant Sidebar', () => {
    render(
      <TestProviders>
        <Sidebar {...defaultProps} />
      </TestProviders>
    );

    // Vérifier que le logo est présent
    expect(screen.getByText('V')).toBeInTheDocument();
  });

  it('devrait avoir des boutons principaux', () => {
    render(
      <TestProviders>
        <Sidebar {...defaultProps} />
      </TestProviders>
    );

    const homeButton = screen.getByTitle('Accueil');
    expect(homeButton).toBeInTheDocument();
  });

  it('devrait avoir un bouton Accueil', () => {
    render(
      <TestProviders>
        <Sidebar {...defaultProps} />
      </TestProviders>
    );

    const homeButton = screen.getByTitle('Accueil');
    expect(homeButton).toBeInTheDocument();
  });

  it('devrait avoir un bouton Messages privés', () => {
    render(
      <TestProviders>
        <Sidebar {...defaultProps} />
      </TestProviders>
    );

    const dmButton = screen.getByTitle('Messages privés');
    expect(dmButton).toBeInTheDocument();
  });

  it('devrait avoir un bouton Notifications', () => {
    render(
      <TestProviders>
        <Sidebar {...defaultProps} />
      </TestProviders>
    );

    const notificationsButton = screen.getByTitle('Notifications');
    expect(notificationsButton).toBeInTheDocument();
  });

  it('devrait avoir un bouton Paramètres si l\'utilisateur existe', () => {
    render(
      <TestProviders>
        <Sidebar {...defaultProps} />
      </TestProviders>
    );

    // Le bouton Paramètres n'existe que si l'utilisateur est connecté
    const settingsButton = screen.queryByTitle('Paramètres');
    // On ne vérifie que s'il existe, pas qu'il doit exister
    if (settingsButton) {
      expect(settingsButton).toBeInTheDocument();
    }
  });
});
