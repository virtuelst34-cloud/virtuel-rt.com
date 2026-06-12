import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import AdminPanel from '@/components/chat/AdminPanel'
import { TestProviders } from '@/test/utils/testProviders'

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <TestProviders>{children}</TestProviders>
)

describe('AdminPanel component', () => {
  it('should render without crashing', () => {
    const { container } = render(<AdminPanel />, { wrapper })
    expect(container.firstChild).toBeInTheDocument()
  })

  it('should render admin panel header', () => {
    render(<AdminPanel />, { wrapper })
    expect(screen.getByText(/Panneau d'administration/i)).toBeInTheDocument()
  })

  it('should render tabs', () => {
    render(<AdminPanel />, { wrapper })
    expect(screen.getAllByText(/Tableau de bord/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/Statistiques/i)).toBeInTheDocument()
    expect(screen.getAllByText(/Salons/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/Utilisateurs/i)).toBeInTheDocument()
    expect(screen.getByText(/Modération/i)).toBeInTheDocument()
    expect(screen.getAllByText(/Badges/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/Badges spéciaux/i)).toBeInTheDocument()
  })

  it('should have close button', () => {
    render(<AdminPanel />, { wrapper })
    const closeButton = screen.getByRole('button')
    expect(closeButton).toBeInTheDocument()
  })

  it('should render dashboard tab by default', () => {
    render(<AdminPanel />, { wrapper })
    expect(screen.getAllByText(/Tableau de bord/i).length).toBeGreaterThan(0)
  })
})
