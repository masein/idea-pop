import type { Meta, StoryObj } from '@storybook/react';
import StudioCard from '../components/cards/StudioCard';

const meta: Meta<typeof StudioCard> = {
  title: 'Design System/Cards/Studio',
  component: StudioCard,
  tags: ['autodocs'],
  argTypes: {
    accent: { control: 'select', options: ['explore', 'library', 'challenge'] },
  },
};
export default meta;
type Story = StoryObj<typeof meta>;

export const Explore: Story = {
  args: {
    title: 'Masters of Disguise',
    subtitle: 'Camouflage & mimicry in nature',
    accent: 'explore',
    tag: 'New',
  },
};

export const Library: Story = {
  args: {
    title: 'Weaving Basics',
    subtitle: 'Learn to weave with natural fibers',
    accent: 'library',
    tag: 'Popular',
  },
};

export const Challenge: Story = {
  args: {
    title: 'Bridge Builder',
    subtitle: 'Design a bridge using only pasta',
    accent: 'challenge',
  },
};

export const WithImage: Story = {
  args: {
    title: 'Speed Champions',
    subtitle: 'The fastest animals on Earth',
    accent: 'explore',
    imageSrc: 'https://placehold.co/320x180',
    tag: 'Featured',
  },
};
