import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import StatsSection from '@/components/chat/admin/StatsSection'
import { TestProviders } from '@/test/utils/testProviders'

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <TestProviders>{children}</TestProviders>
)

describe('StatsSection component', () => {
  it('should render without crashing', () => {
    const { container } = render(<StatsSection />, { wrapper })
    expect(container).toBeInTheDocument()
  })

  it('should render section title', () => {
    render(<StatsSection />, { wrapper })
    expect(screen.getByText(/Statistiques détaillées/i)).toBeInTheDocument()
  })

  it('should render general statistics cards', () => {
    render(<StatsSection />, { wrapper })
    expect(screen.getByText(/Profils/i)).toBeInTheDocument()
    expect(screen.getByText(/En ligne/i)).toBeInTheDocument()
    expect(screen.getByText(/Actifs/i)).toBeInTheDocument()
    expect(screen.getByText(/Premium/i)).toBeInTheDocument()
  })

  it('should render messages statistics', () => {
    render(<StatsSection />, { wrapper })
    expect(screen.getAllByText(/Messages/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/XP total/i)).toBeInTheDocument()
    expect(screen.getByText(/Niveau moyen/i)).toBeInTheDocument()
    expect(screen.getByText(/Salons/i)).toBeInTheDocument()
  })

  it('should render salon statistics section', () => {
    render(<StatsSection />, { wrapper })
    expect(screen.getByText(/Messages par salon/i)).toBeInTheDocument()
  })

  it('should render monthly XP ranking section', () => {
    render(<StatsSection />, { wrapper })
    expect(screen.getByText(/Top XP mensuel/i)).toBeInTheDocument()
  })
})
