import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import Logo from '../components/Logo';

const meta: Meta<typeof Logo> = {
  title: 'Design System/Branding/Logo',
  component: Logo,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    showWordmark: { control: 'boolean' },
  },
};
export default meta;
type Story = StoryObj<typeof meta>;

export const Small: Story = { args: { size: 'sm' } };
export const Medium: Story = { args: { size: 'md' } };
export const Large: Story = { args: { size: 'lg', showWordmark: true } };
export const WithWordmark: Story = { args: { size: 'md', showWordmark: true } };
