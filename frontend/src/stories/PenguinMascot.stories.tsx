import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import PenguinMascot from '../components/PenguinMascot';

const meta: Meta<typeof PenguinMascot> = {
  title: 'Design System/Branding/PenguinMascot',
  component: PenguinMascot,
  tags: ['autodocs'],
  argTypes: {
    label: { control: 'text' },
  },
};
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const AskMe: Story = { args: { label: 'Ask Me' } };
export const MarketingLabel: Story = { args: { label: "Hi, I'm Idea Pop!" } };
