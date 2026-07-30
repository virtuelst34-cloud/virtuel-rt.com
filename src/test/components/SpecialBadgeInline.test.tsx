import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import SpecialBadgeInline from '@/components/chat/SpecialBadgeInline'
import { BadgesProvider } from '@/lib/contexts/BadgesContext'

vi.mock('@/lib/contexts', () => ({
  useUser: () => ({
    user: null,
    profiles: {},
    ensureProfiles: async () => {},
  }),
}))

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <BadgesProvider>{children}</BadgesProvider>
)

describe('SpecialBadgeInline', () => {
  it('renders colored role chips for staff badges', () => {
    render(
      <SpecialBadgeInline
        profile={{ isFounder: true, specialBadges: ['moderator'] }}
        size="xs"
        showLabels
      />,
      { wrapper },
    )
    expect(screen.getByLabelText('Fondateur')).toBeInTheDocument()
    expect(screen.getByLabelText('Modérateur')).toBeInTheDocument()
  })

  it('returns null when profile has no special badges', () => {
    const { container } = render(<SpecialBadgeInline profile={{}} />, { wrapper })
    expect(container.querySelector('[aria-label="Badges spéciaux"]')).toBeNull()
  })
})
