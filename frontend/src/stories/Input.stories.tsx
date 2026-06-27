import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import Input from '../components/ui/Input';

const meta: Meta<typeof Input> = {
  title: 'Design System/Input',
  component: Input,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { label: 'Email', placeholder: 'you@example.com' },
};

export const WithError: Story = {
  args: {
    label: 'Email',
    placeholder: 'you@example.com',
    error: 'Please enter a valid email',
  },
};

export const WithIcon: Story = {
  args: {
    label: 'Search',
    placeholder: 'Search...',
    icon: <span>🔍</span>,
  },
};

export const Disabled: Story = {
  args: { label: 'Email', placeholder: 'you@example.com', disabled: true },
};
