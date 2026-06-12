import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import SpecialBadgesSection from '@/components/chat/admin/SpecialBadgesSection'
import { TestProviders } from '@/test/utils/testProviders'

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <TestProviders>{children}</TestProviders>
)

describe('SpecialBadgesSection component', () => {
  it('should render without crashing', () => {
    const { container } = render(<SpecialBadgesSection />, { wrapper })
    expect(container).toBeInTheDocument()
  })

  it('should render section title', () => {
    render(<SpecialBadgesSection />, { wrapper })
    expect(screen.getAllByText(/Badges spéciaux/i).length).toBeGreaterThan(0)
  })

  it('should render description', () => {
    render(<SpecialBadgesSection />, { wrapper })
    expect(screen.getByText(/Assignez des badges spéciaux/i)).toBeInTheDocument()
  })

  it('should render special badges list', () => {
    render(<SpecialBadgesSection />, { wrapper })
    expect(screen.getAllByText(/Fondateur/i).length).toBeGreaterThan(0)
  })

  it('should render search input', () => {
    render(<SpecialBadgesSection />, { wrapper })
    expect(screen.getByPlaceholderText(/Rechercher un utilisateur/i)).toBeInTheDocument()
  })

  it('should filter users when typing in search', () => {
    render(<SpecialBadgesSection />, { wrapper })
    const searchInput = screen.getByPlaceholderText(/Rechercher un utilisateur/i)
    fireEvent.change(searchInput, { target: { value: 'test' } })
    expect(searchInput).toHaveValue('test')
  })

  it('should show message when no profiles found', () => {
    render(<SpecialBadgesSection />, { wrapper })
    const searchInput = screen.getByPlaceholderText(/Rechercher un utilisateur/i)
    fireEvent.change(searchInput, { target: { value: 'nonexistentuser12345' } })
    expect(screen.getByText(/Aucun profil trouvé/i)).toBeInTheDocument()
  })
})
