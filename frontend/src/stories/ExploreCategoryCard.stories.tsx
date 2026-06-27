import type { Meta, StoryObj } from '@storybook/react';
import ExploreCategoryCard from '../components/cards/ExploreCategoryCard';

const meta: Meta<typeof ExploreCategoryCard> = {
  title: 'Design System/Cards/ExploreCategory',
  component: ExploreCategoryCard,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof meta>;

export const MastersOfDisguise: Story = {
  args: {
    category: 'Masters of Disguise',
    count: 12,
    color: '#C0F0FF',
  },
};

export const SoftEngineers: Story = {
  args: {
    category: 'Soft Engineers',
    count: 8,
    color: '#F3FFC2',
  },
};

export const SpeedChampions: Story = {
  args: {
    category: 'Speed Champions',
    count: 10,
    color: '#F9DED7',
  },
};

export const MasterBuilders: Story = {
  args: {
    category: 'Master Builders',
    count: 15,
    color: '#F1D8FB',
  },
};

export const WithImage: Story = {
  args: {
    category: 'Masters of Disguise',
    count: 12,
    color: '#C0F0FF',
    imageSrc: 'https://placehold.co/240x160',
  },
};
