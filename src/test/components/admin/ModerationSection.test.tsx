import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import ModerationSection from '@/components/chat/admin/ModerationSection'
import { TestProviders } from '@/test/utils/testProviders'

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <TestProviders>{children}</TestProviders>
)

describe('ModerationSection component', () => {
  it('should render without crashing', () => {
    const { container } = render(<ModerationSection />, { wrapper })
    expect(container).toBeInTheDocument()
  })

  it('should render section title', () => {
    render(<ModerationSection />, { wrapper })
    expect(screen.getByText(/Résumé de modération/i)).toBeInTheDocument()
  })

  it('should render banned users section', () => {
    render(<ModerationSection />, { wrapper })
    expect(screen.getByText(/Bannis/i)).toBeInTheDocument()
  })

  it('should render muted users section', () => {
    render(<ModerationSection />, { wrapper })
    expect(screen.getByText(/Mutés/i)).toBeInTheDocument()
  })

  it('should show message when no banned users', () => {
    render(<ModerationSection />, { wrapper })
    expect(screen.getByText(/Aucun utilisateur banni/i)).toBeInTheDocument()
  })

  it('should show message when no muted users', () => {
    render(<ModerationSection />, { wrapper })
    expect(screen.getByText(/Aucun utilisateur muté/i)).toBeInTheDocument()
  })
})
