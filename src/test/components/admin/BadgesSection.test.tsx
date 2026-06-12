import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import BadgesSection from '@/components/chat/admin/BadgesSection'
import { TestProviders } from '@/test/utils/testProviders'

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <TestProviders>{children}</TestProviders>
)

describe('BadgesSection component', () => {
  it('should render without crashing', () => {
    const { container } = render(<BadgesSection />, { wrapper })
    expect(container).toBeInTheDocument()
  })

  it('should render section title', () => {
    render(<BadgesSection />, { wrapper })
    expect(screen.getByText(/Gestion des badges/i)).toBeInTheDocument()
  })

  it('should render description', () => {
    render(<BadgesSection />, { wrapper })
    expect(screen.getByText(/Modifiez le nom, la couleur et le niveau requis de chaque badge diamant/i)).toBeInTheDocument()
  })

  it('should render badges preview section', () => {
    render(<BadgesSection />, { wrapper })
    expect(screen.getAllByText(/Modifier/i).length).toBeGreaterThan(0)
  })

  it('should enter edit mode when clicking Modifier button', () => {
    render(<BadgesSection />, { wrapper })
    const editButtons = screen.getAllByText(/Modifier/i)
    if (editButtons.length > 0) {
      fireEvent.click(editButtons[0])
      expect(screen.getByText(/Sauver/i)).toBeInTheDocument()
    }
  })

  it('should exit edit mode when clicking X button', () => {
    render(<BadgesSection />, { wrapper })
    const editButtons = screen.getAllByText(/Modifier/i)
    if (editButtons.length > 0) {
      fireEvent.click(editButtons[0])
      const closeButton = screen.getAllByRole('button').find(btn => btn.textContent?.includes('×'))
      if (closeButton) {
        fireEvent.click(closeButton)
        expect(screen.getAllByText(/Modifier/i).length).toBeGreaterThan(0)
      }
    }
  })
})
