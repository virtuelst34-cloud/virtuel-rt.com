import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import AdminPanel from '@/components/chat/AdminPanel'
import { TestProviders } from '@/test/utils/testProviders'

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <TestProviders>{children}</TestProviders>
)

describe('AdminPanel component', () => {
  it('should render without crashing', () => {
    render(<AdminPanel />, { wrapper })
    expect(screen.getByRole('dialog', { name: /Panneau d'administration/i })).toBeInTheDocument()
  })

  it('should render admin panel header', () => {
    render(<AdminPanel />, { wrapper })
    expect(screen.getByText(/Panneau d'administration/i)).toBeInTheDocument()
  })

  it('should render tabs', () => {
    render(<AdminPanel />, { wrapper })
    // Hub téléphone + rail desktop peuvent coexister en DOM (CSS sm:)
    expect(screen.getAllByText(/Tableau de bord/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Statistiques/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Salons/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Utilisateurs/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Modération/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Badges/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Badges spéciaux/i).length).toBeGreaterThan(0)
  })

  it('should have close button', () => {
    render(<AdminPanel />, { wrapper })
    const closeButton = screen.getByLabelText(/Fermer le panneau d'administration/i)
    expect(closeButton).toBeInTheDocument()
  })

  it('should render dashboard tab by default', () => {
    render(<AdminPanel />, { wrapper })
    expect(screen.getAllByText(/Tableau de bord/i).length).toBeGreaterThan(0)
  })
})
