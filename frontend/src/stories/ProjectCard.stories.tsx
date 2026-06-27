import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import ProjectCard from '../components/cards/ProjectCard';

const meta: Meta<typeof ProjectCard> = {
  title: 'Design System/Cards/Project',
  component: ProjectCard,
  tags: ['autodocs'],
  argTypes: {
    visibility: { control: 'select', options: ['private', 'class', 'public'] },
    aiGenerated: { control: 'boolean' },
  },
};
export default meta;
type Story = StoryObj<typeof meta>;

export const Private: Story = {
  args: { title: 'My Leaf Bridge', visibility: 'private', childNickname: 'Tester' },
};

export const ClassVisible: Story = {
  args: { title: 'Nature Weave', visibility: 'class', childNickname: 'Tester' },
};

export const PublicVisible: Story = {
  args: { title: 'Pasta Tower', visibility: 'public', childNickname: 'Tester' },
};

export const AiGenerated: Story = {
  args: { title: 'AI Sketch', visibility: 'private', aiGenerated: true },
};
