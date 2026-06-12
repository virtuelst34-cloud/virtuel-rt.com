import type { Meta, StoryObj } from '@storybook/react';
import Avatar from './Avatar';

const meta: Meta<typeof Avatar> = {
  title: 'Components/Avatar',
  component: Avatar,
  tags: ['autodocs'],
  argTypes: {
    avatarClass: {
      control: 'select',
      options: ['av1', 'av2', 'av3', 'av4', 'av5'],
    },
    size: {
      control: 'select',
      options: ['xs', 'sm', 'md', 'lg', 'xl'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Avatar>;

export const Default: Story = {
  args: {
    avatarClass: 'av1',
    initials: 'AB',
    size: 'md',
  },
};

export const Small: Story = {
  args: {
    avatarClass: 'av2',
    initials: 'CD',
    size: 'sm',
  },
};

export const Large: Story = {
  args: {
    avatarClass: 'av3',
    initials: 'EF',
    size: 'lg',
  },
};

export const WithInitials: Story = {
  args: {
    avatarClass: 'av4',
    initials: 'GH',
    size: 'xl',
  },
};
