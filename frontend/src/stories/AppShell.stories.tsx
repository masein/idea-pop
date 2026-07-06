import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import AppShell from '../components/AppShell';

const meta: Meta<typeof AppShell> = {
  title: 'Design System/AppShell',
  component: AppShell,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
};
export default meta;
type Story = StoryObj<typeof meta>;

export const Exploring: Story = {
  args: {
    section: 'explore',
    children: <div className="p-8 font-body text-ink">Explore content area</div>,
  },
};

export const Library: Story = {
  args: {
    section: 'library',
    children: <div className="p-8 font-body text-ink">Library content</div>,
  },
};

export const Challenges: Story = {
  args: {
    section: 'challenge',
    children: <div className="p-8 font-body text-ink">Challenges content</div>,
  },
};

export const Challenge: Story = {
  args: {
    section: 'challenge',
    children: <div className="p-8 font-body text-ink">Challenge content</div>,
  },
};
