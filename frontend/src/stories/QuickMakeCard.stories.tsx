import type { Meta, StoryObj } from '@storybook/react';
import QuickMakeCard from '../components/cards/QuickMakeCard';

const meta: Meta<typeof QuickMakeCard> = {
  title: 'Design System/Cards/QuickMake',
  component: QuickMakeCard,
  tags: ['autodocs'],
  argTypes: {
    difficulty: { control: 'select', options: ['easy', 'medium', 'hard'] },
  },
};
export default meta;
type Story = StoryObj<typeof meta>;

export const Easy: Story = {
  args: {
    title: 'Paper Butterfly',
    duration: '15 min',
    difficulty: 'easy',
  },
};

export const Medium: Story = {
  args: {
    title: 'Leaf Print Notebook',
    duration: '30 min',
    difficulty: 'medium',
  },
};

export const Hard: Story = {
  args: {
    title: 'Natural Dye Shirt',
    duration: '2 hrs',
    difficulty: 'hard',
  },
};

export const WithImage: Story = {
  args: {
    title: 'Paper Butterfly',
    duration: '15 min',
    difficulty: 'easy',
    imageSrc: 'https://placehold.co/240x160',
  },
};
