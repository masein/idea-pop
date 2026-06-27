import type { Meta, StoryObj } from '@storybook/react';
import Button from '../components/ui/Button';

const meta: Meta<typeof Button> = {
  title: 'Design System/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: { control: 'select', options: ['primary', 'secondary', 'tertiary'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    disabled: { control: 'boolean' },
  },
};
export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: { children: 'Start free', variant: 'primary' },
};

export const PrimaryHover: Story = {
  args: { children: 'Start free', variant: 'primary' },
  parameters: { pseudo: { hover: true } },
};

export const PrimaryDisabled: Story = {
  args: { children: 'Start free', variant: 'primary', disabled: true },
};

export const Secondary: Story = {
  args: { children: 'Watch a sample', variant: 'secondary' },
};

export const SecondaryDisabled: Story = {
  args: { children: 'Watch a sample', variant: 'secondary', disabled: true },
};

export const Tertiary: Story = {
  args: { children: 'Learn more', variant: 'tertiary' },
};

export const Small: Story = {
  args: { children: 'Small', variant: 'primary', size: 'sm' },
};

export const Large: Story = {
  args: { children: 'Large', variant: 'primary', size: 'lg' },
};
