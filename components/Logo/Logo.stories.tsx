import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import Logo from '.';

const meta = {
  title: 'Foundations/Logo',
  component: Logo,
  tags: ['autodocs'],
  parameters: { layout: 'centered' }
} satisfies Meta<typeof Logo>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
