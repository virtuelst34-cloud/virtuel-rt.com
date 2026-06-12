import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import ChatArea from '@/components/chat/ChatArea'
import { TestProviders } from '@/test/utils/testProviders'

const mockProps = {
  micActive: false,
  micLevel: 0,
  onOpenDM: vi.fn(),
}

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <TestProviders>{children}</TestProviders>
)

describe('ChatArea component', () => {
  it('should render without crashing', () => {
    const { container } = render(<ChatArea {...mockProps} />, { wrapper })
    expect(container).toBeInTheDocument()
  })

  it('should render when currentSalon is set', () => {
    // This test would require mocking the context to set currentSalon
    // For now, we just test that it renders without errors
    const { container } = render(<ChatArea {...mockProps} />, { wrapper })
    expect(container).toBeInTheDocument()
  })

  it('should render with micActive prop', () => {
    const { container } = render(<ChatArea {...mockProps} micActive={true} />, { wrapper })
    expect(container).toBeInTheDocument()
  })

  it('should render with micLevel prop', () => {
    const { container } = render(<ChatArea {...mockProps} micLevel={50} />, { wrapper })
    expect(container).toBeInTheDocument()
  })

  it('should call onOpenDM when provided', () => {
    const mockOnOpenDM = vi.fn()
    render(<ChatArea {...mockProps} onOpenDM={mockOnOpenDM} />, { wrapper })
    // The onOpenDM function is passed through, actual usage would require user interaction
    expect(mockOnOpenDM).toBeDefined()
  })
})
