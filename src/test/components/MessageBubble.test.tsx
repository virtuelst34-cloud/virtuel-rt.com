import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import MessageBubble from '@/components/chat/MessageBubble'
import { TestProviders } from '@/test/utils/testProviders'

const mockProps = {
  onReact: vi.fn(),
  onDelete: vi.fn(),
  onPin: vi.fn(),
}

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <TestProviders>{children}</TestProviders>
)

describe('MessageBubble component', () => {
  it('should render without crashing', () => {
    const message = {
      id: '1',
      salon: 'general',
      author_name: 'TestUser',
      author_avatar: 'av1',
      author_initials: 'TU',
      text: 'Hello world',
      created_date: new Date().toISOString(),
      reactions: {},
      is_system: false,
      is_announcement: false,
    }
    const { container } = render(<MessageBubble message={message} {...mockProps} />, { wrapper })
    expect(container.firstChild).toBeInTheDocument()
  })

  it('should render system message', () => {
    const message = {
      id: '1',
      salon: 'general',
      author_name: 'System',
      author_avatar: 'av1',
      author_initials: 'SY',
      text: 'System message',
      created_date: new Date().toISOString(),
      reactions: {},
      is_system: true,
      is_announcement: false,
    }
    const { container } = render(<MessageBubble message={message} {...mockProps} />, { wrapper })
    expect(container.firstChild).toBeInTheDocument()
  })

  it('should render announcement message', () => {
    const message = {
      id: '1',
      salon: 'general',
      author_name: 'Admin',
      author_avatar: 'av1',
      author_initials: 'AD',
      text: 'Announcement',
      created_date: new Date().toISOString(),
      reactions: {},
      is_system: false,
      is_announcement: true,
    }
    const { container } = render(<MessageBubble message={message} {...mockProps} />, { wrapper })
    expect(container.firstChild).toBeInTheDocument()
  })
})
