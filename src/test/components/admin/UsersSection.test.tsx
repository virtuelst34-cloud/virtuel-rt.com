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
    expect(screen.getByText(/Bannis/i)).toBeInTheDocument()
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
})
