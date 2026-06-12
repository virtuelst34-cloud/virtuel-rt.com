import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import DiamondBadge from '@/components/chat/DiamondBadge'
import { BadgesProvider } from '@/lib/contexts/BadgesContext'

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <BadgesProvider>{children}</BadgesProvider>
)

describe('DiamondBadge component', () => {
  it('should render without crashing', () => {
    const { container } = render(<DiamondBadge level={5} size="sm" />, { wrapper })
    expect(container.firstChild).toBeInTheDocument()
  })

  it('should render with different sizes', () => {
    const { container, rerender } = render(<DiamondBadge level={5} size="xs" />, { wrapper })
    expect(container.firstChild).toBeInTheDocument()

    rerender(<DiamondBadge level={5} size="lg" />)
    expect(container.firstChild).toBeInTheDocument()
  })

  it('should render with label when showLabel is true', () => {
    const { container } = render(<DiamondBadge level={5} size="sm" showLabel />, { wrapper })
    expect(container.firstChild).toBeInTheDocument()
  })

  it('should render without label when showLabel is false', () => {
    const { container } = render(<DiamondBadge level={5} size="sm" showLabel={false} />, { wrapper })
    expect(container.firstChild).toBeInTheDocument()
  })
})
