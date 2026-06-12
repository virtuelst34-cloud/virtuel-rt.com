import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ScenePanel from '@/components/chat/ScenePanel';
import { TestProviders } from '@/test/utils/testProviders';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <TestProviders>{children}</TestProviders>
);

describe('ScenePanel component', () => {
  const mockMembers = [
    {
      name: 'User1',
      avatar: 'av1',
      initials: 'U1',
      speaking: false,
    },
    {
      name: 'User2',
      avatar: 'av2',
      initials: 'U2',
      speaking: true,
    },
  ];

  it('should render without crashing', () => {
    const { container } = render(
      <ScenePanel salonId="test" members={mockMembers} micActive={false} userMicLevel={0} />,
      { wrapper }
    );
    expect(container).toBeInTheDocument();
  });

  it('should display member count', () => {
    render(
      <ScenePanel salonId="test" members={mockMembers} micActive={false} userMicLevel={0} />,
      { wrapper }
    );
    expect(screen.getByText(/Sur scène \(2\)/i)).toBeInTheDocument();
  });

  it('should have accessibility attributes', () => {
    render(
      <ScenePanel salonId="test" members={mockMembers} micActive={false} userMicLevel={0} />,
      { wrapper }
    );
    const region = screen.getByRole('region');
    expect(region).toHaveAttribute('aria-label', 'Participants sur scène');
  });

  it('should add current user when mic is active', () => {
    render(
      <ScenePanel salonId="test" members={mockMembers} micActive={true} userMicLevel={50} />,
      { wrapper }
    );
    expect(screen.getByText(/Sur scène \(3\)/i)).toBeInTheDocument();
  });

  it('should return null when no members', () => {
    const { container } = render(
      <ScenePanel salonId="test" members={[]} micActive={false} userMicLevel={0} />,
      { wrapper }
    );
    expect(container.firstChild).toBeNull();
  });
});
