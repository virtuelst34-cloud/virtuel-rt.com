import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import Avatar from '@/components/chat/Avatar'

describe('Avatar component', () => {
  it('should render with initials as title', () => {
    const { container } = render(<Avatar avatarClass="av1" initials="AB" size="md" />)
    expect(container.querySelector('[title="AB"]')).toBeInTheDocument()
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('should render with different sizes', () => {
    const { container, rerender } = render(<Avatar avatarClass="av1" initials="AB" size="xs" />)
    expect(container.querySelector('svg')).toBeInTheDocument()

    rerender(<Avatar avatarClass="av1" initials="AB" size="lg" />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('should render with default size', () => {
    const { container } = render(<Avatar avatarClass="av1" initials="AB" />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('should fall back to av1 style for unknown avatarClass', () => {
    const { container } = render(<Avatar avatarClass="unknown" initials="ZZ" size="md" />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })
})
