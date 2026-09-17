import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import Icon from '.';

const meta = {
  title: 'Foundations/Icon',
  component: Icon,
  tags: ['autodocs'],
  args: { title: 'arrowRight', size: 'md' }
} satisfies Meta<typeof Icon>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Small: Story = {
  args: { size: 'sm' }
};

export const Large: Story = {
  args: { size: 'lg' }
};

export const Check: Story = {
  args: { title: 'check' }
};

export const Close: Story = {
  args: { title: 'close' }
};
