import type { Meta, StoryObj } from '@storybook/react';
import ChatInput from './ChatInput';

const meta: Meta<typeof ChatInput> = {
  title: 'Components/ChatInput',
  component: ChatInput,
  tags: ['autodocs'],
  argTypes: {
    disabled: {
      control: 'boolean',
    },
  },
};

export default meta;
type Story = StoryObj<typeof ChatInput>;

export const Default: Story = {
  args: {
    onSend: () => {},
    onTyping: () => {},
    disabled: false,
    replyTo: null,
    onCancelReply: () => {},
    members: [],
  },
};

export const Disabled: Story = {
  args: {
    onSend: () => {},
    onTyping: () => {},
    disabled: true,
    replyTo: null,
    onCancelReply: () => {},
    members: [],
  },
};
