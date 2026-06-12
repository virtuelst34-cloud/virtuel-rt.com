import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import SalonsSection from '@/components/chat/admin/SalonsSection'
import { TestProviders } from '@/test/utils/testProviders'

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <TestProviders>{children}</TestProviders>
)

describe('SalonsSection component', () => {
  it('should render without crashing', () => {
    const { container } = render(<SalonsSection />, { wrapper })
    expect(container).toBeInTheDocument()
  })

  it('should render section title', () => {
    render(<SalonsSection />, { wrapper })
    expect(screen.getByText(/Gestion des salons/i)).toBeInTheDocument()
  })

  it('should render create salon form', () => {
    render(<SalonsSection />, { wrapper })
    expect(screen.getByText(/Créer un salon/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Nom du salon/i)).toBeInTheDocument()
  })

  it('should render custom salons section', () => {
    render(<SalonsSection />, { wrapper })
    expect(screen.getByText(/Salons personnalisés/i)).toBeInTheDocument()
  })

  it('should show message when no custom salons', () => {
    render(<SalonsSection />, { wrapper })
    expect(screen.getByText(/Aucun salon personnalisé/i)).toBeInTheDocument()
  })

  it('should render salon type selector', () => {
    render(<SalonsSection />, { wrapper })
    const selects = screen.getAllByRole('combobox')
    expect(selects.length).toBeGreaterThan(0)
  })

  it('should render private salon checkbox', () => {
    render(<SalonsSection />, { wrapper })
    const checkbox = screen.getByLabelText(/Salon privé/i)
    expect(checkbox).toBeInTheDocument()
  })

  it('should show password field when private salon is checked', () => {
    render(<SalonsSection />, { wrapper })
    const checkbox = screen.getByLabelText(/Salon privé/i)
    fireEvent.click(checkbox)
    expect(screen.getByPlaceholderText(/Mot de passe/i)).toBeInTheDocument()
  })

  it('should show error when creating salon without name', () => {
    render(<SalonsSection />, { wrapper })
    const createButton = screen.getByText(/Créer le salon/i)
    fireEvent.click(createButton)
    expect(screen.getByText(/Le nom est requis/i)).toBeInTheDocument()
  })
})
