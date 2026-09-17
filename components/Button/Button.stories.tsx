import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import Button from '.';

const meta = {
  title: 'Foundations/Button',
  component: Button,
  tags: ['autodocs'],
  args: {
    text: 'Click me',
    type: 'button'
  }
} satisfies Meta<typeof Button>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const PrimaryRounded: Story = {
  args: { theme: 'primary', variant: 'rounded', size: 'md' }
};

export const PrimarySquare: Story = {
  args: { theme: 'primary', variant: 'square', size: 'md' }
};

export const PrimaryPill: Story = {
  args: { theme: 'primary', variant: 'pill', size: 'md' }
};

export const Secondary: Story = {
  args: { theme: 'secondary', variant: 'rounded', size: 'md' }
};

export const Outline: Story = {
  args: { theme: 'primary', variant: 'rounded', size: 'md', outline: true }
};

export const SmallMediumLarge: Story = {
  args: { theme: 'primary', variant: 'rounded', size: 'lg' }
};

export const Disabled: Story = {
  args: { theme: 'primary', variant: 'rounded', size: 'md', disabled: true }
};
