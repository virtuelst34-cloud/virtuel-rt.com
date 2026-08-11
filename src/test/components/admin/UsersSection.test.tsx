import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import UsersSection from '@/components/chat/admin/UsersSection'
import { TestProviders } from '@/test/utils/testProviders'

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <TestProviders>{children}</TestProviders>
)

describe('UsersSection component', () => {
  it('should render without crashing', () => {
    const { container } = render(<UsersSection />, { wrapper })
    expect(container).toBeInTheDocument()
  })

  it('should render section title', () => {
    render(<UsersSection />, { wrapper })
    expect(screen.getByText(/Gestion des utilisateurs/i)).toBeInTheDocument()
  })

  it('should render statistics cards', () => {
    render(<UsersSection />, { wrapper })
    expect(screen.getByText(/Actifs/i)).toBeInTheDocument()
    expect(screen.getAllByText(/Bannis/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText(/Total/i)).toBeInTheDocument()
  })

  it('should render search input', () => {
    render(<UsersSection />, { wrapper })
    expect(screen.getByPlaceholderText(/Rechercher un utilisateur/i)).toBeInTheDocument()
  })

  it('should filter users when typing in search', () => {
    render(<UsersSection />, { wrapper })
    const searchInput = screen.getByPlaceholderText(/Rechercher un utilisateur/i)
    fireEvent.change(searchInput, { target: { value: 'test' } })
    expect(searchInput).toHaveValue('test')
  })

  it('should show message when no profiles found', () => {
    render(<UsersSection />, { wrapper })
    const searchInput = screen.getByPlaceholderText(/Rechercher un utilisateur/i)
    fireEvent.change(searchInput, { target: { value: 'nonexistentuser12345' } })
    expect(screen.getByText(/Aucun profil trouvé/i)).toBeInTheDocument()
  })

  it('should render filter chips', () => {
    render(<UsersSection />, { wrapper })
    expect(screen.getByRole('button', { name: /^Tous$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^En ligne$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Bannis$/i })).toBeInTheDocument()
  })

  it('should render compact user rows with icon actions', () => {
    const profiles = {
      Alice: {
        name: 'Alice',
        avatar: 'default',
        initials: 'A',
        level: 2,
        xp: 100,
        status: 'online',
        isBanned: false,
        isMuted: false,
        isPremium: false,
        specialBadges: [],
      },
    }
    const noop = vi.fn()
    render(
      <UsersSection
        profiles={profiles}
        setProfiles={noop}
        banUser={noop}
        unbanUser={noop}
        muteUser={noop}
        unmuteUser={noop}
      />,
      { wrapper }
    )
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.queryByText(/Ne pas déranger/i)).not.toBeInTheDocument()
    expect(screen.getByTitle(/Badge spécial/i)).toBeInTheDocument()
    expect(screen.getByTitle(/Accorder Premium/i)).toBeInTheDocument()
    expect(screen.getByTitle(/Bannir/i)).toBeInTheDocument()
    expect(screen.getByTitle(/Muter/i)).toBeInTheDocument()
    expect(screen.getByTitle(/Retirer de la liste/i)).toBeInTheDocument()
  })
})
