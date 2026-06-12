import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Avatar from '@/components/chat/Avatar'

describe('Avatar component', () => {
  it('should render with initials', () => {
    render(<Avatar avatarClass="av1" initials="AB" size="md" />)
    expect(screen.getByText('AB')).toBeInTheDocument()
  })

  it('should render with different sizes', () => {
    const { rerender } = render(<Avatar avatarClass="av1" initials="AB" size="xs" />)
    expect(screen.getByText('AB')).toBeInTheDocument()

    rerender(<Avatar avatarClass="av1" initials="AB" size="lg" />)
    expect(screen.getByText('AB')).toBeInTheDocument()
  })

  it('should render with default size', () => {
    render(<Avatar avatarClass="av1" initials="AB" />)
    expect(screen.getByText('AB')).toBeInTheDocument()
  })
})
