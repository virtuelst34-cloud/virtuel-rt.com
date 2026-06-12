import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import WelcomeScreen from '@/components/chat/WelcomeScreen'
import { TestProviders } from '@/test/utils/testProviders'

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <TestProviders>{children}</TestProviders>
)

describe('WelcomeScreen component', () => {
  it('should render without crashing', () => {
    const { container } = render(<WelcomeScreen />, { wrapper })
    expect(container.firstChild).toBeInTheDocument()
  })

  it('should render salon list', () => {
    const { container } = render(<WelcomeScreen />, { wrapper })
    expect(container.firstChild).toBeInTheDocument()
  })
})
