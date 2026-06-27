import type { Meta, StoryObj } from '@storybook/react';
import PersonaCard from '../components/cards/PersonaCard';

const meta: Meta<typeof PersonaCard> = {
  title: 'Design System/Cards/Persona',
  component: PersonaCard,
  tags: ['autodocs'],
  argTypes: {
    accent: { control: 'select', options: ['explore', 'library', 'challenge'] },
  },
};
export default meta;
type Story = StoryObj<typeof meta>;

export const ExplorePersona: Story = {
  args: { name: 'Dr. Maya', role: 'Biologist', accent: 'explore' },
};

export const LibraryPersona: Story = {
  args: { name: 'Chef Leo', role: 'Culinary Artist', accent: 'library' },
};

export const ChallengePersona: Story = {
  args: { name: 'Eng. Sam', role: 'Mechanical Engineer', accent: 'challenge' },
};

export const WithImage: Story = {
  args: {
    name: 'Dr. Maya',
    role: 'Biologist',
    accent: 'explore',
    imageSrc: 'https://placehold.co/80x80',
  },
};
